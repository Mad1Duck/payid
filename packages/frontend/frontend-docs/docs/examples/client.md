---
id: client
title: "Example: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Example: Client Payment Flow

Source: `examples/simple/client.ts`

A **fully serverless** payment flow — no server, no trusted issuers needed. Everything runs on the client side. This is the simplest way to integrate PAY.ID.

---

## When to Use Client Mode

| ✅ Use Client Mode | ❌ Need Server Mode Instead |
|---|---|
| Rules only check `tx.*` (asset, amount, addresses) | Rules need KYC (`oracle.kycLevel`) |
| Payer signs with their own wallet | Rules need rate limits (`state.spentToday`) |
| No `requiresAttestation` in rule config | Rules need geoblocking (`oracle.country`) |
| Simple merchant payment flow | Compliance rules from your backend |

---

## Run

```bash
bun examples/simple/client.ts
```

---

## Full Walkthrough

### Setup — Initialize the SDK

```ts
import { createPayID } from "payid/client";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
const payid = createPayID({});
```

`createPayID({})` initializes the SDK. The empty config `{}` means client mode with no trusted issuers.

---

### Step 1 — Load Rule Set from Chain + IPFS

Fetch the merchant's current payment rules:

```ts
const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);

// Get the rule set hash for this receiver
const ruleSetHash = await combined.getFunction("activeRuleOf")(RECEIVER);
if (ruleSetHash === ethers.ZeroHash) {
  throw new Error("Receiver has no active rule set");
}

// Get rule NFT references
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

// Fetch each rule JSON from IPFS
const ruleConfigs = await Promise.all(
  ruleRefs.map(async (ref) => {
    const nft = new ethers.Contract(ref.ruleNFT, ruleNFTAbi.abi, provider);
    const tokenURI = await nft.getFunction("tokenURI")(ref.tokenId);
    const url = tokenURI.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    return (await fetch(url).then(r => r.json())).rule;
  })
);

// Combine them into an authority rule
const authorityRule = {
  version: version.toString(),
  logic: "AND" as const,
  rules: ruleConfigs,
};
```

---

### Step 2 — Build Context V1

Describe the payment in full detail:

```ts
const AMOUNT = 50_000_000n; // 50 USDC (6 decimals)

const context = {
  tx: {
    sender: payerWallet.address,
    receiver: RECEIVER,
    asset: "USDC",
    amount: AMOUNT.toString(),
    chainId: 4202,
  },
  payId: {
    id: "pay.id/merchant",
    owner: RECEIVER,
  },
  env: {
    timestamp: Math.floor(Date.now() / 1000),
  },
  state: {
    // Include this tx in the daily total so daily limit rules work correctly
    spentTodayPlusTx: AMOUNT.toString(),
    spentThisMonthPlusTx: AMOUNT.toString(),
    dailyLimit: "500000000", // 500 USDC daily limit
  },
};
```

:::tip State Fields
The `state.*` fields are provided by the payer in client mode. For rules that actually enforce daily limits with server-side verification, use Server Mode.
:::

---

### Step 3 — Evaluate + Generate Proof

This is the core PAY.ID operation:

```ts
const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: "pay.id/merchant",
  payer: payerWallet.address,
  receiver: RECEIVER,
  asset: USDC_ADDRESS,
  amount: AMOUNT,
  signer: payerWallet,         // Payer's wallet signs the proof
  ttlSeconds: 300,             // Proof valid for 5 minutes
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

if (result.decision === "REJECT") {
  throw new Error(`Payment rejected: ${result.reason ?? result.code}`);
}

console.log("Decision:", result.decision); // "ALLOW"
console.log("Proof generated ✅");
```

**What happens inside `evaluateAndProve`:**
1. Evaluates `context` against `authorityRule` using the WASM rule engine
2. If ALLOW, builds a `DecisionProof` payload
3. Payer's wallet signs the payload with EIP-712
4. Returns `{ result, proof }`

---

### Step 4 — Approve ERC20 Spending

The smart contract needs permission to move the payer's USDC:

```ts
const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi.abi, payerWallet);
const allowance = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);

if (allowance < AMOUNT) {
  console.log("Approving USDC...");
  const approveTx = await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT);
  await approveTx.wait();
  console.log("Approved ✅");
}
```

---

### Step 5 — Send Payment

Submit the payment with the proof:

```ts
const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);

const tx = await payContract.getFunction("payERC20").send(
  proof.payload,    // The decision proof payload
  proof.signature,  // EIP-712 signature from payer
  []                // Optional ERC-4337 user ops (empty for now)
);

await tx.wait();
console.log("✅ Payment success! TX:", tx.hash);
```

---

## Complete Flow Summary

```
1. getActiveRuleOf(receiver)     → get ruleSetHash from chain
2. getRuleByHash(ruleSetHash)    → get rule NFT references
3. fetch each tokenURI from IPFS → get rule JSON configs
4. buildContext(...)             → describe the payment
5. evaluateAndProve(...)         → evaluate rules + sign proof
6. approve(PAY_CONTRACT, amount) → allow contract to spend tokens
7. payERC20(payload, sig, [])    → submit to blockchain
```

---

## Notes

**Proof TTL.** The proof is valid for `ttlSeconds` seconds (default: 300 = 5 minutes). Never cache a proof — generate a new one for every payment.

**Rule hash must match.** The `ruleSetHash` in the proof must match the receiver's active rule on-chain. The SDK handles this automatically via `ruleSetHashOverride`.

**ZeroHash means no policy.** If `activeRuleOf()` returns `0x000...000`, the receiver has no active rules — payments go through without restriction.
