// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRuleLicense
 * @notice Interface for rule license NFTs (e.g., RuleItemERC721)
 */
interface IRuleLicense {
    function ownerOf(uint256 tokenId) external view returns (address);
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
    function ruleTokenId(uint256 ruleId) external view returns (uint256);
    function tokenRule(uint256 tokenId) external view returns (uint256);
    function getRule(uint256 ruleId)
        external
        view
        returns (
            bytes32 ruleHash,
            string memory uri,
            address creator,
            uint256 parentRuleId,
            uint16 version,
            bool deprecated,
            bool active
        );
}
