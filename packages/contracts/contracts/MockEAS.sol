// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEAS
 * @notice Mock EAS untuk testnet yang tidak punya EAS deployed (Lisk Sepolia, dll)
 *
 * HANYA UNTUK TESTING — jangan deploy ke mainnet.
 * Semua attestation dianggap valid selama tidak direvoke.
 *
 * Di production, gunakan EAS contract asli:
 *   Ethereum Mainnet  : 0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587
 *   Base              : 0x4200000000000000000000000000000000000021
 *   Optimism          : 0x4200000000000000000000000000000000000020
 *   Arbitrar One      : 0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458
 *   Sepolia           : 0xC2679fBD37d54388Ce493F1DB75320D236e1815e
 */
contract MockEAS {

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

    mapping(bytes32 => Attestation) private _attestations;

    event Attested(
        address indexed recipient,
        address indexed attester,
        bytes32 uid,
        bytes32 indexed schema
    );

    event Revoked(
        address indexed recipient,
        address indexed attester,
        bytes32 uid,
        bytes32 indexed schema
    );

    /**
     * @notice Buat attestation baru (untuk testing)
     * @param recipient   Address yang di-attest (payer)
     * @param schema      Schema UID yang digunakan
     * @param attester    Address yang memberi attestation
     * @param expiry      Unix timestamp expiry (0 = tidak expire)
     * @param data        Arbitrary attestation data
     */
    function attest(
        address recipient,
        bytes32 schema,
        address attester,
        uint64  expiry,
        bytes   calldata data
    ) external returns (bytes32 uid) {
        uid = keccak256(
            abi.encodePacked(recipient, schema, attester, block.timestamp, data)
        );

        _attestations[uid] = Attestation({
            uid:            uid,
            schema:         schema,
            time:           uint64(block.timestamp),
            expirationTime: expiry,
            revocationTime: 0,
            refUID:         bytes32(0),
            attester:       attester,
            recipient:      recipient,
            revocable:      true,
            data:           data
        });

        emit Attested(recipient, attester, uid, schema);
    }

    /**
     * @notice Revoke attestation (untuk testing)
     */
    function revoke(bytes32 uid) external {
        Attestation storage att = _attestations[uid];
        require(att.uid != bytes32(0), "NOT_FOUND");
        require(att.attester == msg.sender, "NOT_ATTESTER");

        att.revocationTime = uint64(block.timestamp);
        emit Revoked(att.recipient, att.attester, uid, att.schema);
    }

    function getAttestation(bytes32 uid)
        external
        view
        returns (Attestation memory)
    {
        return _attestations[uid];
    }

    function isAttestationValid(bytes32 uid)
        external
        view
        returns (bool)
    {
        Attestation storage att = _attestations[uid];
        if (att.uid == bytes32(0)) return false;
        if (att.revocationTime != 0) return false;
        if (att.expirationTime != 0 && att.expirationTime <= block.timestamp) return false;
        return true;
    }
}
