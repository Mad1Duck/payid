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

/**
 * @title PayIDVerifier
 * @notice Deterministic deployment compatible
 *
 * CATATAN EIP712 + CREATE2:
 *   EIP712 domain separator include chainId — ini by design agar signature
 *   tidak bisa di-replay antar chain. Address contract tetap sama di semua
 *   chain (via CREATE2), tapi domain separator akan berbeda per chain.
 *   Ini CORRECT behavior untuk cross-chain deploy.
 *
 * Deploy flow:
 *   1. Deploy via CREATE2 → address sama di semua chain
 *   2. Call initialize(owner) per chain
 *   3. Call setTrustedAuthority() untuk whitelist RuleAuthority per chain
 *
 * Trusted Authority:
 *   Selain dipakai untuk whitelist RuleAuthority (on-chain rule registry),
 *   trustedAuthorities juga dipakai di verifyDecision() untuk memvalidasi
 *   signer Decision Proof. Ini memungkinkan:
 *     - Channel A: receiver di-whitelist, sign proof atas nama payer
 *     - Channel B: server wallet di-whitelist, sign proof server-side
 *     - Legacy:    payer sign sendiri (selalu valid, tanpa whitelist)
 */
contract PayIDVerifier is EIP712 {
    using ECDSA for bytes32;

    /* ===================== CONSTANTS ===================== */

    string public constant SIGNING_DOMAIN    = "PAY.ID Decision";
    string public constant SIGNATURE_VERSION = "2";

    bytes32 public constant DECISION_TYPEHASH =
        keccak256(
            "Decision(bytes32 version,bytes32 payId,address payer,address receiver,address asset,uint256 amount,bytes32 contextHash,bytes32 ruleSetHash,address ruleAuthority,uint64 issuedAt,uint64 expiresAt,bytes32 nonce,bool requiresAttestation)"
        );

    /* ===================== STORAGE ===================== */

    mapping(address => mapping(bytes32 => bool)) public usedNonce;
    mapping(address => bool) public trustedAuthorities;

    address public owner;
    bool    private _initialized;

    /* ===================== ERRORS ===================== */
    error AlreadyInitialized();
    error NotInitialized();
    error NotOwner();
    error ZeroAddress();

    /* ===================== EVENTS ===================== */
    event Initialized(address indexed owner);
    event AuthorityUpdated(address indexed authority, bool trusted);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /* ===================== MODIFIERS ===================== */

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    /* ===================== CONSTRUCTOR ===================== */

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    /* ===================== INITIALIZE ===================== */

    function initialize(address initialOwner) external {
        if (_initialized) revert AlreadyInitialized();
        if (initialOwner == address(0)) revert ZeroAddress();

        _initialized = true;
        owner = initialOwner;

        emit Initialized(initialOwner);
    }

    /* ===================== ADMIN ===================== */

    function setTrustedAuthority(address authority, bool trusted)
        external
        onlyOwner
    {
        require(authority != address(0), "ZERO_ADDRESS");
        trustedAuthorities[authority] = trusted;
        emit AuthorityUpdated(authority, trusted);
    }

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
        if (block.timestamp > d.expiresAt) return false;
        if (d.issuedAt > block.timestamp)  return false;
        if (d.amount == 0)                 return false;
        if (d.receiver == address(0))      return false;

        address recovered = hashDecision(d).recover(sig);

        // Signer valid jika:
        //   1. payer sign sendiri (legacy / selalu backward-compatible)
        //   2. trusted authority sign atas nama payer
        //      Channel A: receiver di-whitelist via setTrustedAuthority()
        //      Channel B: server wallet di-whitelist
        return recovered == d.payer || trustedAuthorities[recovered];
    }

    /* ===================== ENFORCEMENT ===================== */

    function requireAllowed(
        Decision calldata d,
        bytes    calldata sig
    ) external {
        require(verifyDecision(d, sig), "PAYID: INVALID_PROOF");

        require(!usedNonce[d.payer][d.nonce], "NONCE_ALREADY_USED");
        usedNonce[d.payer][d.nonce] = true;

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

            require(ruleOwner == d.receiver, "RULE_OWNER_MISMATCH");

            for (uint256 i = 0; i < ruleRefs.length; ) {
                IRuleLicense license = IRuleLicense(ruleRefs[i].ruleNFT);
                uint256      tokenId = ruleRefs[i].tokenId;

                require(
                    license.ruleExpiry(tokenId) >= block.timestamp,
                    "RULE_LICENSE_EXPIRED"
                );
                require(
                    license.ownerOf(tokenId) == ruleOwner,
                    "RULE_LICENSE_OWNER_CHANGED"
                );

                unchecked { ++i; }
            }
        }
    }

    /* ===================== VIEW ===================== */

    function isInitialized() external view returns (bool) {
        return _initialized;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
