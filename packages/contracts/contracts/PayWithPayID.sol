// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";

contract PayWithPayID {
    PayIDVerifier public immutable verifier;

    constructor(address verifierAddress) {
        verifier = PayIDVerifier(verifierAddress);
    }

    function pay(
        PayIDVerifier.Decision calldata decision,
        bytes calldata signature
    ) external payable {
        verifier.requireAllowed(decision, signature);

        // 💰 lanjutkan logic pembayaran
        // transfer, mint, execute, dll
    }
}
