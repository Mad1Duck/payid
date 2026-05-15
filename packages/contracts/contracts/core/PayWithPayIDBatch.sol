// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayWithPayID.sol";
import "./PayIDVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PayWithPayIDBatch
 * @notice Batch payment execution for payroll / airdrop.
 *         Accepts array of DecisionProofs and executes in one tx.
 */
contract PayWithPayIDBatch {
    PayWithPayID public payWithPayID;

    error BatchEmpty();
    error BatchTransferFailed(uint256 index);
    error NotInitialized();

    event BatchPaymentETH(
        address indexed payer,
        uint256         count,
        uint256         totalAmount
    );
    event BatchPaymentERC20(
        address indexed payer,
        address indexed asset,
        uint256         count,
        uint256         totalAmount
    );

    function initialize(address payWithPayID_) external {
        require(address(payWithPayID) == address(0), "ALREADY_INIT");
        payWithPayID = PayWithPayID(payWithPayID_);
    }

    /**
     * @notice Batch pay ETH to multiple recipients.
     * @param decisions Array of signed decisions.
     * @param sigs      Array of signatures matching decisions.
     * @param attestationUIDs Array of attestation UIDs per payment.
     */
    function batchPayNative(
        PayIDVerifier.Decision[] calldata decisions,
        bytes[] calldata sigs,
        bytes32[][] calldata attestationUIDs
    ) external payable {
        uint256 n = decisions.length;
        if (n == 0) revert BatchEmpty();
        if (n != sigs.length || n != attestationUIDs.length) revert BatchEmpty();

        uint256 total;
        for (uint256 i; i < n; ++i) {
            total += decisions[i].amount;
        }
        require(msg.value == total, "VALUE_MISMATCH");

        for (uint256 i; i < n; ++i) {
            (bool ok, ) = address(payWithPayID).call{value: decisions[i].amount}(
                abi.encodeWithSelector(
                    payWithPayID.payNative.selector,
                    decisions[i],
                    sigs[i],
                    attestationUIDs[i]
                )
            );
            if (!ok) revert BatchTransferFailed(i);
        }

        emit BatchPaymentETH(msg.sender, n, total);
    }

    /**
     * @notice Batch pay ERC20 to multiple recipients.
     *         Caller must have approved this contract for total amount.
     */
    function batchPayERC20(
        PayIDVerifier.Decision[] calldata decisions,
        bytes[] calldata sigs,
        bytes32[][] calldata attestationUIDs
    ) external {
        uint256 n = decisions.length;
        if (n == 0) revert BatchEmpty();
        if (n != sigs.length || n != attestationUIDs.length) revert BatchEmpty();

        address asset = decisions[0].asset;
        uint256 total;
        for (uint256 i; i < n; ++i) {
            require(decisions[i].asset == asset, "MIXED_ASSETS");
            total += decisions[i].amount;
        }

        // Pull total from payer
        IERC20(asset).transferFrom(msg.sender, address(this), total);

        // Approve PayWithPayID for total (if needed by its logic)
        // NOTE: PayWithPayID.payERC20 uses transferFrom(payer, receiver)
        // so we need to route through PayWithPayID or replicate logic.
        // For simplicity, we forward approvals and call individually.
        IERC20(asset).approve(address(payWithPayID), total);

        for (uint256 i; i < n; ++i) {
            (bool ok, ) = address(payWithPayID).call(
                abi.encodeWithSelector(
                    payWithPayID.payERC20.selector,
                    decisions[i],
                    sigs[i],
                    attestationUIDs[i]
                )
            );
            if (!ok) revert BatchTransferFailed(i);
        }

        emit BatchPaymentERC20(msg.sender, asset, n, total);
    }
}
