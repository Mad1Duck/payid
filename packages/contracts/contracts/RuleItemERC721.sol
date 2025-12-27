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

interface IRuleLicense {
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract RuleItemERC721 is ERC721, ERC721URIStorage, AccessControl, Pausable {

    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /* ===================== CONFIG ===================== */
    uint8   public constant MAX_SLOT = 3;
    uint256 public constant SUB_DURATION = 30 days;

    // ~$0.35 ≈ Rp 5.000
    uint256 public subscriptionUsdCents = 35;

    AggregatorV3Interface public ethUsdFeed;

    /* ===================== IDS ===================== */
    uint256 public nextRuleId;
    uint256 public nextTokenId;

    /* ===================== STRUCT ===================== */
    address public immutable deployer;

    struct RuleDefinition {
        bytes32 ruleHash;
        string uri;
        address creator;

        uint256 parentRuleId; // 0 if root
        uint16  version;

        bool deprecated;      // true if replaced
        uint256 tokenId;      // NFT only for ACTIVE version
    }

    /* ===================== STORAGE ===================== */
    mapping(uint256 => RuleDefinition) public rules;      // ruleId => rule
    mapping(uint256 => uint256) public tokenRule;         // tokenId => ruleId

    mapping(uint256 => uint256) public rootRuleOf;        // ruleId => rootRuleId
    mapping(uint256 => uint256) public activeRuleOf;      // rootRuleId => active ruleId

    mapping(address => uint8)   public logicalRuleCount;  // ROOT rules per user
    mapping(address => uint256) public subscriptionExpiry;
    mapping(uint256 => uint256) public ruleExpiry;        // tokenId => expiry
    mapping(uint256 => uint256) public ruleTokenId;

    /* ===================== EVENTS ===================== */
    event RuleCreated(
        uint256 indexed ruleId,
        uint256 indexed rootRuleId,
        uint256 indexed parentRuleId,
        uint16 version
    );

    event RuleActivated(
        uint256 indexed ruleId,
        uint256 indexed tokenId
    );

    event RuleDeprecated(
        uint256 indexed ruleId
    );

    event Subscribed(
        address indexed user,
        uint256 expiry
    );

    /* ===================== CONSTRUCTOR ===================== */
    constructor(
        address admin,
        address oracle
    ) ERC721("PayID Rule Item", "PRULE") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        ethUsdFeed = AggregatorV3Interface(oracle);
        deployer = msg.sender;

    }


    /* ===================================================== */
    /* ================= SUBSCRIPTION ====================== */
    /* ===================================================== */

    function hasSubscription(address user) public view returns (bool) {
        return subscriptionExpiry[user] >= block.timestamp;
    }

    // function subscriptionPriceETH() public view returns (uint256) {
    //     (, int256 price,,,) = ethUsdFeed.latestRoundData();
    //     require(price > 0, "INVALID_ORACLE_PRICE");

    //     uint256 usdValue = subscriptionUsdCents * 1e16; // cents → 18 decimals
    //     uint256 ethUsd =
    //         uint256(price) * (10 ** (18 - ethUsdFeed.decimals()));

    //     return (usdValue * 1e18) / ethUsd;
    // }
    
    function subscriptionPriceETH() public pure returns (uint256) {
        return 0.0001 ether;
    }


    function subscribe() external payable whenNotPaused {
        uint256 price = subscriptionPriceETH();
        require(msg.value >= price, "INSUFFICIENT_PAYMENT");

        uint256 expiry = subscriptionExpiry[msg.sender];
        subscriptionExpiry[msg.sender] =
            expiry < block.timestamp
                ? block.timestamp + SUB_DURATION
                : expiry + SUB_DURATION;

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

         (bool ok, ) = deployer.call{value: msg.value}("");
        require(ok, "DEPLOYER_TRANSFER_FAILED");

        emit Subscribed(msg.sender, subscriptionExpiry[msg.sender]);
    }

    /* ===================================================== */
    /* ================= RULE CREATION ===================== */
    /* ===================================================== */

    /// Create ROOT rule (v1)
    function createRule(
        bytes32 ruleHash,
        string calldata uri
    ) external whenNotPaused returns (uint256 ruleId) {
        require(ruleHash != bytes32(0), "INVALID_RULE_HASH");

        uint8 limit = hasSubscription(msg.sender) ? MAX_SLOT : 1;
        require(logicalRuleCount[msg.sender] < limit, "RULE_SLOT_FULL");

        ruleId = ++nextRuleId;

        rules[ruleId] = RuleDefinition({
            ruleHash: ruleHash,
            uri: uri,
            creator: msg.sender,
            parentRuleId: 0,
            version: 1,
            deprecated: false,
            tokenId: 0
        });

        rootRuleOf[ruleId] = ruleId;
        logicalRuleCount[msg.sender]++;

        emit RuleCreated(ruleId, ruleId, 0, 1);
    }

