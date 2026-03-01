// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IRuleAuthority {
    struct RuleRef {
        address ruleNFT;
        uint256 tokenId;
    }

    function getRuleByHash(bytes32 ruleSetHash)
        external
        view
        returns (
            address owner,
            RuleRef[] memory ruleRefs,
            uint64  version
        );
}

/**
 * @title RuleAuthority
 * @notice Deterministic deployment compatible
 *
 * Deploy flow:
 *   1. Deploy via CREATE2 → address sama di semua chain
 *   2. Call initialize(adminAddress) per chain
 *
 * CATATAN: AccessControl._grantRole dipindah ke initialize()
 *          bukan constructor, agar bytecode identik di semua chain.
 * @dev Implements IRuleAuthority so PayIDVerifier can verify:
 *      1. The rule set belongs to the correct receiver
 *      2. Each referenced Rule NFT license is still valid and owned
 *
 * Flow:
 *   1. Creator mints Rule NFTs via RuleItemERC721
 *   2. Creator calls registerRuleSet() with the hash + refs
 *   3. PayIDVerifier calls getRuleByHash() during requireAllowed()
 */
contract RuleAuthority is IRuleAuthority, AccessControl {

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /* ===================== STORAGE ===================== */

    struct RuleSet {
        address     owner;
        RuleRef[]   ruleRefs;
        uint64      version;
        bool        active;
        uint256     registeredAt;
    }

    mapping(bytes32 => RuleSet) private _ruleSets;
    mapping(address => bytes32[]) public ownerRuleSets;

    bool private _initialized;

    /* ===================== ERRORS ===================== */
    error AlreadyInitialized();
    error NotInitialized();

    /* ===================== EVENTS ===================== */

    event Initialized(address indexed admin);
    event RuleSetRegistered(bytes32 indexed ruleSetHash, address indexed owner, uint64 version);
    event RuleSetDeactivated(bytes32 indexed ruleSetHash, address indexed owner);
    event RuleSetUpdated(bytes32 indexed oldHash, bytes32 indexed newHash, address indexed owner, uint64 newVersion);

    /* ===================== INITIALIZE ===================== */

    /**
     * @notice Grant admin roles — dipanggil sekali setelah deploy
     * @dev Dipindah dari constructor ke initialize() agar bytecode identik
     *      Constructor AccessControl tidak ada args → bytecode sama di semua chain
     *
     * @param admin  Address yang akan jadi DEFAULT_ADMIN_ROLE + REGISTRAR_ROLE
     */
    function initialize(address admin) external {
        if (_initialized) revert AlreadyInitialized();
        require(admin != address(0), "ZERO_ADDRESS");

        _initialized = true;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);

        emit Initialized(admin);
    }

    /* ===================== MODIFIER ===================== */

    modifier onlyInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    /* ===================================================== */
    /* ================= REGISTRATION ====================== */
    /* ===================================================== */

    function registerRuleSet(
        bytes32            ruleSetHash,
        RuleRef[] calldata ruleRefs
    ) external onlyInitialized {
        require(ruleSetHash != bytes32(0),   "INVALID_HASH");
        require(ruleRefs.length > 0,         "EMPTY_RULE_REFS");
        require(ruleRefs.length <= 10,       "TOO_MANY_REFS");
        require(
            _ruleSets[ruleSetHash].owner == address(0),
            "HASH_ALREADY_REGISTERED"
        );

        for (uint256 i = 0; i < ruleRefs.length; ) {
            require(ruleRefs[i].ruleNFT.code.length > 0, "RULE_NFT_NOT_CONTRACT");
            unchecked { ++i; }
        }

        RuleSet storage rs = _ruleSets[ruleSetHash];
        rs.owner        = msg.sender;
        rs.version      = 1;
        rs.active       = true;
        rs.registeredAt = block.timestamp;

        for (uint256 i = 0; i < ruleRefs.length; ) {
            rs.ruleRefs.push(ruleRefs[i]);
            unchecked { ++i; }
        }

        ownerRuleSets[msg.sender].push(ruleSetHash);

        emit RuleSetRegistered(ruleSetHash, msg.sender, 1);
    }

    function updateRuleSet(
        bytes32            oldHash,
        bytes32            newHash,
        RuleRef[] calldata newRefs
    ) external onlyInitialized {
        RuleSet storage old = _ruleSets[oldHash];

        require(old.owner == msg.sender, "NOT_OWNER");
        require(old.active,              "ALREADY_INACTIVE");
        require(newHash != bytes32(0),   "INVALID_NEW_HASH");
        require(newHash != oldHash,      "SAME_HASH");
        require(
            _ruleSets[newHash].owner == address(0),
            "NEW_HASH_ALREADY_REGISTERED"
        );
        require(newRefs.length > 0,  "EMPTY_RULE_REFS");
        require(newRefs.length <= 10,"TOO_MANY_REFS");

        uint64 newVersion = old.version + 1;

        old.active = false;
        emit RuleSetDeactivated(oldHash, msg.sender);

        RuleSet storage rs = _ruleSets[newHash];
        rs.owner        = msg.sender;
        rs.version      = newVersion;
        rs.active       = true;
        rs.registeredAt = block.timestamp;

        for (uint256 i = 0; i < newRefs.length; ) {
            rs.ruleRefs.push(newRefs[i]);
            unchecked { ++i; }
        }

        ownerRuleSets[msg.sender].push(newHash);

        emit RuleSetUpdated(oldHash, newHash, msg.sender, newVersion);
    }

    function deactivateRuleSet(bytes32 ruleSetHash) external onlyInitialized {
        RuleSet storage rs = _ruleSets[ruleSetHash];
        require(
            rs.owner == msg.sender || hasRole(REGISTRAR_ROLE, msg.sender),
            "NOT_AUTHORIZED"
        );
        require(rs.active, "ALREADY_INACTIVE");

        rs.active = false;
        emit RuleSetDeactivated(ruleSetHash, rs.owner);
    }

    /* ===================================================== */
    /* ================= IRuleAuthority ==================== */
    /* ===================================================== */

    function getRuleByHash(bytes32 ruleSetHash)
        external
        view
        override
        returns (
            address    owner,
            RuleRef[]  memory ruleRefs,
            uint64     version
        )
    {
        RuleSet storage rs = _ruleSets[ruleSetHash];
        require(rs.owner != address(0), "RULE_SET_NOT_FOUND");
        require(rs.active,              "RULE_SET_INACTIVE");

        return (rs.owner, rs.ruleRefs, rs.version);
    }

    /* ===================================================== */
    /* ================= VIEW HELPERS ====================== */
    /* ===================================================== */

    function getRuleSet(bytes32 ruleSetHash)
        external
        view
        returns (
            address owner,
            uint64  version,
            bool    active,
            uint256 registeredAt,
            uint256 refCount
        )
    {
        RuleSet storage rs = _ruleSets[ruleSetHash];
        require(rs.owner != address(0), "RULE_SET_NOT_FOUND");

        return (rs.owner, rs.version, rs.active, rs.registeredAt, rs.ruleRefs.length);
    }

    function getRuleRef(bytes32 ruleSetHash, uint256 index)
        external
        view
        returns (address ruleNFT, uint256 tokenId)
    {
        RuleSet storage rs = _ruleSets[ruleSetHash];
        require(rs.owner != address(0), "RULE_SET_NOT_FOUND");
        require(index < rs.ruleRefs.length, "INDEX_OUT_OF_BOUNDS");

        RuleRef memory ref = rs.ruleRefs[index];
        return (ref.ruleNFT, ref.tokenId);
    }

    function getOwnerRuleSets(address owner)
        external
        view
        returns (bytes32[] memory)
    {
        return ownerRuleSets[owner];
    }

    function isInitialized() external view returns (bool) {
        return _initialized;
    }
}
