// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/mocks/MockV3Aggregator.sol";

contract MockOracle {
    MockV3Aggregator public ethUsd;

    constructor() {
        ethUsd = new MockV3Aggregator(8, 3000e8);
    }
}
