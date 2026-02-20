// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "./AttestationVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PayWithPayID (EAS-based, fully serverless)
 * @notice Entry point untuk semua payment via PAY.ID
 *         Attestation verification dilakukan langsung via EAS on-chain
 *         Client hanya perlu pass EAS attestation UIDs — tidak perlu server
 */
contract PayWithPayID {

    PayIDVerifier        public immutable verifier;
    AttestationVerifier  public immutable attestationVerifier;

    event PaymentETH(
        address indexed payer,
        address indexed receiver,
        uint256         amount,
        bytes32         payId,
        bytes32         nonce
    );

    event PaymentERC20(
        address indexed payer,
        address indexed receiver,
        address indexed asset,
        uint256         amount,
        bytes32         payId,
        bytes32         nonce
    );

    constructor(
        address verifier_,
        address attestationVerifier_
    ) {
        verifier            = PayIDVerifier(verifier_);
        attestationVerifier = AttestationVerifier(attestationVerifier_);
    }

    /**
     * @notice Pay with ETH
     * @param attestationUIDs  EAS UIDs — client ambil dari EAS SDK, no server needed
     *                         Pass [] kalau requiresAttestation = false
     */
    function payETH(
        PayIDVerifier.Decision  calldata d,
        bytes                   calldata sig,
        bytes32[]               calldata attestationUIDs
    ) external payable {
        // Step 1: Attestation dulu (view only — no state change)
        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        // Step 2: Verify Decision + consume nonce (state change)
        verifier.requireAllowed(d, sig);

        // Step 3: Validate
        require(d.asset == address(0), "ASSET_NOT_ETH");
        require(msg.value == d.amount,  "AMOUNT_MISMATCH");

        // Step 4: Transfer
        (bool ok, ) = payable(d.receiver).call{value: msg.value}("");
        require(ok, "ETH_TRANSFER_FAILED");

        emit PaymentETH(d.payer, d.receiver, d.amount, d.payId, d.nonce);
    }

    /**
     * @notice Pay with ERC20
     * @param attestationUIDs  EAS UIDs — client ambil dari EAS SDK, no server needed
     *                         Pass [] kalau requiresAttestation = false
     */
    function payERC20(
        PayIDVerifier.Decision  calldata d,
        bytes                   calldata sig,
        bytes32[]               calldata attestationUIDs
    ) external {
        // Step 1: Attestation dulu (view only — no state change)
        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        // Step 2: Verify Decision + consume nonce (state change)
        verifier.requireAllowed(d, sig);

        // Step 3: Validate
        require(d.asset != address(0), "ASSET_NOT_ERC20");

        // Step 4: Transfer
        bool ok = IERC20(d.asset).transferFrom(d.payer, d.receiver, d.amount);
        require(ok, "TRANSFER_FAILED");

        emit PaymentERC20(d.payer, d.receiver, d.asset, d.amount, d.payId, d.nonce);
    }
}
