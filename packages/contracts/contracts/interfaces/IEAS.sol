// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEAS
 * @notice Interface for Ethereum Attestation Service (EAS)
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
