---
id: contracts
title: Smart Contracts
sidebar_label: Smart Contracts
---

# Smart Contracts

PAY.ID terdiri dari 5 contract utama. Semua sudah di-deploy di Lisk Sepolia — tidak perlu deploy ulang.

---

## RuleItemERC721

**Address:** `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`

Contract ERC-721 untuk Rule NFT. Setiap rule direpresentasikan sebagai NFT dengan expiry yang terikat ke subscription owner.

```solidity
function subscribe() external payable
function createRule(bytes32 ruleHash, string calldata uri) external returns (uint256 ruleId)
function activateRule(uint256 ruleId) external returns (uint256 tokenId)
function burnExpired(uint256 tokenId) external
```

---

## CombinedRuleStorage

**Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

Registry untuk combined rule set. Satu address = satu active rule set.

```solidity
function registerCombinedRule(bytes32 ruleSetHash, address[] calldata ruleNFTs, uint256[] calldata tokenIds, uint64 version) external
function activeRuleOf(address owner) external view returns (bytes32)
function getRuleByHash(bytes32 ruleSetHash) external view returns (address owner, RuleRef[] memory rules, uint64 version)
```

---

## PayIDVerifier

**Address:** `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`

Trust anchor — memverifikasi Decision Proof dan menegakkan rules. **Semua payment harus melewati ini.**

```solidity
function verifyDecision(Decision calldata d, bytes calldata sig) external view returns (bool)
function requireAllowed(Decision calldata d, bytes calldata sig) external
```

---

## Error Reference

| Error | Contract | Penyebab |
|---|---|---|
| `RULE_LICENSE_EXPIRED` | PayIDVerifier | `ruleExpiry[tokenId]` sudah lewat |
| `RULE_AUTHORITY_NOT_TRUSTED` | PayIDVerifier | `ruleAuthority` tidak di-whitelist |
| `RULE_OWNER_MISMATCH` | PayIDVerifier | Rule bukan milik receiver |
| `NONCE_ALREADY_USED` | PayIDVerifier | Proof sudah dipakai (replay) |
| `RULE_SLOT_FULL` | RuleItemERC721 | Batas slot tercapai |
| `MAX_10_RULES` | CombinedRuleStorage | Combined set > 10 rules |
