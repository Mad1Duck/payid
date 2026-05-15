// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PayIDTypes
 * @notice Shared structs and types for PAY.ID protocol
 */
library PayIDTypes {
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
        bytes32 attestationUIDsHash;
    }
}
