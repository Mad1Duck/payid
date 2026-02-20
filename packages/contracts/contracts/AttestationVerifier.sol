// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AttestationVerifier (EAS-based)
 * @notice Verifies attestations via Ethereum Attestation Service (EAS)
 *         Fully serverless — no trusted issuer server needed.
 *         Client hanya perlu query EAS UID dan pass ke sini.
 *
 * EAS Deployments:
 *   Ethereum Mainnet : 0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587
 *   Base             : 0x4200000000000000000000000000000000000021
 *   Optimism         : 0x4200000000000000000000000000000000000020
 *   Arbitrum One     : 0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458
 *   Sepolia (testnet): 0xC2679fBD37d54388Ce493F1DB75320D236e1815e
 */

/* ===================== EAS INTERFACE ===================== */

interface IEAS {
    struct Attestation {
        bytes32 uid;
        bytes32 schema;
        uint64  time;
        uint64  expirationTime;
        uint64  revocationTime;
        bytes32 refUID;
        address attester;
        address recipient;
        bool    revocable;
        bytes   data;
    }

    function getAttestation(bytes32 uid)
        external
        view
        returns (Attestation memory);

    function isAttestationValid(bytes32 uid)
        external
        view
        returns (bool);
}

/* ===================== CONTRACT ===================== */

contract AttestationVerifier {

    /* ===================== ERRORS ===================== */
    error UntrustedAttester();
    error WrongSchema();
    error AttestationExpired();
    error AttestationRevoked();
    error AttestationNotForPayer();
    error AttestationNotFound();
    error ReplayAttestation();
    error LengthMismatch();
    error NotOwner();
    error ZeroAddress();

    /* ===================== STORAGE ===================== */

    IEAS    public immutable eas;

    // Schemas yang diizinkan (kamu define schema di EAS registry)
    mapping(bytes32 => bool) public trustedSchemas;

    // Attesters yang diizinkan (Worldcoin, Gitcoin, KYC provider, dll)
    mapping(address => bool) public trustedAttesters;

    // Replay protection untuk one-time attestation
    mapping(bytes32 => bool) public usedAttestations;

    address public owner;

    /* ===================== EVENTS ===================== */
    event SchemaUpdated(bytes32 indexed schemaUID, bool trusted);
    event AttesterUpdated(address indexed attester, bool trusted);
    event OwnershipTransferred(address indexed prev, address indexed next);

    /* ===================== MODIFIER ===================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /* ===================== CONSTRUCTOR ===================== */

    /**
     * @param easAddress       EAS contract address sesuai chain
     * @param initialSchemas   List schema UID yang diizinkan
     * @param initialAttesters List attester yang diizinkan (Worldcoin, Gitcoin, dll)
     */
    constructor(
        address          easAddress,
        bytes32[] memory initialSchemas,
        address[] memory initialAttesters
    ) {
        if (easAddress == address(0)) revert ZeroAddress();

        eas   = IEAS(easAddress);
        owner = msg.sender;

        for (uint256 i = 0; i < initialSchemas.length; ) {
            trustedSchemas[initialSchemas[i]] = true;
            emit SchemaUpdated(initialSchemas[i], true);
            unchecked { ++i; }
        }

        for (uint256 i = 0; i < initialAttesters.length; ) {
            trustedAttesters[initialAttesters[i]] = true;
            emit AttesterUpdated(initialAttesters[i], true);
            unchecked { ++i; }
        }
    }

    /* ===================== ADMIN ===================== */

    function setTrustedSchema(bytes32 schemaUID, bool trusted)
        external
        onlyOwner
    {
        trustedSchemas[schemaUID] = trusted;
        emit SchemaUpdated(schemaUID, trusted);
    }

    function setTrustedAttester(address attester, bool trusted)
        external
        onlyOwner
    {
        if (attester == address(0)) revert ZeroAddress();
        trustedAttesters[attester] = trusted;
        emit AttesterUpdated(attester, trusted);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /* ===================== INTERNAL VERIFY ===================== */

    /**
     * @notice Core verification — dipanggil oleh semua public verify functions
     * @param attestationUID  UID dari EAS attestation (didapat client dari EAS SDK)
     * @param payer           Address yang harus jadi recipient attestation
     */
    function _verifyEASAttestation(
        bytes32 attestationUID,
        address payer
    ) internal view {
        // 1. Fetch attestation dari EAS contract (on-chain, no server)
        IEAS.Attestation memory att = eas.getAttestation(attestationUID);

        // 2. Attestation harus exist
        if (att.uid == bytes32(0)) revert AttestationNotFound();

        // 3. Schema harus trusted
        if (!trustedSchemas[att.schema]) revert WrongSchema();

        // 4. Attester harus trusted (Worldcoin, Gitcoin, KYC provider)
        if (!trustedAttesters[att.attester]) revert UntrustedAttester();

        // 5. Recipient harus payer — attestation untuk orang yang bayar
        if (att.recipient != payer) revert AttestationNotForPayer();

        // 6. Belum expired (0 = tidak ada expiry)
        if (
            att.expirationTime != 0 &&
            att.expirationTime <= block.timestamp
        ) revert AttestationExpired();

        // 7. Belum direvoke
        if (att.revocationTime != 0) revert AttestationRevoked();

        // 8. Double-check via EAS isAttestationValid
        if (!eas.isAttestationValid(attestationUID)) revert AttestationRevoked();
    }

    /* ===================== PUBLIC VERIFY ===================== */

    /**
     * @notice Verify single EAS attestation (reusable)
     * @param attestationUID  EAS attestation UID
     * @param payer           Harus match dengan att.recipient
     */
    function verifyAttestation(
        bytes32 attestationUID,
        address payer
    ) external view {
        _verifyEASAttestation(attestationUID, payer);
    }

    /**
     * @notice Verify attestation dan mark sebagai used (one-time use)
     * @dev Cocok untuk high-value atau compliance use case
     */
    function verifyAttestationOnce(
        bytes32 attestationUID,
        address payer
    ) external {
        if (usedAttestations[attestationUID]) revert ReplayAttestation();
        _verifyEASAttestation(attestationUID, payer);
        usedAttestations[attestationUID] = true;
    }

    /**
     * @notice Verify multiple attestations sekaligus (gas optimized)
     * @dev Cocok untuk payer yang perlu multiple attestations
     *      contoh: KYC attestation + AML attestation + Accredited Investor attestation
     *
     * @param attestationUIDs  Array EAS attestation UIDs
     * @param payer            Semua attestation harus untuk payer yang sama
     */
    function verifyAttestationBatch(
        bytes32[] calldata attestationUIDs,
        address            payer
    ) external view {
        uint256 len = attestationUIDs.length;
        for (uint256 i = 0; i < len; ) {
            _verifyEASAttestation(attestationUIDs[i], payer);
            unchecked { ++i; }
        }
    }

    /* ===================== VIEW HELPERS ===================== */

    /**
     * @notice Cek apakah payer punya valid attestation untuk schema tertentu
     *         Berguna untuk client-side pre-check sebelum build transaction
     */
    function hasValidAttestation(
        bytes32 attestationUID,
        address payer
    ) external view returns (bool) {
        try this.verifyAttestation(attestationUID, payer) {
            return true;
        } catch {
            return false;
        }
    }
}
