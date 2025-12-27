// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockEthUsdOracle {
    int256 private price;
    uint8 public constant decimals = 8;

    constructor(int256 initialPrice) {
        price = initialPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (0, price, block.timestamp, block.timestamp, 0);
    }

    function setPrice(int256 newPrice) external {
        price = newPrice;
    }
}
