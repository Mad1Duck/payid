// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AttestationVerifier (EAS-based)
 * @notice Deterministic deployment compatible — pakai initialize() bukan constructor args
 *
 * Deploy via CREATE2 proxy (sama di semua chain):
 *   1. Deploy kontrak ini dengan salt yang sama → address sama
 *   2. Call initialize(easAddress, schemas, attesters) per chain
 *
 * EAS Deployments:
 *   Ethereum Mainnet : 0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587
 *   Base             : 0x4200000000000000000000000000000000000021
 *   Optimism         : 0x4200000000000000000000000000000000000020
 *   Arbitrum One     : 0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458
 *   Sepolia (testnet): 0xC2679fBD37d54388Ce493F1DB75320D236e1815e
 */

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

    function getAttestation(bytes32 uid) external view returns (Attestation memory);
    function isAttestationValid(bytes32 uid) external view returns (bool);
}

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
    error AlreadyInitialized();
    error NotInitialized();

    /* ===================== STORAGE ===================== */

    IEAS public eas;

    mapping(bytes32 => bool) public trustedSchemas;
    mapping(address => bool) public trustedAttesters;
    mapping(bytes32 => bool) public usedAttestations;

    address public owner;

    bool private _initialized;

    /* ===================== EVENTS ===================== */
    event Initialized(address indexed easAddress);
    event SchemaUpdated(bytes32 indexed schemaUID, bool trusted);
    event AttesterUpdated(address indexed attester, bool trusted);
    event OwnershipTransferred(address indexed prev, address indexed next);

    /* ===================== MODIFIER ===================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    /* ===================== INITIALIZE ===================== */

    function initialize(
        address          easAddress,
        bytes32[] memory initialSchemas,
        address[] memory initialAttesters
    ) external {
        if (_initialized) revert AlreadyInitialized();
        if (easAddress == address(0)) revert ZeroAddress();

        _initialized = true;
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

        emit Initialized(easAddress);
    }

    /* ===================== ADMIN ===================== */

    function setTrustedSchema(bytes32 schemaUID, bool trusted)
        external
        onlyOwner
        onlyInitialized
    {
        trustedSchemas[schemaUID] = trusted;
        emit SchemaUpdated(schemaUID, trusted);
    }

    function setTrustedAttester(address attester, bool trusted)
        external
        onlyOwner
        onlyInitialized
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

    function _verifyEASAttestation(
        bytes32 attestationUID,
        address payer
    ) internal view onlyInitialized {
        IEAS.Attestation memory att = eas.getAttestation(attestationUID);

        if (att.uid == bytes32(0))             revert AttestationNotFound();
        if (!trustedSchemas[att.schema])       revert WrongSchema();
        if (!trustedAttesters[att.attester])   revert UntrustedAttester();
        if (att.recipient != payer)            revert AttestationNotForPayer();
        if (
            att.expirationTime != 0 &&
            att.expirationTime <= block.timestamp
        )                                      revert AttestationExpired();
        if (att.revocationTime != 0)           revert AttestationRevoked();
        if (!eas.isAttestationValid(attestationUID)) revert AttestationRevoked();
    }

    /* ===================== PUBLIC VERIFY ===================== */

    function verifyAttestation(bytes32 attestationUID, address payer)
        external
        view
    {
        _verifyEASAttestation(attestationUID, payer);
    }

    /**
     * @notice Verify a single attestation and mark it as used (anti-replay).
     */
    function verifyAttestationOnce(bytes32 attestationUID, address payer)
        external
    {
        if (usedAttestations[attestationUID]) revert ReplayAttestation();
        _verifyEASAttestation(attestationUID, payer);
        usedAttestations[attestationUID] = true;
    }

    /**
     * @notice Verify multiple attestations (read-only, replay allowed).
     * @dev Gunakan ini jika attestation UIDs bisa dipakai berkali-kali.
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

    /**
     * @notice Verify multiple attestations dan mark semua sebagai used (anti-replay).
     * @dev FIX: Fungsi ini tidak ada sebelumnya. verifyAttestationBatch tidak
     *      mencegah replay — attestation UIDs yang sama bisa di-pass berulang
     *      ke payETH/payERC20. Gunakan fungsi ini jika attestation UIDs
     *      seharusnya one-time use per transaksi.
     *
     *      Checks-effects pattern: semua check dulu sebelum write state,
     *      untuk mencegah partial-replay pada batch yang gagal di tengah.
     */
    function verifyAttestationBatchOnce(
        bytes32[] calldata attestationUIDs,
        address            payer
    ) external {
        uint256 len = attestationUIDs.length;

        for (uint256 i = 0; i < len; ) {
            if (usedAttestations[attestationUIDs[i]]) revert ReplayAttestation();
            _verifyEASAttestation(attestationUIDs[i], payer);
            unchecked { ++i; }
        }

        for (uint256 i = 0; i < len; ) {
            usedAttestations[attestationUIDs[i]] = true;
            unchecked { ++i; }
        }
    }

    /* ===================== VIEW HELPERS ===================== */

    function hasValidAttestation(bytes32 attestationUID, address payer)
        external
        view
        returns (bool)
    {
        try this.verifyAttestation(attestationUID, payer) {
            return true;
        } catch {
            return false;
        }
    }

    function isInitialized() external view returns (bool) {
        return _initialized;
    }
}
