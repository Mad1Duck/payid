// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PayIDVerifier
 * @notice Reference verifier for PAY.ID Decision Proof
 *
 * - Verifies EIP-712 signed decision proofs
 * - Does NOT evaluate rules
 * - Does NOT custody funds
 */
contract PayIDVerifier is EIP712 {
    using ECDSA for bytes32;

    string public constant SIGNING_DOMAIN = "PAY.ID Decision";
    string public constant SIGNATURE_VERSION = "1";

    bytes32 public constant DECISION_TYPEHASH =
        keccak256(
            "Decision(bytes32 version,bytes32 payId,address owner,uint8 decision,bytes32 contextHash,bytes32 ruleSetHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce)"
        );

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    /* -------------------------------------------------------------------------- */
    /*                                   STRUCT                                   */
    /* -------------------------------------------------------------------------- */

    struct Decision {
        bytes32 version;      // e.g. keccak256("1")
        bytes32 payId;        // keccak256("pay.id/demo")
        address owner;        // signing authority
        uint8 decision;       // 1 = ALLOW, 0 = REJECT
        bytes32 contextHash;  // hash of evaluated context
        bytes32 ruleSetHash;  // hash of rule config
        uint64 issuedAt;      // unix timestamp
        uint64 expiresAt;     // unix timestamp
        bytes32 nonce;        // replay protection
    }

    /* -------------------------------------------------------------------------- */
    /*                                CORE LOGIC                                  */
    /* -------------------------------------------------------------------------- */

    /// @notice Hash a Decision struct according to EIP-712
    function hashDecision(
        Decision calldata d
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    DECISION_TYPEHASH,
                    d.version,
                    d.payId,
                    d.owner,
                    d.decision,
                    d.contextHash,
                    d.ruleSetHash,
                    d.issuedAt,
                    d.expiresAt,
                    d.nonce
                )
            )
        );
    }

    /// @notice Verify PAY.ID decision proof
    function verifyDecision(
        Decision calldata d,
        bytes calldata signature
    ) public view returns (bool) {
        // decision sanity
        if (d.decision != 0 && d.decision != 1) {
            return false;
        }

        // expiry window
        if (block.timestamp > d.expiresAt) {
            return false;
        }

        // future-issued proof guard
        if (d.issuedAt > block.timestamp) {
            return false;
        }

        bytes32 digest = hashDecision(d);
        address recovered = digest.recover(signature);

        return recovered == d.owner;
    }

    /* -------------------------------------------------------------------------- */
    /*                             ENFORCEMENT HELPERS                             */
    /* -------------------------------------------------------------------------- */

    /// @notice Enforce that a decision is ALLOW and valid
    function requireAllowed(
        Decision calldata d,
        bytes calldata signature
    ) external view {
        require(d.decision == 1, "PAYID: DECISION_REJECTED");
        require(verifyDecision(d, signature), "PAYID: INVALID_PROOF");
    }

    /* -------------------------------------------------------------------------- */
    /*                           DOMAIN SEPARATOR (UX)                             */
    /* -------------------------------------------------------------------------- */

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
