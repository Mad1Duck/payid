// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract AttestationVerifier is EIP712 {
    using ECDSA for bytes32;

    error UntrustedIssuer();
    error InvalidIssuedAt();
    error InvalidExpiry();
    error AttestationExpired();
    error InvalidSignature();
    error ReplayAttestation();

    struct Attestation {
        address issuer;
        uint64 issuedAt;
        uint64 expiresAt;
        bytes signature;
    }
    bytes32 public constant ATTESTATION_TYPEHASH =
        keccak256(
            "Attestation(address issuer,uint64 issuedAt,uint64 expiresAt,bytes32 payloadHash)"
        );

    mapping(address => bool) public trustedIssuers;
    mapping(bytes32 => bool) public usedPayloads;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address[] memory initialIssuers)
        EIP712("PayID Attestation", "1")
    {
        owner = msg.sender;
        for (uint256 i = 0; i < initialIssuers.length; i++) {
            trustedIssuers[initialIssuers[i]] = true;
        }
    }

    function setTrustedIssuer(address issuer, bool trusted)
        external
        onlyOwner
    {
        trustedIssuers[issuer] = trusted;
    }

    function _verifyTypedAttestation(
        bytes32 payloadHash,
        Attestation calldata att
    ) internal view {
        if (!trustedIssuers[att.issuer]) revert UntrustedIssuer();

        if (att.issuedAt > block.timestamp) revert InvalidIssuedAt();
        if (att.expiresAt <= att.issuedAt) revert InvalidExpiry();
        if (block.timestamp > att.expiresAt) revert AttestationExpired();

        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                att.issuer,
                att.issuedAt,
                att.expiresAt,
                payloadHash
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, att.signature);

        if (recovered != att.issuer) revert InvalidSignature();
    }

    function verifyTypedAttestation(
        bytes32 payloadHash,
        Attestation calldata att
    ) external view {
        _verifyTypedAttestation(payloadHash, att);
    }

    function verifyTypedAttestationOnce(
        bytes32 payloadHash,
        Attestation calldata att
    ) external {
        if (usedPayloads[payloadHash]) revert ReplayAttestation();

        _verifyTypedAttestation(payloadHash, att);

        usedPayloads[payloadHash] = true;
    }

    /* =============================================================
                      BATCH VERIFIER (GAS OPTIMIZED)
       ============================================================= */

    /**
     * @notice Verify multiple attestations in a single call.
     *
     * Gas optimized:
     * - Single domain separator
     * - No storage writes
     * - Early revert on first failure
     */
    function verifyTypedAttestationBatch(
        bytes32[] calldata payloadHashes,
        Attestation[] calldata atts
    ) external view {
        uint256 len = payloadHashes.length;
        require(len == atts.length, "LENGTH_MISMATCH");

        for (uint256 i = 0; i < len; ) {
            _verifyTypedAttestation(payloadHashes[i], atts[i]);

            unchecked {
                ++i;
            }
        }
    }
}
