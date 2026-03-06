// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "./AttestationVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PayWithPayID
 * @notice Deterministic deployment compatible
 *
 * Deploy flow:
 *   1. Deploy via CREATE2 → address sama di semua chain
 *   2. Call initialize(verifierAddress, attestationVerifierAddress)
 *      → verifier + attestationVerifier sudah punya address yang sama
 *        di semua chain (karena mereka juga di-deploy via CREATE2)
 *
 * Karena semua dependency (verifier, attestationVerifier) juga CREATE2-deployed
 * dengan address yang sama, initialize() akan menerima address yang sama
 * di semua chain → bytecode + storage identik.
 */
contract PayWithPayID {

    // immutable di-encode ke bytecode → bytecode beda antar chain → CREATE2 address beda
    PayIDVerifier       public verifier;
    AttestationVerifier public attestationVerifier;

    bool private _initialized;

    /* ===================== ERRORS ===================== */
    error AlreadyInitialized();
    error NotInitialized();
    error ZeroAddress();

    /* ===================== EVENTS ===================== */
    event Initialized(address indexed verifier, address indexed attestationVerifier);
    event PaymentETH(
        address indexed payer,
        address indexed receiver,
        uint256         amount,
        bytes32         payId,
        bytes32         nonce
    );
    event PaymentERC20(
        address indexed payer,
        address indexed receiver,
        address indexed asset,
        uint256         amount,
        bytes32         payId,
        bytes32         nonce
    );

    /* ===================== INITIALIZE ===================== */

    /**
     * @notice Set verifier addresses — dipanggil sekali setelah deploy
     * @param verifier_              PayIDVerifier address (sama di semua chain via CREATE2)
     * @param attestationVerifier_   AttestationVerifier address (sama di semua chain via CREATE2)
     */
    function initialize(
        address verifier_,
        address attestationVerifier_
    ) external {
        if (_initialized) revert AlreadyInitialized();
        if (verifier_ == address(0)) revert ZeroAddress();
        if (attestationVerifier_ == address(0)) revert ZeroAddress();

        _initialized        = true;
        verifier            = PayIDVerifier(verifier_);
        attestationVerifier = AttestationVerifier(attestationVerifier_);

        emit Initialized(verifier_, attestationVerifier_);
    }

    /* ===================== MODIFIERS ===================== */

    modifier onlyInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    /* ===================== PAYMENT ===================== */

    /**
     * @notice Pay with ETH
     * @param attestationUIDs  EAS UIDs — pass [] kalau requiresAttestation = false
     */
    function payETH(
        PayIDVerifier.Decision  calldata d,
        bytes                   calldata sig,
        bytes32[]               calldata attestationUIDs
    ) external payable onlyInitialized {
        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        verifier.requireAllowed(d, sig);

        require(d.asset == address(0), "ASSET_NOT_ETH");
        require(msg.value == d.amount,  "AMOUNT_MISMATCH");

        (bool ok, ) = payable(d.receiver).call{value: msg.value}("");
        require(ok, "ETH_TRANSFER_FAILED");

        emit PaymentETH(d.payer, d.receiver, d.amount, d.payId, d.nonce);
    }

    /**
     * @notice Pay with ERC20
     * @param attestationUIDs  EAS UIDs — pass [] kalau requiresAttestation = false
     */
    function payERC20(
        PayIDVerifier.Decision  calldata d,
        bytes                   calldata sig,
        bytes32[]               calldata attestationUIDs
    ) external onlyInitialized {
        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        verifier.requireAllowed(d, sig);

        require(d.asset != address(0), "ASSET_NOT_ERC20");

        bool ok = IERC20(d.asset).transferFrom(d.payer, d.receiver, d.amount);
        require(ok, "TRANSFER_FAILED");

        emit PaymentERC20(d.payer, d.receiver, d.asset, d.amount, d.payId, d.nonce);
    }

    /* ===================== VIEW ===================== */

    function isInitialized() external view returns (bool) {
        return _initialized;
    }
}
