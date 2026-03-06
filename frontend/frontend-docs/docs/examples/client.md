---
id: client
title: "Example: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Example: Client Payment Flow

Source: `examples/simple/client.ts`

A **fully client-side** payment flow — no server, no trusted issuers needed. Everything runs in the browser or Node.js. This is the simplest way to integrate PAY.ID.

---

## When to Use Client Mode

| ✅ Use Client Mode | ❌ Need Server Mode Instead |
|---|---|
| Rules only check `tx.*` (asset, amount, addresses) | Rules need KYC (`oracle.kycLevel`) |
| Payer signs with their own wallet | Rules need verified rate limits (`state.spentToday`) |
| No `requiresAttestation` in rule | Rules need geoblocking (`oracle.country`) |
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

const provider    = new ethers.JsonRpcProvider(process.env.RPC_URL);
const payerWallet = new ethers.Wallet(process.env.SENDER_PRIVATE_KEY!, provider);

const payid = createPayID({});
await payid.ready();  // wait for WASM to load
```

`createPayID({})` initializes the SDK in client mode with no trusted issuers.

---

### Step 1 — Load Rule Set from Chain + IPFS

Fetch the merchant's active payment rules:

```ts
import combinedAbi from "../../packages/contracts/artifacts/contracts/CombinedRuleStorage.sol/CombinedRuleStorage.json";
import ruleNFTAbi  from "../../packages/contracts/artifacts/contracts/RuleItemERC721.sol/RuleItemERC721.json";

const COMBINED_RULE_STORAGE = process.env.COMBINED_RULE_STORAGE!;
const RECEIVER              = process.env.RECIVER_ADDRESS!;
const IPFS_GATEWAY          = process.env.PINATA_GATEWAY!;

const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);

// Get the active rule set hash for this receiver
const ruleSetHash = await combined.getFunction("getActiveRuleOf")(RECEIVER);
if (ruleSetHash === ethers.ZeroHash) {
  throw new Error("Receiver has no active rule set — all payments allowed");
}

// Get rule NFT references
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

// Fetch each rule JSON from IPFS
const ruleConfigs = await Promise.all(
  ruleRefs.map(async (ref: { ruleNFT: string; tokenId: bigint }) => {
    const nft      = new ethers.Contract(ref.ruleNFT, ruleNFTAbi.abi, provider);
    const tokenURI = await nft.getFunction("tokenURI")(ref.tokenId);
    const url      = tokenURI.startsWith("ipfs://")
      ? `${IPFS_GATEWAY}/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    const metadata = await fetch(url).then(r => r.json());
    return metadata.rule;
  })
);

const authorityRule = {
  version: version.toString(),
  logic:   "AND" as const,
  rules:   ruleConfigs,
};
```

---

### Step 2 — Build Context

Describe the payment in full detail:

```ts
const AMOUNT = 50_000_000n;  // 50 USDC (6 decimals)

const context = {
  tx: {
    sender:   payerWallet.address,
    receiver: RECEIVER,
    asset:    USDC_ADDRESS,          // token address
    amount:   AMOUNT.toString(),
    chainId:  Number(process.env.CHAIN_ID),
  },
  env: {
    timestamp: Math.floor(Date.now() / 1000),
  },
};
```

:::tip asset field
Pass the token **address** (e.g. `"0xa0b8..."`) in `tx.asset`. Write your rules using the same address format. For ETH use the zero address `"0x0000000000000000000000000000000000000000"`.
:::

---

### Step 3 — Evaluate + Generate Proof

```ts
const blockTimestamp = Math.floor(Date.now() / 1000);

const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId:              "pay.id/merchant",
  payer:              payerWallet.address,
  receiver:           RECEIVER,
  asset:              USDC_ADDRESS,
  amount:             AMOUNT,
  signer:             payerWallet,
  verifyingContract:  process.env.PAYID_VERIFIER!,
  ruleAuthority:      COMBINED_RULE_STORAGE,
  ruleSetHashOverride: ruleSetHash,   // pass exact on-chain hash to avoid mismatch
  chainId:            Number(process.env.CHAIN_ID),
  blockTimestamp,
  ttlSeconds:         300,            // proof valid for 5 minutes
});

if (result.decision === "REJECT") {
  throw new Error(`Payment rejected: ${result.reason ?? result.code}`);
}

console.log("Decision:", result.decision);  // "ALLOW"
```

**What happens inside `evaluateAndProve`:**
1. Evaluates `context` against `authorityRule` using the WASM engine
2. Builds a `DecisionProof` payload with all payment fields
3. Payer's wallet signs the payload via EIP-712
4. Returns `{ result, proof }`

---

### Step 4 — Approve ERC20 Spending

The contract needs permission to move the payer's tokens:

```ts
import usdcAbi from "../../packages/contracts/artifacts/contracts/MockUSDC.sol/MockUSDC.json";

const usdc      = new ethers.Contract(USDC_ADDRESS, usdcAbi.abi, payerWallet);
const PAY_CONTRACT = process.env.PAY_WITH_PAYID!;

const allowance = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
if (allowance < AMOUNT) {
  const tx = await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT);
  await tx.wait();
  console.log("USDC approved ✅");
}
```

---

### Step 5 — Send Payment

```ts
import PayWithPayIDAbi from "../../packages/contracts/artifacts/contracts/PayWithPayID.sol/PayWithPayID.json";

const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);

const tx = await payContract.getFunction("payERC20").send(
  proof!.payload,    // DecisionProof payload
  proof!.signature,  // EIP-712 signature from payer
  [],                // attestationUIDs — empty for client mode
);
await tx.wait();

console.log("✅ Payment success! TX:", tx.hash);
```

For **ETH payments**, use `payETH` and pass `value`:

```ts
const tx = await payContract.getFunction("payETH").send(
  proof!.payload,
  proof!.signature,
  [],
  { value: AMOUNT },  // ETH amount
);
```

---

## Complete Flow Summary

```
1. getActiveRuleOf(receiver)       → get ruleSetHash from chain
2. getRuleByHash(ruleSetHash)      → get rule NFT references
3. tokenURI(tokenId) + IPFS fetch  → get each rule JSON config
4. buildContext(...)               → describe the payment
5. evaluateAndProve(...)           → evaluate rules + sign proof
6. approve(PAY_CONTRACT, amount)   → ERC20 allowance (skip for ETH)
7. payERC20(payload, sig, [])      → submit to blockchain
   payETH(payload, sig, [])        → for native ETH
```

---

## Notes

**Always pass `blockTimestamp`.** This is required for proof expiry calculation. Use `Math.floor(Date.now() / 1000)` — keep it close to the actual block time.

**Use `ruleSetHashOverride`.** Pass the hash you fetched in step 1. This prevents the SDK from re-computing the hash and potentially mismatching the on-chain value.

**Proof TTL is 5 minutes by default.** Never cache a proof — generate a fresh one for every payment attempt.

**ZeroHash means no policy.** If `getActiveRuleOf()` returns `ZeroHash`, the receiver has no active rules and all payments pass through.
