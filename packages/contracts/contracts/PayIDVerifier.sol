// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IRuleLicense {
    function ruleExpiry(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IRuleAuthority {
    struct RuleRef {
        address ruleNFT;
        uint256 tokenId;
    }

    function getRuleByHash(bytes32 ruleSetHash)
        external
        view
        returns (
            address    owner,
            RuleRef[]  memory ruleRefs,
            uint64     version
        );
}

/* ===================== CONTRACT ===================== */
contract PayIDVerifier is EIP712 {
    using ECDSA for bytes32;

    /* ===================== CONSTANTS ===================== */

    string public constant SIGNING_DOMAIN     = "PAY.ID Decision";
    string public constant SIGNATURE_VERSION  = "2";

    bytes32 public constant DECISION_TYPEHASH =
        keccak256(
            "Decision(bytes32 version,bytes32 payId,address payer,address receiver,address asset,uint256 amount,bytes32 contextHash,bytes32 ruleSetHash,address ruleAuthority,uint64 issuedAt,uint64 expiresAt,bytes32 nonce,bool requiresAttestation)"
        );

    /* ===================== STORAGE ===================== */

    // Replay protection: payer → nonce → used
    mapping(address => mapping(bytes32 => bool)) public usedNonce;

    // FIX: whitelist of trusted RuleAuthority contracts
    mapping(address => bool) public trustedAuthorities;

    address public owner;

    /* ===================== EVENTS ===================== */

    event AuthorityUpdated(address indexed authority, bool trusted);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /* ===================== MODIFIERS ===================== */

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    /* ===================== CONSTRUCTOR ===================== */

    constructor(
        string  memory signingDomain,
        string  memory signatureVersion
    ) EIP712(signingDomain, signatureVersion) {
        owner = msg.sender;
    }

    /* ===================== ADMIN ===================== */

    /**
     * @notice Whitelist or remove a RuleAuthority contract
     * @dev FIX: tanpa registry ini, d.ruleAuthority bisa diisi contract jahat
     *      yang return owner = d.receiver tapi ruleRefs = [] atau data palsu
     */
    function setTrustedAuthority(address authority, bool trusted)
        external
        onlyOwner
    {
        require(authority != address(0), "ZERO_ADDRESS");
        trustedAuthorities[authority] = trusted;
        emit AuthorityUpdated(authority, trusted);
    }

    /**
     * @notice Batch whitelist authorities
     */
    function setTrustedAuthorities(
        address[] calldata authorities,
        bool[]    calldata trusted
    ) external onlyOwner {
        require(authorities.length == trusted.length, "LENGTH_MISMATCH");
        for (uint256 i = 0; i < authorities.length; ) {
            require(authorities[i] != address(0), "ZERO_ADDRESS");
            trustedAuthorities[authorities[i]] = trusted[i];
            emit AuthorityUpdated(authorities[i], trusted[i]);
            unchecked { ++i; }
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
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

        address ruleAuthority;

        uint64 issuedAt;
        uint64 expiresAt;

        bytes32 nonce;
        bool    requiresAttestation;
    }

    /* ===================== HASHING ===================== */

    function hashDecision(Decision calldata d) public view returns (bytes32) {
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
                    d.ruleAuthority,
                    d.issuedAt,
                    d.expiresAt,
                    d.nonce,
                    d.requiresAttestation
                )
            )
        );
    }

    /* ===================== VERIFY ===================== */

    function verifyDecision(
        Decision calldata d,
        bytes    calldata sig
    ) public view returns (bool) {
        if (block.timestamp > d.expiresAt)  return false;
        if (d.issuedAt > block.timestamp)   return false;
        if (d.amount == 0)                  return false;
        if (d.receiver == address(0))       return false;

        address recovered = hashDecision(d).recover(sig);
        return recovered == d.payer;
    }

    /* ===================== ENFORCEMENT ===================== */

    function requireAllowed(
        Decision calldata d,
        bytes    calldata sig
    ) external {
        // 1. Cryptographic proof
        require(verifyDecision(d, sig), "PAYID: INVALID_PROOF");

        // 2. Nonce replay protection
        require(!usedNonce[d.payer][d.nonce], "NONCE_ALREADY_USED");
        usedNonce[d.payer][d.nonce] = true;

        // 3. Optional rule enforcement
        if (d.ruleAuthority != address(0)) {
            require(
                d.ruleAuthority.code.length > 0,
                "RULE_AUTHORITY_NOT_CONTRACT"
            );

            require(
                trustedAuthorities[d.ruleAuthority],
                "RULE_AUTHORITY_NOT_TRUSTED"
            );

            (
                address ruleOwner,
                IRuleAuthority.RuleRef[] memory ruleRefs,
                /* uint64 version */
            ) = IRuleAuthority(d.ruleAuthority).getRuleByHash(d.ruleSetHash);

            // Rule set harus dimiliki oleh receiver (bukan payer)
            require(ruleOwner == d.receiver, "RULE_OWNER_MISMATCH");

            // Validate setiap license NFT
            for (uint256 i = 0; i < ruleRefs.length; ) {
                IRuleLicense license = IRuleLicense(ruleRefs[i].ruleNFT);
                uint256      tokenId = ruleRefs[i].tokenId;

                // License belum expired
                require(
                    license.ruleExpiry(tokenId) >= block.timestamp,
                    "RULE_LICENSE_EXPIRED"
                );

                // License masih dimiliki rule owner
                require(
                    license.ownerOf(tokenId) == ruleOwner,
                    "RULE_LICENSE_OWNER_CHANGED"
                );

                unchecked { ++i; }
            }
        }
    }
}
