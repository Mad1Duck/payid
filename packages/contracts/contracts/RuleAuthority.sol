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
 * @notice On-chain registry that maps ruleSetHash → (owner, RuleRef[])
 *
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

    // ruleSetHash => RuleSet
    mapping(bytes32 => RuleSet) private _ruleSets;

    // owner => list of registered ruleSetHashes (for enumeration)
    mapping(address => bytes32[]) public ownerRuleSets;

    /* ===================== EVENTS ===================== */

    event RuleSetRegistered(
        bytes32 indexed ruleSetHash,
        address indexed owner,
        uint64  version
    );

    event RuleSetDeactivated(
        bytes32 indexed ruleSetHash,
        address indexed owner
    );

    event RuleSetUpdated(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        address indexed owner,
        uint64  newVersion
    );

    /* ===================== CONSTRUCTOR ===================== */

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /* ===================================================== */
    /* ================= REGISTRATION ====================== */
    /* ===================================================== */

    /**
     * @notice Register a new rule set
     * @param ruleSetHash  keccak256 of the rule set content (must match IPFS/off-chain)
     * @param ruleRefs     array of (ruleNFT address, tokenId) — the "policies"
     *
     * @dev Anyone can register — the hash is the commitment.
     *      The caller becomes the owner, and must be the receiver in PayIDVerifier.
     */
    function registerRuleSet(
        bytes32         ruleSetHash,
        RuleRef[] calldata ruleRefs
    ) external {
        require(ruleSetHash != bytes32(0),      "INVALID_HASH");
        require(ruleRefs.length > 0,            "EMPTY_RULE_REFS");
        require(ruleRefs.length <= 10,          "TOO_MANY_REFS");
        require(
            _ruleSets[ruleSetHash].owner == address(0),
            "HASH_ALREADY_REGISTERED"
        );

        // Validate that each ruleNFT address is a contract
        for (uint256 i = 0; i < ruleRefs.length; ) {
            require(
                ruleRefs[i].ruleNFT.code.length > 0,
                "RULE_NFT_NOT_CONTRACT"
            );
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

    /**
     * @notice Update rule set to a new hash (e.g. after rule version upgrade)
     * @dev Old hash is deactivated, new hash is registered with incremented version
     */
    function updateRuleSet(
        bytes32         oldHash,
        bytes32         newHash,
        RuleRef[] calldata newRefs
    ) external {
        RuleSet storage old = _ruleSets[oldHash];

        require(old.owner == msg.sender,  "NOT_OWNER");
        require(old.active,               "ALREADY_INACTIVE");
        require(newHash != bytes32(0),    "INVALID_NEW_HASH");
        require(newHash != oldHash,       "SAME_HASH");
        require(
            _ruleSets[newHash].owner == address(0),
            "NEW_HASH_ALREADY_REGISTERED"
        );
        require(newRefs.length > 0,       "EMPTY_RULE_REFS");
        require(newRefs.length <= 10,     "TOO_MANY_REFS");

        uint64 newVersion = old.version + 1;

        // Deactivate old
        old.active = false;
        emit RuleSetDeactivated(oldHash, msg.sender);

        // Register new
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

    /**
     * @notice Deactivate a rule set (emergency / deprecation)
     */
    function deactivateRuleSet(bytes32 ruleSetHash) external {
        RuleSet storage rs = _ruleSets[ruleSetHash];
        require(rs.owner == msg.sender || hasRole(REGISTRAR_ROLE, msg.sender), "NOT_AUTHORIZED");
        require(rs.active, "ALREADY_INACTIVE");

        rs.active = false;
        emit RuleSetDeactivated(ruleSetHash, rs.owner);
    }

    /* ===================================================== */
    /* ================= IRuleAuthority ==================== */
    /* ===================================================== */

    /**
     * @notice Called by PayIDVerifier during requireAllowed()
     * @return owner     address that registered this rule set
     * @return ruleRefs  array of (ruleNFT, tokenId) to validate
     * @return version   current version of this rule set
     */
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
            address    owner,
            uint64     version,
            bool       active,
            uint256    registeredAt,
            uint256    refCount
        )
    {
        RuleSet storage rs = _ruleSets[ruleSetHash];
        require(rs.owner != address(0), "RULE_SET_NOT_FOUND");

        return (
            rs.owner,
            rs.version,
            rs.active,
            rs.registeredAt,
            rs.ruleRefs.length
        );
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
}
