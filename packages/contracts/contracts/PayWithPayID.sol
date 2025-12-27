// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PayWithPayID {
    PayIDVerifier public immutable verifier;

    constructor(address verifier_) {
        verifier = PayIDVerifier(verifier_);
    }

    function payETH(
        PayIDVerifier.Decision calldata d,
        bytes calldata sig
    ) external payable {
        verifier.requireAllowed(d, sig);

        require(d.asset == address(0), "ASSET_NOT_ETH");
        require(msg.value == d.amount, "AMOUNT_MISMATCH");

        payable(d.receiver).transfer(msg.value);
    }

    function payERC20(
        PayIDVerifier.Decision calldata d,
        bytes calldata sig
    ) external {
        verifier.requireAllowed(d, sig);

        require(d.asset != address(0), "ASSET_NOT_ERC20");

        bool ok = IERC20(d.asset).transferFrom(
            d.payer,
            d.receiver,
            d.amount
        );

        require(ok, "TRANSFER_FAILED");
    }
}
