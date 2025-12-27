// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRuleLicense {
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title CombinedRuleStorage
 * @notice Registry of ACTIVE ruleSets used by PayIDVerifier
 */
contract CombinedRuleStorage {
    /* ===================== STRUCT ===================== */

    struct CombinedRule {
        address owner;
        bytes32 ruleSetHash;
        address ruleNFT;
        uint256 tokenId;
        uint64  version;
        bool    active;
    }

    /* ===================== STORAGE ===================== */

    // ruleSetHash => CombinedRule
    mapping(bytes32 => CombinedRule) private rules;

    /* ===================== EVENTS ===================== */

    event RuleRegistered(
        bytes32 indexed ruleSetHash,
        address indexed owner,
        address ruleNFT,
        uint256 tokenId,
        uint64 version
    );

    event RuleDeactivated(
        bytes32 indexed ruleSetHash
    );

    event RuleTransferred(
        bytes32 indexed ruleSetHash,
        address indexed oldOwner,
        address indexed newOwner
    );

    /* ===================== VIEW ===================== */

    function getRuleByHash(
        bytes32 ruleSetHash
    )
        external
        view
        returns (
            address owner,
            address ruleNFT,
            uint256 tokenId
        )
    {
        CombinedRule memory r = rules[ruleSetHash];
        require(r.active, "RULE_NOT_ACTIVE");

        return (r.owner, r.ruleNFT, r.tokenId);
    }

    function isActive(bytes32 ruleSetHash) external view returns (bool) {
        return rules[ruleSetHash].active;
    }

    /* ===================== MUTATION ===================== */

    /**
     * @notice Register or replace an active ruleSet
     * @dev Caller MUST be rule owner
     */
    function registerRule(
        bytes32 ruleSetHash,
        address ruleNFT,
        uint256 tokenId,
        uint64 version
    ) external {
        require(ruleSetHash != bytes32(0), "INVALID_HASH");

        // license owner MUST be caller
        if (ruleNFT != address(0)) {
            require(
                IRuleLicense(ruleNFT).ownerOf(tokenId) == msg.sender,
                "NOT_LICENSE_OWNER"
            );
        }

        rules[ruleSetHash] = CombinedRule({
            owner: msg.sender,
            ruleSetHash: ruleSetHash,
            ruleNFT: ruleNFT,
            tokenId: tokenId,
            version: version,
            active: true
        });

        emit RuleRegistered(
            ruleSetHash,
            msg.sender,
            ruleNFT,
            tokenId,
            version
        );
    }

    /**
     * @notice Deactivate a ruleSet
     * @dev Only owner
     */
    function deactivateRule(bytes32 ruleSetHash) external {
        CombinedRule storage r = rules[ruleSetHash];
        require(r.active, "RULE_NOT_ACTIVE");
        require(r.owner == msg.sender, "NOT_OWNER");

        r.active = false;
        emit RuleDeactivated(ruleSetHash);
    }

    /**
     * @notice Update owner when rule license NFT transferred
     * @dev Optional but recommended
     */
    function syncOwner(
        bytes32 ruleSetHash
    ) external {
        CombinedRule storage r = rules[ruleSetHash];
        require(r.active, "RULE_NOT_ACTIVE");

        if (r.ruleNFT != address(0)) {
            address newOwner =
                IRuleLicense(r.ruleNFT).ownerOf(r.tokenId);

            require(newOwner != address(0), "INVALID_OWNER");

            if (newOwner != r.owner) {
                address old = r.owner;
                r.owner = newOwner;

                emit RuleTransferred(
                    ruleSetHash,
                    old,
                    newOwner
                );
            }
        }
    }
}
