// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PayIDVerifier is EIP712 {
    using ECDSA for bytes32;

    string public constant SIGNING_DOMAIN = "PAY.ID Decision";
    string public constant SIGNATURE_VERSION = "2";

    bytes32 public constant DECISION_TYPEHASH =
        keccak256(
            "Decision(bytes32 version,bytes32 payId,address payer,address receiver,address asset,uint256 amount,bytes32 contextHash,bytes32 ruleSetHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce)"
        );

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    struct Decision {
        bytes32 version;
        bytes32 payId;

        address payer;       
        address receiver;  

        address asset;       
        uint256 amount;

        bytes32 contextHash;
        bytes32 ruleSetHash;

        uint64 issuedAt;
        uint64 expiresAt;

        bytes32 nonce;
    }

    function hashDecision(
        Decision calldata d
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    DECISION_TYPEHASH,
                    d.version,
                    d.payId,
                    d.payer,
                    d.receiver,
                    d.asset,
                    d.amount,
                    d.contextHash,
                    d.ruleSetHash,
                    d.issuedAt,
                    d.expiresAt,
                    d.nonce
                )
            )
        );
    }

    function verifyDecision(
        Decision calldata d,
        bytes calldata sig
    ) public view returns (bool) {
        if (block.timestamp > d.expiresAt) return false;
        if (d.issuedAt > block.timestamp) return false;
        if (d.amount == 0) return false;
        if (d.receiver == address(0)) return false;

        address recovered =
            hashDecision(d).recover(sig);

        return recovered == d.payer;
    }

    function requireAllowed(
        Decision calldata d,
        bytes calldata sig
    ) external view {
        require(verifyDecision(d, sig), "PAYID: INVALID_PROOF");
    }
}
