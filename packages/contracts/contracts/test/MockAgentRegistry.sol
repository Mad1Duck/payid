// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockAgentRegistry
 * @notice Mock 0G Agent ID Registry (ERC-7857) untuk testing
 * @dev HANYA UNTUK TESTING — jangan deploy ke mainnet.
 */
contract MockAgentRegistry {
    mapping(uint256 => address) public ownerOf;

    function setOwner(uint256 tokenId, address owner) external {
        ownerOf[tokenId] = owner;
    }
}
