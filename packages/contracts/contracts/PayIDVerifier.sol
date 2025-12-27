// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/* ===================== IMPORTS ===================== */
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/* ===================== INTERFACES ===================== */
interface ICombinedRuleStorage {
    function getRuleByHash(bytes32 ruleSetHash)
        external
        view
        returns (
            address owner,
            address ruleNFT,
            uint256 tokenId
        );
}

interface IRuleLicense {
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract PayIDVerifier is EIP712 {
    using ECDSA for bytes32;

    /* ===================== CONSTANTS ===================== */

    string public constant SIGNING_DOMAIN = "PAY.ID Decision";
    string public constant SIGNATURE_VERSION = "2";

    bytes32 public constant DECISION_TYPEHASH =
        keccak256(
            "Decision(bytes32 version,bytes32 payId,address payer,address receiver,address asset,uint256 amount,bytes32 contextHash,bytes32 ruleSetHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce)"
        );

    /* ===================== STORAGE ===================== */

    ICombinedRuleStorage public immutable combinedRuleStorage;

    // Nonce replay protection 
    mapping(address => mapping(bytes32 => bool)) public usedNonce;

    /* ===================== CONSTRUCTOR ===================== */

    constructor(address combinedRuleStorage_)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        require(
            combinedRuleStorage_ != address(0),
            "INVALID_RULE_STORAGE"
        );
        combinedRuleStorage =
            ICombinedRuleStorage(combinedRuleStorage_);
    }

    /* ===================== STRUCT ===================== */

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

    /* ===================== HASHING ===================== */

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

    /* ===================== VERIFY ===================== */

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

    /* ===================== ENFORCEMENT ===================== */

    function requireAllowed(
        Decision calldata d,
        bytes calldata sig
    ) external {
        /* 1. Cryptographic proof */
        require(
            verifyDecision(d, sig),
            "PAYID: INVALID_PROOF"
        );

        /* 2. Nonce replay protection */
        require(
            !usedNonce[d.payer][d.nonce],
            "NONCE_ALREADY_USED"
        );

        // mark nonce as used
        usedNonce[d.payer][d.nonce] = true;

        /* 3. Resolve active rule */
        (
            address owner,
            address ruleNFT,
            uint256 tokenId
        ) = combinedRuleStorage.getRuleByHash(d.ruleSetHash);

        /* 4. Rule owner MUST be receiver
        require(
            owner == d.receiver,
            "RULE_OWNER_MISMATCH"
        );

        /* 5. Enforce rule license expiry */
        if (ruleNFT != address(0)) {
            uint256 expiry =
                IRuleLicense(ruleNFT).ruleExpiry(tokenId);

            require(
                expiry >= block.timestamp,
                "RULE_LICENSE_EXPIRED"
            );

            require(
                IRuleLicense(ruleNFT).ownerOf(tokenId) == owner,
                "RULE_LICENSE_OWNER_CHANGED"
            );
        }
    }
}
