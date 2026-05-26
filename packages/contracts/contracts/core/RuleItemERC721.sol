// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IAggregatorV3.sol";
import "../interfaces/IRuleLicense.sol";
import "../access/Roles.sol";

/**
 * @title RuleItemERC721
 * @notice NFT rule licensing with subscription model.
 * @dev Deterministic-deployment friendly:
 *      - Constructor only takes ERC721 name + symbol (identical across chains)
 *      - Roles + oracle set via initialize() post-deploy per chain.
 */
contract RuleItemERC721 is ERC721, ERC721URIStorage, AccessControl, Pausable {

    /* ===================== CONFIG ===================== */
    uint8   public constant MAX_SLOT = 3;
    uint256 public constant SUB_DURATION = 30 days;

    // Harga langganan default: $0.35 (35 USD cents). Bisa diubah via setSubscriptionUsdCents().
    uint256 public subscriptionUsdCents = 35;

    IAggregatorV3 public ethUsdFeed;

    uint256 public nextRuleId;
    uint256 public nextTokenId;
    address public immutable deployer;

    bool    private _initialized;

    struct RuleDefinition {
        bytes32 ruleHash;
        string  uri;
        address creator;
        uint256 parentRuleId;   // 0 if root
        uint16  version;
        bool    deprecated;     // true if replaced
        uint256 tokenId;        // NFT only for ACTIVE version
    }

    /* ===================== STORAGE ===================== */
    mapping(uint256 => RuleDefinition) public rules;        // ruleId   => rule
    mapping(uint256 => uint256)        public tokenRule;    // tokenId  => ruleId
    mapping(uint256 => uint256)        public rootRuleOf;   // ruleId   => rootRuleId
    mapping(uint256 => uint256)        public activeRuleOf; // rootRuleId => active ruleId
    mapping(address => uint8)          public logicalRuleCount; // ROOT rules per user
    mapping(address => uint256)        public subscriptionExpiry;
    mapping(uint256 => uint256)        public ruleExpiry;   // tokenId  => expiry
    mapping(uint256 => uint256)        public ruleTokenId;

    mapping(uint256 => bool) private _pendingBurn;

    /* ===================== EVENTS ===================== */
    event Initialized(address indexed admin, address indexed oracle);
    event RuleCreated(
        uint256 indexed ruleId,
        uint256 indexed rootRuleId,
        uint256 indexed parentRuleId,
        uint16 version
    );
    event RuleActivated(uint256 indexed ruleId, uint256 indexed tokenId);
    event RuleDeprecated(uint256 indexed ruleId);
    event Subscribed(address indexed user, uint256 expiry);
    event RuleExpiryExtended(uint256 indexed tokenId, uint256 newExpiry);
    event SubscriptionUsdCentsUpdated(uint256 newCents);
    event OracleUpdated(address indexed oldFeed, address indexed newFeed);

    /* ===================== ERRORS ===================== */
    error AlreadyInitialized();
    error ZeroAddress();

    /* ===================== CONSTRUCTOR ===================== */
    /**
     * @notice Minimal constructor for CREATE2 deterministic deploy.
     * @dev Only name + symbol (identical across chains). Call initialize() after deploy.
     */
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        deployer = msg.sender;
    }

    /* ===================== INITIALIZE ===================== */
    /**
     * @notice Grant roles + bind oracle. Call once after deploy.
     * @param admin  Address receiving DEFAULT_ADMIN_ROLE, ADMIN, PAUSER.
     * @param oracle IAggregatorV3 ETH/USD price feed (mock or Chainlink).
     */
    function initialize(address admin, address oracle) external {
        if (_initialized) revert AlreadyInitialized();
        if (admin == address(0) || oracle == address(0)) revert ZeroAddress();

        _initialized = true;

        _grantRole(Roles.DEFAULT_ADMIN, admin);
        _grantRole(Roles.ADMIN, admin);
        _grantRole(Roles.PAUSER, admin);

        ethUsdFeed = IAggregatorV3(oracle);

        emit Initialized(admin, oracle);
    }

    /* ===================================================== */
    /* ================= ADMIN ============================= */
    /* ===================================================== */

    /**
     * @notice Update harga langganan dalam USD cents.
     * @dev Hanya ADMIN yang bisa update.
     */
    function setSubscriptionUsdCents(uint256 newCents)
        external
        onlyRole(Roles.ADMIN)
    {
        require(newCents > 0, "INVALID_PRICE");
        subscriptionUsdCents = newCents;
        emit SubscriptionUsdCentsUpdated(newCents);
    }

    /**
     * @notice Ganti price oracle ETH/USD.
     * @dev Berguna untuk:
     *      - Swap dari Mock ke Chainlink feed asli di testnet/mainnet
     *      - Update ke feed address baru jika Chainlink deprecated feed lama
     *      - Emergency switch ke mock jika feed bermasalah
     *
     *      Contract langsung verifikasi feed baru bisa dipanggil dan returnnya
     *      masuk akal sebelum menyimpan — mencegah salah set ke address non-oracle.
     *
     * @param newFeed Address contract yang mengimplementasikan AggregatorV3Interface.
     *                Chainlink ETH/USD:
     *                  Sepolia    0x694AA1769357215DE4FAC081bf1f309aDC325306
     *                  Amoy       0x001382149eBa3441043c1c66972b4772963f5D43
     *                  Base Sep   0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
     *                  Mainnet    0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
     */
    function setOracle(address newFeed) external onlyRole(Roles.ADMIN) {
        require(newFeed != address(0), "ZERO_ADDRESS");

        // Sanity-check: pastikan feed bisa dipanggil dan harga dalam batas wajar
        try IAggregatorV3(newFeed).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            require(
                answer >= MIN_ETH_PRICE && answer <= MAX_ETH_PRICE,
                "ORACLE_PRICE_OUT_OF_RANGE"
            );
            require(answeredInRound >= roundId, "STALE_ORACLE_DATA");
            require(block.timestamp - updatedAt <= 1 hours, "ORACLE_PRICE_STALE");
        } catch {
            revert("ORACLE_NOT_CALLABLE");
        }

        address old = address(ethUsdFeed);
        ethUsdFeed  = IAggregatorV3(newFeed);
        emit OracleUpdated(old, newFeed);
    }

    function pause() external onlyRole(Roles.PAUSER) {
        _pause();
    }

    function unpause() external onlyRole(Roles.PAUSER) {
        _unpause();
    }

    function isInitialized() external view returns (bool) {
        return _initialized;
    }

    /* ===================================================== */
    /* ================= SUBSCRIPTION ====================== */
    /* ===================================================== */

    function hasSubscription(address user) public view returns (bool) {
        return subscriptionExpiry[user] >= block.timestamp;
    }

    /**
     * @notice Hitung harga langganan dalam ETH berdasarkan oracle Chainlink.
     * @dev FIX: Sebelumnya hardcoded 0.0001 ether — oracle ethUsdFeed dan
     *      subscriptionUsdCents tidak dipakai sama sekali. Sekarang harga
     *      dihitung secara dinamis dari USD cents / ETH-USD rate.
     *
     *      Formula: (subscriptionUsdCents * 1e18) / (ethUsdPrice * 100)
     *
     *      Fallback ke harga hardcoded jika oracle bermasalah (stale/invalid)
     *      agar fungsi tidak revert dan subscriber tidak terblokir.
     */
    // Chainlink ETH/USD 8-decimal bounds: $100 – $1,000,000
    int256 private constant MIN_ETH_PRICE = 100e8;
    int256 private constant MAX_ETH_PRICE = 1_000_000e8;

    function subscriptionPriceETH() public view returns (uint256) {
        try ethUsdFeed.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (
                answer < MIN_ETH_PRICE ||
                answer > MAX_ETH_PRICE ||
                block.timestamp - updatedAt > 1 hours
            ) {
                return _fallbackPrice();
            }

            uint256 priceInETH = (subscriptionUsdCents * 1e24) /
                (uint256(answer) * 100);

            // Guard against rounding to zero for very low subscription costs
            if (priceInETH == 0) return _fallbackPrice();

            return priceInETH;
        } catch {
            return _fallbackPrice();
        }
    }

    /**
     * @dev Harga fallback jika oracle tidak tersedia.
     *      ~$0.35 saat ETH ~$3500 = 0.0001 ETH
     */
    function _fallbackPrice() internal pure returns (uint256) {
        return 0.0001 ether;
    }

    /* ===================== TREASURY ===================== */

    uint256 public treasuryBalance;

    event TreasuryWithdrawn(address indexed to, uint256 amount);

    /**
     * @notice Withdraw accumulated subscription fees (ADMIN only).
     * @param to     Recipient address.
     * @param amount Amount in wei to withdraw.
     */
    function withdrawTreasury(address to, uint256 amount) external onlyRole(Roles.ADMIN) {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount > 0, "ZERO_AMOUNT");
        require(amount <= treasuryBalance, "INSUFFICIENT_BALANCE");

        treasuryBalance -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "WITHDRAW_FAILED");

        emit TreasuryWithdrawn(to, amount);
    }

    /**
     * @notice Withdraw all accumulated subscription fees (ADMIN only).
     */
    function withdrawAllTreasury(address to) external onlyRole(Roles.ADMIN) {
        require(to != address(0), "ZERO_ADDRESS");
        uint256 amount = treasuryBalance;
        require(amount > 0, "NO_BALANCE");

        treasuryBalance = 0;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "WITHDRAW_FAILED");

        emit TreasuryWithdrawn(to, amount);
    }

    function subscribe() external payable whenNotPaused {
        uint256 price = subscriptionPriceETH();
        require(msg.value >= price, "INSUFFICIENT_PAYMENT");

        uint256 expiry = subscriptionExpiry[msg.sender];
        subscriptionExpiry[msg.sender] =
            expiry < block.timestamp
                ? block.timestamp + SUB_DURATION
                : expiry + SUB_DURATION;

        // Accumulate ke treasury (bukan langsung transfer ke deployer)
        treasuryBalance += price;

        if (msg.value > price) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(ok, "REFUND_FAILED");
        }

        emit Subscribed(msg.sender, subscriptionExpiry[msg.sender]);
    }

    /* ===================================================== */
    /* ================= RULE CREATION ===================== */
    /* ===================================================== */

    function createRule(
        bytes32 ruleHash,
        string calldata uri
    ) external whenNotPaused returns (uint256 ruleId) {
        require(ruleHash != bytes32(0), "INVALID_RULE_HASH");

        ruleId = ++nextRuleId;

        rules[ruleId] = RuleDefinition({
            ruleHash:     ruleHash,
            uri:          uri,
            creator:      msg.sender,
            parentRuleId: 0,
            version:      1,
            deprecated:   false,
            tokenId:      0
        });

        rootRuleOf[ruleId] = ruleId;

        emit RuleCreated(ruleId, ruleId, 0, 1);
    }

    function createRuleVersion(
        uint256 parentRuleId,
        bytes32 newHash,
        string calldata newUri
    ) external whenNotPaused returns (uint256 ruleId) {
        RuleDefinition storage parent = rules[parentRuleId];

        require(parent.creator == msg.sender, "NOT_CREATOR");
        require(!parent.deprecated, "PARENT_DEPRECATED");
        require(newHash != bytes32(0), "INVALID_RULE_HASH");

        uint256 root = rootRuleOf[parentRuleId];

        ruleId = ++nextRuleId;

        rules[ruleId] = RuleDefinition({
            ruleHash:     newHash,
            uri:          newUri,
            creator:      msg.sender,
            parentRuleId: parentRuleId,
            version:      parent.version + 1,
            deprecated:   false,
            tokenId:      0
        });

        rootRuleOf[ruleId] = root;

        parent.deprecated = true;
        emit RuleDeprecated(parentRuleId);

        emit RuleCreated(ruleId, root, parentRuleId, rules[ruleId].version);
    }

    /* ===================================================== */
    /* =========== SLOT-AWARE VERSION ACTIVATION =========== */
    /* ===================================================== */

    function activateRule(uint256 ruleId)
        external
        whenNotPaused
        returns (uint256 tokenId)
    {
        RuleDefinition storage r = rules[ruleId];

        require(r.creator == msg.sender, "NOT_CREATOR");
        require(!r.deprecated, "RULE_DEPRECATED");
        require(r.tokenId == 0, "ALREADY_ACTIVE");

        uint256 root      = rootRuleOf[ruleId];
        uint256 oldActive = activeRuleOf[root];

        if (oldActive != 0) {
            uint256 oldToken = rules[oldActive].tokenId;
            if (oldToken != 0) {
                _pendingBurn[oldToken] = true;
                _burn(oldToken);
                delete tokenRule[oldToken];
                logicalRuleCount[msg.sender]--;
            }
            rules[oldActive].tokenId    = 0;
            rules[oldActive].deprecated = true;
            emit RuleDeprecated(oldActive);
        }

        uint8 currentCount = logicalRuleCount[msg.sender];
        uint8 limit = hasSubscription(msg.sender) ? MAX_SLOT : 1;
        require(currentCount < limit, "SUBSCRIPTION_REQUIRED_FOR_ACTIVATION");

        tokenId = ++nextTokenId;
        r.tokenId            = tokenId;
        tokenRule[tokenId]   = ruleId;
        activeRuleOf[root]   = ruleId;
        ruleExpiry[tokenId]  = hasSubscription(msg.sender) ? subscriptionExpiry[msg.sender] : block.timestamp + 365 days;
        ruleTokenId[ruleId]  = tokenId;

        logicalRuleCount[msg.sender]++;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, r.uri);

        emit RuleActivated(ruleId, tokenId);
    }

    /* ===================================================== */
    /* ================= AUTO EXPIRY ======================= */
    /* ===================================================== */

    function burnExpired(uint256 tokenId) external {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "NOT_EXIST");
        require(ruleExpiry[tokenId] < block.timestamp, "NOT_EXPIRED");

        uint256 ruleId = tokenRule[tokenId];
        uint256 root   = rootRuleOf[ruleId];

        _pendingBurn[tokenId] = true;
        _burn(tokenId);
        delete tokenRule[tokenId];

        if (activeRuleOf[root] == ruleId) {
            activeRuleOf[root] = 0;
        }

        rules[ruleId].tokenId = 0;
        if (logicalRuleCount[owner] > 0) {
            logicalRuleCount[owner]--;
        }
    }

    /* ===================================================== */
    /* =============== MANUAL DEACTIVATION ================= */
    /* ===================================================== */

    function deactivateRule(uint256 ruleId) external whenNotPaused {
        RuleDefinition storage r = rules[ruleId];

        require(r.creator == msg.sender, "NOT_CREATOR");
        require(!r.deprecated, "RULE_DEPRECATED");
        require(r.tokenId != 0, "NOT_ACTIVE");

        uint256 tokenId = r.tokenId;
        require(_ownerOf(tokenId) == msg.sender, "NOT_OWNER");

        uint256 root = rootRuleOf[ruleId];

        _pendingBurn[tokenId] = true;
        _burn(tokenId);
        delete tokenRule[tokenId];

        if (activeRuleOf[root] == ruleId) {
            activeRuleOf[root] = 0;
        }

        r.tokenId = 0;
        r.deprecated = true;
        
        if (logicalRuleCount[msg.sender] > 0) {
            logicalRuleCount[msg.sender]--;
        }

        emit RuleDeprecated(ruleId);
    }

    /**
     * @notice Perpanjang expiry satu rule NFT tertentu.
     * @dev FIX: Sebelumnya secara salah memodifikasi subscriptionExpiry[msg.sender]
     *      sebagai side effect. Fungsi ini seharusnya hanya memperpanjang
     *      ruleExpiry[tokenId] — bukan subscription global user.
     *
     *      Jika user ingin perpanjang subscription, mereka harus memanggil
     *      subscribe() secara eksplisit.
     *
     *      Harga tetap sama dengan subscription untuk konsistensi,
     *      tapi tidak mengubah subscriptionExpiry.
     */
    function extendRuleExpiry(
        uint256 tokenId,
        uint256 newExpiry
    ) external payable {
        require(ownerOf(tokenId) == msg.sender, "NOT_RULE_OWNER");
        require(newExpiry > ruleExpiry[tokenId], "EXPIRY_NOT_EXTENDED");
        require(
            newExpiry <= block.timestamp + 365 days,
            "EXPIRY_TOO_FAR"
        );

        uint256 price = subscriptionPriceETH();
        require(msg.value >= price, "INSUFFICIENT_PAYMENT");

        ruleExpiry[tokenId] = newExpiry;

        (bool ok, ) = deployer.call{value: price}("");
        require(ok, "DEPLOYER_TRANSFER_FAILED");

        if (msg.value > price) {
            (bool refundOk, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refundOk, "REFUND_FAILED");
        }

        emit RuleExpiryExtended(tokenId, newExpiry);
    }

    /* ===================== _update OVERRIDE ===================== */

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override whenNotPaused returns (address from) {
        from = super._update(to, tokenId, auth);

        if (to == address(0)) {
            require(_pendingBurn[tokenId], "BURN_ONLY_VIA_EXPIRY_OR_ACTIVATION");
            _pendingBurn[tokenId] = false;
            return from;
        }

        ruleExpiry[tokenId] = subscriptionExpiry[to];
    }

    /* ===================================================== */
    /* ================= VIEW HELPERS ====================== */
    /* ===================================================== */

    function getRule(uint256 ruleId)
        external
        view
        returns (
            bytes32 hash,
            string memory uri,
            address creator,
            uint256 rootRuleId,
            uint16  version,
            bool    deprecated,
            bool    active
        )
    {
        RuleDefinition memory r = rules[ruleId];
        require(r.ruleHash != bytes32(0), "RULE_NOT_EXIST");

        uint256 root     = rootRuleOf[ruleId];
        bool    isActive = activeRuleOf[root] == ruleId;

        return (r.ruleHash, r.uri, r.creator, root, r.version, r.deprecated, isActive);
    }

    /* ===================== OVERRIDES ===================== */

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