    /// Create NEW VERSION of a rule (slot-aware)
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
            ruleHash: newHash,
            uri: newUri,
            creator: msg.sender,
            parentRuleId: parentRuleId,
            version: parent.version + 1,
            deprecated: false,
            tokenId: 0
        });

        rootRuleOf[ruleId] = root;

        // mark old version
        parent.deprecated = true;
        emit RuleDeprecated(parentRuleId);

        emit RuleCreated(
            ruleId,
            root,
            parentRuleId,
            rules[ruleId].version
        );
    }

    /* ===================================================== */
    /* =========== SLOT-AWARE VERSION ACTIVATION =========== */
    /* ===================================================== */

    /// Activate a rule version
    /// Automatically deactivates previous version (if any)
    function activateRule(uint256 ruleId)
        external
        whenNotPaused
        returns (uint256 tokenId)
    {
        RuleDefinition storage r = rules[ruleId];

        require(r.creator == msg.sender, "NOT_CREATOR");
        require(!r.deprecated, "RULE_DEPRECATED");
        require(r.tokenId == 0, "ALREADY_ACTIVE");

        uint256 root = rootRuleOf[ruleId];
        uint256 oldActive = activeRuleOf[root];

        // Deactivate previous version (burn its NFT)
        if (oldActive != 0) {
            uint256 oldToken = rules[oldActive].tokenId;
            if (oldToken != 0) {
                _burn(oldToken);
            }
            rules[oldActive].tokenId = 0;
            rules[oldActive].deprecated = true;
            emit RuleDeprecated(oldActive);
        }

        // Activate new version
        tokenId = ++nextTokenId;
        r.tokenId = tokenId;
        tokenRule[tokenId] = ruleId;
        activeRuleOf[root] = ruleId;
        ruleExpiry[tokenId] = subscriptionExpiry[msg.sender];
        ruleTokenId[ruleId] = tokenId;

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
        uint256 root = rootRuleOf[ruleId];

        _burn(tokenId);

        // clear active pointer
        if (activeRuleOf[root] == ruleId) {
            activeRuleOf[root] = 0;
        }

        rules[ruleId].tokenId = 0;
    }

    /**
     * @notice Extend / set rule license expiry
     * @dev Only current rule owner can extend
     */
    function extendRuleExpiry(
        uint256 tokenId,
        uint256 newExpiry
    ) external payable {
        require(
            ownerOf(tokenId) == msg.sender,
            "NOT_RULE_OWNER"
        );
        require(
            newExpiry > ruleExpiry[tokenId],
            "EXPIRY_NOT_EXTENDED"
        );

        uint256 price = subscriptionPriceETH();
        require(msg.value >= price, "INSUFFICIENT_PAYMENT");

        uint256 expiry = subscriptionExpiry[msg.sender];
        subscriptionExpiry[msg.sender] =
            expiry < block.timestamp
                ? block.timestamp + SUB_DURATION
                : expiry + SUB_DURATION;

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        (bool ok, ) = deployer.call{value: msg.value}("");
        require(ok, "DEPLOYER_TRANSFER_FAILED");

        ruleExpiry[tokenId] = newExpiry;
    }

    /* ===================================================== */
    /* ================= ERC721 HOOK ======================= */
    /* ===================================================== */

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override whenNotPaused returns (address from) {
        from = super._update(to, tokenId, auth);
        require(to != address(0), "BURN_ONLY_VIA_EXPIRY");
        if (to != address(0)) {
            ruleExpiry[tokenId] = subscriptionExpiry[to];
        }
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
            uint16 version,
            bool deprecated,
            bool active
        )
    {
        RuleDefinition memory r = rules[ruleId];
        require(r.ruleHash != bytes32(0), "RULE_NOT_EXIST");

        uint256 root = rootRuleOf[ruleId];
        bool isActive = activeRuleOf[root] == ruleId;

        return (
            r.ruleHash,
            r.uri,
            r.creator,
            root,
            r.version,
            r.deprecated,
            isActive
        );
    }

    /* ===================================================== */
    /* ================= OVERRIDES ========================= */
    /* ===================================================== */

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
