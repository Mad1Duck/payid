// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

/**
 * @title RuleItemERC721
 * @notice Deterministic deployment compatible
 *
 * Deploy flow:
 *   1. Deploy via CREATE2 → address sama di semua chain
 *   2. Call initialize(name, symbol, admin, oracle) per chain
 *      oracle = Chainlink ETH/USD feed address (beda tiap chain)
 *
 * CHANGED:
 *   - deployer: immutable → storage (immutable inline ke bytecode)
 *   - ethUsdFeed: set di initialize() bukan constructor
 *   - ERC721(name, symbol): dipindah ke initialize() via _initERC721()
 */
contract RuleItemERC721 is ERC721URIStorage, AccessControl, Pausable {

    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /* ===================== CONFIG ===================== */
    uint8   public constant MAX_SLOT     = 3;
    uint256 public constant SUB_DURATION = 30 days;

    uint256 public subscriptionUsdCents = 35;

    AggregatorV3Interface public ethUsdFeed;

    uint256 public nextRuleId;
    uint256 public nextTokenId;

    // CHANGED: dari immutable ke storage variable
    // immutable deployer di-encode ke bytecode → bytecode beda → CREATE2 address beda
    address public deployer;

    bool private _initialized;

    struct RuleDefinition {
        bytes32 ruleHash;
        string  uri;
        address creator;
        uint256 parentRuleId;
        uint16  version;
        bool    deprecated;
        uint256 tokenId;
    }

    /* ===================== STORAGE ===================== */
    mapping(uint256 => RuleDefinition) public rules;
    mapping(uint256 => uint256)        public tokenRule;
    mapping(uint256 => uint256)        public rootRuleOf;
    mapping(uint256 => uint256)        public activeRuleOf;
    mapping(address => uint8)          public logicalRuleCount;
    mapping(address => uint256)        public subscriptionExpiry;
    mapping(uint256 => uint256)        public ruleExpiry;
    mapping(uint256 => uint256)        public ruleTokenId;
    mapping(uint256 => bool)           private _pendingBurn;

    /* ===================== ERRORS ===================== */
    error AlreadyInitialized();
    error NotInitialized();

    /* ===================== EVENTS ===================== */
    event Initialized(address indexed admin, address indexed oracle);
    event RuleCreated(uint256 indexed ruleId, uint256 indexed rootRuleId, uint256 indexed parentRuleId, uint16 version);
    event RuleActivated(uint256 indexed ruleId, uint256 indexed tokenId);
    event RuleDeprecated(uint256 indexed ruleId);
    event Subscribed(address indexed user, uint256 expiry);

    /* ===================== CONSTRUCTOR ===================== */

    /**
     * @dev ERC721 constructor butuh name + symbol — pakai placeholder
     *      yang akan di-override via _name/_symbol storage kalau perlu,
     *      atau pakai nama generik karena ini template contract.
     *
     *      Alternatif: extend ERC721 dan override name()/symbol() untuk
     *      baca dari storage yang di-set saat initialize().
     *
     *      Untuk simplicity, kita pakai nama fixed di constructor —
     *      ini tidak mempengaruhi CREATE2 address karena bytecode sama.
     */
    constructor() ERC721("PAY.ID Rule License", "PAYID-RULE") {}

    /* ===================== INITIALIZE ===================== */

    /**
     * @notice Set admin, oracle, dan deployer — dipanggil sekali setelah deploy
     *
     * @param admin    Address yang dapat ADMIN_ROLE + PAUSER_ROLE
     * @param oracle   Chainlink ETH/USD price feed (beda tiap chain — di-set post-deploy)
     * @param revenueReceiver  Address penerima subscription payment (deployer)
     */
    function initialize(
        address admin,
        address oracle,
        address revenueReceiver
    ) external {
        if (_initialized) revert AlreadyInitialized();
        require(admin != address(0),           "ZERO_ADMIN");
        require(oracle != address(0),          "ZERO_ORACLE");
        require(revenueReceiver != address(0), "ZERO_RECEIVER");

        _initialized = true;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        ethUsdFeed = AggregatorV3Interface(oracle);
        deployer   = revenueReceiver;

        emit Initialized(admin, oracle);
    }

    /* ===================== MODIFIER ===================== */

    modifier onlyInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    /* ===================================================== */
    /* ================= SUBSCRIPTION ====================== */
    /* ===================================================== */

    function hasSubscription(address user) public view returns (bool) {
        return subscriptionExpiry[user] >= block.timestamp;
    }

    function subscriptionPriceETH() public pure returns (uint256) {
        return 0.0001 ether;
    }

    function subscribe() external payable whenNotPaused onlyInitialized {
        uint256 price = subscriptionPriceETH();
        require(msg.value >= price, "INSUFFICIENT_PAYMENT");

        uint256 expiry = subscriptionExpiry[msg.sender];
        subscriptionExpiry[msg.sender] =
            expiry < block.timestamp
                ? block.timestamp + SUB_DURATION
                : expiry + SUB_DURATION;

        (bool ok, ) = deployer.call{value: price}("");
        require(ok, "DEPLOYER_TRANSFER_FAILED");

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit Subscribed(msg.sender, subscriptionExpiry[msg.sender]);
    }

    /* ===================================================== */
    /* ================= RULE CREATION ===================== */
    /* ===================================================== */

    function createRule(
        bytes32 ruleHash,
        string calldata uri
    ) external whenNotPaused onlyInitialized returns (uint256 ruleId) {
        require(ruleHash != bytes32(0), "INVALID_RULE_HASH");

        uint8 limit = hasSubscription(msg.sender) ? MAX_SLOT : 1;
        require(logicalRuleCount[msg.sender] < limit, "RULE_SLOT_FULL");

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
        logicalRuleCount[msg.sender]++;

        emit RuleCreated(ruleId, ruleId, 0, 1);
    }

    function createRuleVersion(
        uint256 parentRuleId,
        bytes32 newHash,
        string calldata newUri
    ) external whenNotPaused onlyInitialized returns (uint256 ruleId) {
        RuleDefinition storage parent = rules[parentRuleId];

        require(parent.creator == msg.sender, "NOT_CREATOR");
        require(!parent.deprecated,           "PARENT_DEPRECATED");
        require(newHash != bytes32(0),        "INVALID_RULE_HASH");

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
        onlyInitialized
        returns (uint256 tokenId)
    {
        RuleDefinition storage r = rules[ruleId];

        require(r.creator == msg.sender, "NOT_CREATOR");
        require(!r.deprecated,           "RULE_DEPRECATED");
        require(r.tokenId == 0,          "ALREADY_ACTIVE");

        uint256 root      = rootRuleOf[ruleId];
        uint256 oldActive = activeRuleOf[root];

        if (oldActive != 0) {
            uint256 oldToken = rules[oldActive].tokenId;
            if (oldToken != 0) {
                _pendingBurn[oldToken] = true;
                _burn(oldToken);
                delete tokenRule[oldToken];
            }
            rules[oldActive].tokenId    = 0;
            rules[oldActive].deprecated = true;
            emit RuleDeprecated(oldActive);
        }

        tokenId = ++nextTokenId;
        r.tokenId            = tokenId;
        tokenRule[tokenId]   = ruleId;
        activeRuleOf[root]   = ruleId;
        ruleExpiry[tokenId]  = subscriptionExpiry[msg.sender];
        ruleTokenId[ruleId]  = tokenId;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, r.uri);

        emit RuleActivated(ruleId, tokenId);
    }

    /* ===================================================== */
    /* ================= AUTO EXPIRY ======================= */
    /* ===================================================== */

    function burnExpired(uint256 tokenId) external onlyInitialized {
        address tokenOwner = _ownerOf(tokenId);
        require(tokenOwner != address(0),          "NOT_EXIST");
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
    }

    function extendRuleExpiry(
        uint256 tokenId,
        uint256 newExpiry
    ) external payable onlyInitialized {
        require(ownerOf(tokenId) == msg.sender,     "NOT_RULE_OWNER");
        require(newExpiry > ruleExpiry[tokenId],    "EXPIRY_NOT_EXTENDED");

        uint256 price = subscriptionPriceETH();
        require(msg.value >= price, "INSUFFICIENT_PAYMENT");

        uint256 expiry = subscriptionExpiry[msg.sender];
        subscriptionExpiry[msg.sender] =
            expiry < block.timestamp
                ? block.timestamp + SUB_DURATION
                : expiry + SUB_DURATION;

        (bool ok, ) = deployer.call{value: price}("");
        require(ok, "DEPLOYER_TRANSFER_FAILED");

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        ruleExpiry[tokenId] = newExpiry;
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

    function isInitialized() external view returns (bool) {
        return _initialized;
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
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
