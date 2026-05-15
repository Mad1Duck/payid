// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayIDVerifier.sol";
import "./AttestationVerifier.sol";
import "../interfaces/IAggregatorV3.sol";
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

    /* ===================== CONSTRUCTOR ===================== */

    constructor() {}

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
     * @notice Pay with native token (ETH, MATIC, A0GI, etc.)
     * @param attestationUIDs  EAS UIDs — pass [] kalau requiresAttestation = false
     */
    function payNative(
        PayIDVerifier.Decision  calldata d,
        bytes                   calldata sig,
        bytes32[]               calldata attestationUIDs
    ) external payable onlyInitialized {
        require(d.asset == address(0), "ASSET_NOT_NATIVE");
        require(msg.value == d.amount,  "AMOUNT_MISMATCH");

        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            require(keccak256(abi.encode(attestationUIDs)) == d.attestationUIDsHash, "INVALID_UID_HASH");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        verifier.requireAllowed(d, sig);

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
        require(d.asset != address(0), "ASSET_NOT_ERC20");

        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            require(keccak256(abi.encode(attestationUIDs)) == d.attestationUIDsHash, "INVALID_UID_HASH");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        verifier.requireAllowed(d, sig);

        bool ok = IERC20(d.asset).transferFrom(d.payer, d.receiver, d.amount);
        require(ok, "TRANSFER_FAILED");

        emit PaymentERC20(d.payer, d.receiver, d.asset, d.amount, d.payId, d.nonce);
    }

    /**
     * @notice Pay with ERC20 + on-chain USD oracle guard (defense-in-depth).
     *         If tokenPriceOracle != address(0) and minUsdValue > 0, the contract
     *         queries Chainlink latestRoundData and reverts if the USD value of
     *         d.amount is below minUsdValue.
     *
     * @param tokenPriceOracle Chainlink AggregatorV3 address for the token/USD feed.
     *                         Pass address(0) to skip the oracle check.
     * @param minUsdValue      Minimum USD value allowed (8 decimals, e.g. 45_00000000 = $45.00).
     *                         Pass 0 to skip the oracle check.
     * @param tokenDecimals    Token decimals (e.g. 6 for USDC, 18 for ETH).
     */
    function payERC20WithOracleGuard(
        PayIDVerifier.Decision  calldata d,
        bytes                   calldata sig,
        bytes32[]               calldata attestationUIDs,
        address                 tokenPriceOracle,
        uint256                 minUsdValue,
        uint8                   tokenDecimals
    ) external onlyInitialized {
        require(d.asset != address(0), "ASSET_NOT_ERC20");

        if (tokenPriceOracle != address(0) && minUsdValue > 0) {
            (, int256 price,,,) = IAggregatorV3(tokenPriceOracle).latestRoundData();
            require(price > 0, "INVALID_ORACLE_PRICE");

            uint256 usdValue = (d.amount * uint256(price)) / (10 ** (tokenDecimals + 8));
            require(usdValue >= minUsdValue, "BELOW_USD_MINIMUM");
        }

        if (d.requiresAttestation) {
            require(attestationUIDs.length > 0, "ATTESTATION_REQUIRED");
            require(keccak256(abi.encode(attestationUIDs)) == d.attestationUIDsHash, "INVALID_UID_HASH");
            attestationVerifier.verifyAttestationBatch(attestationUIDs, d.payer);
        }

        verifier.requireAllowed(d, sig);

        bool ok = IERC20(d.asset).transferFrom(d.payer, d.receiver, d.amount);
        require(ok, "TRANSFER_FAILED");

        emit PaymentERC20(d.payer, d.receiver, d.asset, d.amount, d.payId, d.nonce);
    }

    function isInitialized() external view returns (bool) {
        return _initialized;
    }
}
