// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRuleLicense {
    function ownerOf(uint256 tokenId) external view returns (address);
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
}

/**
 * @title CombinedRuleStorage
 * @notice Registry of ACTIVE combined ruleSets (multi-rule NFT composition)
 *
 * DESIGN INVARIANTS:
 * - Each owner may have ONLY ONE active combined rule at any time
 * - Registering a new combined rule automatically deactivates the previous one
 * - A combined rule references a SUBSET of rule NFTs owned by the caller
 * - Each combined rule may reference MULTIPLE rule NFTs (up to MAX_RULES)
 * - Ownership is enforced via ERC-721 rule license NFTs
 * - Rule evaluation logic (AND / OR / thresholds / windows) lives OFF-CHAIN
 * - On-chain state stores ONLY:
 *     - canonical ruleSetHash (bytes32)
 *     - rule NFT references (contract + tokenId)
 *     - owner + active state
 *
 * NON-GOALS:
 * - No rule logic execution on-chain
 * - No JSON / string / condition storage
 * - No per-transaction rule evaluation
 */
contract CombinedRuleStorage {
    /* ===================== STRUCT ===================== */

    struct RuleRef {
        address ruleNFT;
        uint256 tokenId;
    }

    struct CombinedRule {
        address owner;
        bytes32 ruleSetHash;   
        RuleRef[] rules;
        uint64 version;
        bool active;
    }

    /* ===================== STORAGE ===================== */

    uint256 public constant MAX_RULES = 10;
    mapping(bytes32 => CombinedRule) private rules;

    mapping(address => bytes32) public activeRuleOf;

    bytes32[] private allRuleSetHashes;
    mapping(bytes32 => bool) private exists;

    /* ===================== EVENTS ===================== */

    event CombinedRuleRegistered(
        bytes32 indexed ruleSetHash,
        address indexed owner,
        uint64 version
    );

    event CombinedRuleDeactivated(
        bytes32 indexed ruleSetHash
    );

    event CombinedRuleOwnershipSynced(
        bytes32 indexed ruleSetHash,
        address indexed oldOwner,
        address indexed newOwner
    );

    /* ===================== VIEW ===================== */

    function isActive(bytes32 ruleSetHash) external view returns (bool) {
        return rules[ruleSetHash].active;
    }

    function listAllRuleSetHashes()
        external
        view
        returns (bytes32[] memory)
    {
        return allRuleSetHashes;
    }

    function getActiveRuleOf(address owner)
        external
        view
        returns (bytes32 ruleSetHash)
    {
        ruleSetHash = activeRuleOf[owner];
        require(ruleSetHash != bytes32(0), "NO_ACTIVE_RULE");
    }

    function getRuleByHash(
        bytes32 ruleSetHash
    )
        external
        view
        returns (
            address owner,
            RuleRef[] memory ruleRefs,
            uint64 version
        )
    {
        CombinedRule storage r = rules[ruleSetHash];
        require(r.active, "RULE_NOT_ACTIVE");

        return (r.owner, r.rules, r.version);
    }

    /* ===================== MUTATION ===================== */

    /**
     * @notice Register & activate a new combined rule
     *
     * @param ruleSetHash canonical hash of combined rule JSON
     * @param ruleNFTs list of rule NFT contracts
     * @param tokenIds list of rule NFT tokenIds
     * @param version combined rule version
     *
     * REQUIREMENTS:
     * - ruleNFTs.length == tokenIds.length
     * - caller must own ALL rule NFTs
     * - deactivates previous combined rule of caller
     */
    function registerCombinedRule(
        bytes32 ruleSetHash,
        address[] calldata ruleNFTs,
        uint256[] calldata tokenIds,
        uint64 version
    ) external {
        require(ruleSetHash != bytes32(0), "INVALID_HASH");
        require(ruleNFTs.length > 0, "EMPTY_RULE_SET");
        require(ruleNFTs.length <= MAX_RULES, "MAX_10_RULES");
        require(ruleNFTs.length == tokenIds.length, "ARRAY_LENGTH_MISMATCH");

        bytes32 prev = activeRuleOf[msg.sender];
        if (prev != bytes32(0)) {
            rules[prev].active = false;
            emit CombinedRuleDeactivated(prev);
        }

        if (!exists[ruleSetHash]) {
            exists[ruleSetHash] = true;
            allRuleSetHashes.push(ruleSetHash);
        }

        CombinedRule storage r = rules[ruleSetHash];
        delete r.rules;

        for (uint256 i = 0; i < ruleNFTs.length; i++) {
            require(
                IRuleLicense(ruleNFTs[i]).ownerOf(tokenIds[i]) == msg.sender,
                "NOT_RULE_NFT_OWNER"
            );

            r.rules.push(
                RuleRef({
                    ruleNFT: ruleNFTs[i],
                    tokenId: tokenIds[i]
                })
            );
        }

        r.owner = msg.sender;
        r.ruleSetHash = ruleSetHash;
        r.version = version;
        r.active = true;

        activeRuleOf[msg.sender] = ruleSetHash;

        emit CombinedRuleRegistered(ruleSetHash, msg.sender, version);
    }


    /**
     * @notice Deactivate caller's active combined rule
     */
    function deactivateMyCombinedRule() external {
        bytes32 hash = activeRuleOf[msg.sender];
        require(hash != bytes32(0), "NO_ACTIVE_RULE");

        rules[hash].active = false;
        activeRuleOf[msg.sender] = bytes32(0);

        emit CombinedRuleDeactivated(hash);
    }

    /**
     * @notice Sync ownership if ALL rule NFTs moved to a new owner
     * @dev Optional can be called by anyone
     */
    function syncOwner(bytes32 ruleSetHash) external {
        CombinedRule storage r = rules[ruleSetHash];
        require(r.active, "RULE_NOT_ACTIVE");

        address newOwner =
            IRuleLicense(r.rules[0].ruleNFT)
                .ownerOf(r.rules[0].tokenId);

        // verify all rule NFTs share same owner
        for (uint256 i = 1; i < r.rules.length; i++) {
            require(
                IRuleLicense(r.rules[i].ruleNFT)
                    .ownerOf(r.rules[i].tokenId) == newOwner,
                "RULE_NFT_OWNERSHIP_SPLIT"
            );
        }

        if (newOwner != r.owner) {
            address old = r.owner;

            if (activeRuleOf[old] == ruleSetHash) {
                activeRuleOf[old] = bytes32(0);
            }

            r.owner = newOwner;
            activeRuleOf[newOwner] = ruleSetHash;

            emit CombinedRuleOwnershipSynced(
                ruleSetHash,
                old,
                newOwner
            );
        }
    }
}
