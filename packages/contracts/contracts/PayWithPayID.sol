// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract PayWithPayID {
    PayIDVerifier public immutable verifier;

    event PaymentETH(
        address indexed payer,
        address indexed receiver,
        uint256 amount,
        bytes32 payId
    );

    event PaymentERC20(
        address indexed token,
        address indexed payer,
        address indexed receiver,
        uint256 amount,
        bytes32 payId
    );

    constructor(address verifierAddress) {
        verifier = PayIDVerifier(verifierAddress);
    }

    function payETH(
        PayIDVerifier.Decision calldata decision,
        bytes calldata signature
    ) external payable {
        verifier.requireAllowed(decision, signature);
        require(msg.value > 0, "NO_ETH");

        emit PaymentETH(
            decision.owner,
            msg.sender,
            msg.value,
            decision.payId
        );
    }

    function payERC20(
        address token,
        uint256 amount,
        PayIDVerifier.Decision calldata decision,
        bytes calldata signature
    ) external {
        verifier.requireAllowed(decision, signature);

        require(amount > 0, "INVALID_AMOUNT");

        bool ok = IERC20(token).transferFrom(
            decision.owner,
            msg.sender,
            amount
        );

        require(ok, "TRANSFER_FAILED");

        emit PaymentERC20(
            token,
            decision.owner,
            msg.sender,
            amount,
            decision.payId
        );
    }
}
