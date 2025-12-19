// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PayIDVerifier
 * @notice Reference verifier for PAY.ID Decision Proof
 *
 * This contract ONLY verifies decision proof.
 * It does NOT evaluate rules.
 */
contract PayIDVerifier is EIP712 {
    using ECDSA for bytes32;

    string private constant SIGNING_DOMAIN = "PAY.ID Decision";
    string private constant SIGNATURE_VERSION = "1";

    bytes32 private constant DECISION_TYPEHASH =
        keccak256(
            "Decision(string version,string payId,address owner,uint8 decision,bytes32 contextHash,bytes32 ruleSetHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce)"
        );

    constructor()
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {}

    struct Decision {
        string version;
        string payId;
        address owner;
        uint8 decision; // 1 = ALLOW, 0 = REJECT
        bytes32 contextHash;
        bytes32 ruleSetHash;
        uint64 issuedAt;
        uint64 expiresAt;
        bytes32 nonce;
    }

    /// @notice Verify PAY.ID decision proof
    function verifyDecision(
        Decision calldata d,
        bytes calldata signature
    ) public view returns (bool) {
        // expiry check
        if (block.timestamp > d.expiresAt) {
            return false;
        }

        // hash typed data
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    DECISION_TYPEHASH,
                    keccak256(bytes(d.version)),
                    keccak256(bytes(d.payId)),
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

        // recover signer
        address recovered = digest.recover(signature);

        // must match owner
        return recovered == d.owner;
    }

    /// @notice Enforce decision (example usage)
    function requireAllowed(
        Decision calldata d,
        bytes calldata signature
    ) external view {
        require(d.decision == 1, "PAYID: REJECTED");
        require(verifyDecision(d, signature), "PAYID: INVALID_PROOF");
    }
}
