// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "./AttestationVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PayWithPayID {
    PayIDVerifier public immutable verifier;
    AttestationVerifier public immutable attestationVerifier;

    constructor(
        address verifier_,
        address attestationVerifier_
    ) {
        verifier = PayIDVerifier(verifier_);
        attestationVerifier = AttestationVerifier(attestationVerifier_);
    }

    function payETH(
        PayIDVerifier.Decision calldata d,
        bytes calldata sig,
        bytes32[] calldata payloadHashes,
        AttestationVerifier.Attestation[] calldata atts
    ) external payable {
        attestationVerifier.verifyTypedAttestationBatch(
            payloadHashes,
            atts
        );

        verifier.requireAllowed(d, sig);

        require(d.asset == address(0), "ASSET_NOT_ETH");
        require(msg.value == d.amount, "AMOUNT_MISMATCH");

        payable(d.receiver).transfer(msg.value);
    }

    function payERC20(
        PayIDVerifier.Decision calldata d,
        bytes calldata sig,
        bytes32[] calldata payloadHashes,
        AttestationVerifier.Attestation[] calldata atts
    ) external {
        verifier.requireAllowed(d, sig);

        if (d.requiresAttestation) {
            require(payloadHashes.length > 0, "ATTESTATION_REQUIRED");
            attestationVerifier.verifyTypedAttestationBatch(
                payloadHashes,
                atts
            );
        }

        require(d.asset != address(0), "ASSET_NOT_ERC20");

        bool ok = IERC20(d.asset).transferFrom(
            d.payer,
            d.receiver,
            d.amount
        );

        require(ok, "TRANSFER_FAILED");
    }
}
