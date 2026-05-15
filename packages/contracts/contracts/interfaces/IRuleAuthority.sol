// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRuleAuthority
 * @notice Interface for rule authority / registry contracts
 */
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
            uint64 version
        );
}
