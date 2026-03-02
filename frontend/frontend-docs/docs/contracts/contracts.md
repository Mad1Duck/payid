---
id: contracts
title: Smart Contracts
sidebar_label: Smart Contracts
---

# Smart Contracts

PAY.ID consists of 5 main contracts. All are deployed on Lisk Sepolia — no redeployment needed.

---

## RuleItemERC721

**Address:** `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`

ERC-721 contract for Rule NFTs. Every rule is represented as an NFT with an expiry tied to the subscription owner.

```
subscribe()     → activate account, 0.0001 ETH / 30 days
createRule()    → register rule definition (no NFT minted yet)
activateRule()  → mint NFT, ruleExpiry[tokenId] = subscriptionExpiry
```

```solidity
function subscribe() external payable
function createRule(bytes32 ruleHash, string calldata uri) external returns (uint256 ruleId)
function activateRule(uint256 ruleId) external returns (uint256 tokenId)
function burnExpired(uint256 tokenId) external
```

---

## CombinedRuleStorage

**Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

Registry for combined rule sets. One address = one active rule set.

```solidity
function registerCombinedRule(bytes32 ruleSetHash, address[] calldata ruleNFTs, uint256[] calldata tokenIds, uint64 version) external
function activeRuleOf(address owner) external view returns (bytes32)
function getRuleByHash(bytes32 ruleSetHash) external view returns (address owner, RuleRef[] memory rules, uint64 version)
function deactivateMyCombinedRule() external
```

- Max **10 Rule NFTs** per combined set
- One address can only have **one active rule set**

---

## PayIDVerifier

**Address:** `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`

Trust anchor — verifies Decision Proofs and enforces rules. **All payments must go through this.**

```solidity
function verifyDecision(Decision calldata d, bytes calldata sig) external view returns (bool)
function requireAllowed(Decision calldata d, bytes calldata sig) external
function setTrustedAuthority(address authority, bool trusted) external onlyOwner
```

`requireAllowed()` checks: signature validity → nonce replay → trusted authority → rule ownership → rule expiry.

```solidity
struct Decision {
  bytes32 version; bytes32 payId;
  address payer; address receiver; address asset; uint256 amount;
  bytes32 contextHash; bytes32 ruleSetHash; address ruleAuthority;
  uint64 issuedAt; uint64 expiresAt;
  bytes32 nonce;
  bool requiresAttestation;
}
```

---

## PayWithPayID

**Address:** `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`

Entry point for all payments.

```solidity
function payERC20(Decision calldata d, bytes calldata sig, bytes32[] calldata attestationUIDs) external
function payETH(Decision calldata d, bytes calldata sig, bytes32[] calldata attestationUIDs) external payable
```

---

## Error Reference

| Error | Contract | Cause |
|---|---|---|
| `RULE_LICENSE_EXPIRED` | PayIDVerifier | `ruleExpiry[tokenId]` is past |
| `RULE_AUTHORITY_NOT_TRUSTED` | PayIDVerifier | `ruleAuthority` not whitelisted |
| `RULE_OWNER_MISMATCH` | PayIDVerifier | Rule does not belong to receiver |
| `NONCE_ALREADY_USED` | PayIDVerifier | Proof already used (replay) |
| `PAYID: INVALID_PROOF` | PayIDVerifier | Invalid signature or expired proof |
| `RULE_SLOT_FULL` | RuleItemERC721 | Max rule slot reached |
| `MAX_10_RULES` | CombinedRuleStorage | Combined set > 10 rules |
| `TRANSFER_FAILED` | PayWithPayID | ERC20 transferFrom failed |
