// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Roles
 * @notice Shared role identifiers for PAY.ID protocol RBAC.
 *         Import this library to avoid magic strings across contracts.
 */
library Roles {
    bytes32 internal constant DEFAULT_ADMIN = 0x00;
    bytes32 internal constant ADMIN         = keccak256("ADMIN_ROLE");
    bytes32 internal constant PAUSER        = keccak256("PAUSER_ROLE");
    bytes32 internal constant REGISTRAR     = keccak256("REGISTRAR_ROLE");
    bytes32 internal constant SENTINEL       = keccak256("SENTINEL_ROLE");
    bytes32 internal constant ENGINE          = keccak256("ENGINE_ROLE");
}
