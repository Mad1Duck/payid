// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockIDRX
 * @dev Mock IDRX (Indonesian Rupiah stablecoin) token for testing
 */
contract MockIDRX is ERC20, Ownable {
    constructor() ERC20("IDRX", "IDRX") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000_000 * 10**2); // 1B IDR with 2 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
