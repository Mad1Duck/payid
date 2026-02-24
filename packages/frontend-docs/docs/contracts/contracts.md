---
id: contracts
title: Smart Contracts
sidebar_label: Smart Contracts
---

# Smart Contracts

PAY.ID terdiri dari 5 contract utama. Semua deployed di Lisk Sepolia — tidak perlu deploy ulang.

---

## RuleItemERC721

**Address:** `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`

ERC-721 contract untuk Rule NFT. Setiap rule diwakili sebagai NFT dengan expiry terikat ke subscription owner.

### Flow Utama

```
subscribe()       → aktifkan akun, bayar 0.0001 ETH / 30 hari
createRule()      → daftarkan rule definition (hash + IPFS URI)
activateRule()    → mint NFT, ruleExpiry[tokenId] = subscriptionExpiry
```

### Key Functions

```solidity
// Subscribe — aktifkan atau perpanjang subscription
function subscribe() external payable

// Buat rule definition baru (belum mint NFT)
function createRule(bytes32 ruleHash, string calldata uri)
  external returns (uint256 ruleId)

// Buat versi baru dari rule yang ada
function createRuleVersion(uint256 parentRuleId, bytes32 newHash, string calldata newUri)
  external returns (uint256 ruleId)

// Mint NFT untuk rule — expiry = subscriptionExpiry[msg.sender]
function activateRule(uint256 ruleId)
  external returns (uint256 tokenId)

// Bakar NFT yang sudah expired (siapa saja bisa panggil)
function burnExpired(uint256 tokenId) external

// Perpanjang expiry rule
function extendRuleExpiry(uint256 tokenId, uint256 newExpiry) external payable
```

### Key Storage

```solidity
mapping(address => uint256) public subscriptionExpiry;  // kapan subscription habis
mapping(uint256 => uint256) public ruleExpiry;          // kapan Rule NFT expired
mapping(uint256 => uint256) public ruleTokenId;         // ruleId → tokenId
mapping(address => uint8)   public logicalRuleCount;    // jumlah root rule per user
```

### Subscription Tiers

| Status | Max Rule Slot | Harga |
|---|---|---|
| Tanpa subscription | 1 | Gratis |
| Dengan subscription | 3 (MAX_SLOT) | 0.0001 ETH / 30 hari |

---

## CombinedRuleStorage

**Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

Registry untuk combined rule sets. Satu address = satu active rule set.

### Key Functions

```solidity
// Register rule set (sekaligus aktifkan, replace yang lama)
function registerCombinedRule(
  bytes32 ruleSetHash,
  address[] calldata ruleNFTs,
  uint256[] calldata tokenIds,
  uint64 version
) external

// Register dengan direction INBOUND / OUTBOUND
function registerCombinedRuleForDirection(
  bytes32 ruleSetHash,
  RuleDirection direction,
  address[] calldata ruleNFTs,
  uint256[] calldata tokenIds,
  uint64 version
) external

// Deactivate rule set sendiri
function deactivateMyCombinedRule() external

// Baca active rule set hash milik address
function activeRuleOf(address owner) external view returns (bytes32)

// Baca detail rule set dari hash
function getRuleByHash(bytes32 ruleSetHash)
  external view returns (address owner, RuleRef[] memory rules, uint64 version)

// Sync ownership kalau NFT berpindah tangan
function syncOwner(bytes32 ruleSetHash) external
```

### Batasan

- Max **10 Rule NFT** per combined set (`MAX_RULES`)
- Satu address hanya bisa punya **satu active rule set**
- Setiap Rule NFT hanya bisa dipakai di **satu combined set** pada satu waktu

---

## PayIDVerifier

**Address:** `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`

Trust anchor — verifikasi Decision Proof dan enforce rules. **Semua payment harus melalui ini.**

### Key Functions

```solidity
// Verifikasi proof (view only)
function verifyDecision(Decision calldata d, bytes calldata sig)
  external view returns (bool)

// Verifikasi + enforce rules + consume nonce (state change)
function requireAllowed(Decision calldata d, bytes calldata sig) external

// Admin: whitelist rule authority
function setTrustedAuthority(address authority, bool trusted) external onlyOwner
```

### Apa yang Di-check `requireAllowed()`

```
1. verifyDecision() — cek signature, waktu, amount
2. usedNonce — replay protection
3. trustedAuthorities[d.ruleAuthority] — harus di-whitelist
4. IRuleAuthority.getRuleByHash() — baca rule set dari authority
5. ruleOwner == d.receiver — rule harus milik receiver
6. ruleExpiry[tokenId] >= now — cek expiry tiap Rule NFT
7. ownerOf(tokenId) == ruleOwner — cek ownership NFT
```

### Decision Struct

```solidity
struct Decision {
  bytes32 version;
  bytes32 payId;
  address payer;
  address receiver;
  address asset;
  uint256 amount;
  bytes32 contextHash;
  bytes32 ruleSetHash;
  address ruleAuthority;   // harus di-whitelist
  uint64  issuedAt;
  uint64  expiresAt;       // max 60 detik setelah issuedAt
  bytes32 nonce;           // random, sekali pakai
  bool    requiresAttestation;
}
```

---

## PayWithPayID

**Address:** `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`

Entry point untuk semua payment. Integrasikan contract kamu ke sini, atau pakai langsung.

### Key Functions

```solidity
// Bayar dengan ERC20
function payERC20(
  PayIDVerifier.Decision calldata d,
  bytes calldata sig,
  bytes32[] calldata attestationUIDs  // [] kalau tidak butuh KYC
) external

// Bayar dengan ETH
function payETH(
  PayIDVerifier.Decision calldata d,
  bytes calldata sig,
  bytes32[] calldata attestationUIDs
) external payable
```

### Flow Internal

```
payERC20()
  ├── AttestationVerifier.verifyAttestationBatch() [kalau requiresAttestation]
  ├── PayIDVerifier.requireAllowed()               [verify + consume nonce]
  └── IERC20.transferFrom(payer, receiver, amount) [transfer]
```

---

## AttestationVerifier

**Address:** `0x0165878A594ca255338adfa4d48449f69242Eb8F`

Verifikasi EAS (Ethereum Attestation Service) attestation UIDs on-chain. Dipakai kalau rule punya `requiresAttestation: true`.

---

## Error Reference

| Error | Contract | Penyebab |
|---|---|---|
| `RULE_LICENSE_EXPIRED` | PayIDVerifier | `ruleExpiry[tokenId]` sudah lewat |
| `RULE_AUTHORITY_NOT_TRUSTED` | PayIDVerifier | `ruleAuthority` tidak di-whitelist |
| `RULE_OWNER_MISMATCH` | PayIDVerifier | Rule bukan milik receiver |
| `NONCE_ALREADY_USED` | PayIDVerifier | Proof sudah dipakai (replay) |
| `PAYID: INVALID_PROOF` | PayIDVerifier | Signature invalid atau proof expired |
| `RULE_SLOT_FULL` | RuleItemERC721 | Sudah mencapai max rule slot |
| `MAX_10_RULES` | CombinedRuleStorage | Combined set > 10 rule |
| `RULE_NFT_ALREADY_USED` | CombinedRuleStorage | NFT sudah ada di combined set lain |
| `TRANSFER_FAILED` | PayWithPayID | ERC20 transferFrom gagal (allowance?) |
| `ATTESTATION_REQUIRED` | PayWithPayID | attestationUIDs kosong tapi rule butuh KYC |
