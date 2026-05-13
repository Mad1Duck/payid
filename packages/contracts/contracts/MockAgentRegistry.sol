// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockAgentRegistry is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("Mock 0G Agent", "AGENT") {}

    function mint(address to) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
}
