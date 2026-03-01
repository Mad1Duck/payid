---
id: client
title: "Example: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Example: Client Payment Flow

Source: `examples/simple/client.ts`

A **fully serverless** flow — no server, no trusted issuers needed. Everything runs on the client.

---

## When to Use Client Mode

| ✅ Client Mode | ❌ Need Server Mode |
|---|---|
| Rules only need `tx.*` | Rules need attested `env` |
| Payer signs with their own wallet | State from database |
| No `requiresAttestation` | KYC / oracle data required |

---

## Run

```bash
bun examples/simple/client.ts
```

---

## Walkthrough

### Setup

```ts
import { createPayID } from "payid/client";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
const payid = createPayID({});
```

### Step 1 — Load Rule Set from Chain + IPFS

```ts
const ruleSetHash = await combined.getFunction("activeRuleOf")(RECEIVER);
if (ruleSetHash === ethers.ZeroHash) throw new Error("Receiver has no active rule set");

const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

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

const authorityRule = { version: version.toString(), logic: "AND" as const, rules: ruleConfigs };
```

### Step 2 — Build Context V1

```ts
const AMOUNT = 6_000_000n;
const context = {
  tx: { sender: payerWallet.address, receiver: RECEIVER, asset: "USDC", amount: AMOUNT.toString(), chainId: 4202 },
  payId: { id: "pay.id/merchant", owner: RECEIVER },
  env: { timestamp: Math.floor(Date.now() / 1000) },
  state: { spentTodayPlusTx: AMOUNT.toString(), spentThisMonthPlusTx: "18000000", dailyLimit: "500000000" },
};
```

### Step 3 — Evaluate + Generate Proof

```ts
const { result, proof } = await payid.evaluateAndProve({
  context, authorityRule,
  payId: "pay.id/merchant",
  payer: payerWallet.address, receiver: RECEIVER,
  asset: USDC, amount: AMOUNT,
  signer: payerWallet, ttlSeconds: 300,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

if (!proof) throw new Error(`Payment rejected: ${result.reason ?? result.code}`);
```

### Step 4 — Approve ERC20

```ts
const allowance = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
if (allowance < AMOUNT) {
  await (await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT)).wait();
}
```

### Step 5 — Send Payment

```ts
const tx = await payContract.getFunction("payERC20").send(proof.payload, proof.signature, []);
await tx.wait();
console.log("✅ Payment success! TX:", tx.hash);
```

---

## Notes

**Proof TTL.** The proof is valid for `ttlSeconds`. Never cache a proof — generate a new one for every payment.
