---
id: client
title: "Contoh: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Contoh: Client Payment Flow

Source: `examples/simple/client.ts`

Flow **fully serverless** — tidak butuh server, tidak butuh trusted issuers. Semua berjalan di client.

---

## Kapan Pakai Client Mode

| ✅ Client Mode | ❌ Perlu Server Mode |
|---|---|
| Rule hanya butuh `tx.*` | Rule butuh `env` yang di-attest |
| Payer sign sendiri dengan wallet | State dari database |
| Tidak ada `requiresAttestation` | Butuh KYC / oracle data |

---

## Jalankan

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

### Step 1 — Load Rule Set dari Chain + IPFS

```ts
const ruleSetHash = await combined.getFunction("activeRuleOf")(RECEIVER);
if (ruleSetHash === ethers.ZeroHash) throw new Error("Receiver tidak punya active rule set");

const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

const ruleConfigs = await Promise.all(
  ruleRefs.map(async (ref) => {
    const nft = new ethers.Contract(ref.ruleNFT, ruleNFTAbi.abi, provider);
    const tokenURI = await nft.getFunction("tokenURI")(ref.tokenId);
    const url = tokenURI.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    const metadata = await fetch(url).then(r => r.json());
    return metadata.rule;
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

if (!proof) throw new Error(`Payment ditolak: ${result.reason ?? result.code}`);
```

### Step 4 — Approve ERC20

```ts
const allowance = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
if (allowance < AMOUNT) {
  await (await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT)).wait();
}
```

### Step 5 — Kirim Payment

```ts
const tx = await payContract.getFunction("payERC20").send(proof.payload, proof.signature, []);
await tx.wait();
console.log("✅ Payment success! TX:", tx.hash);
```

---

## Catatan

**Proof TTL.** Proof valid selama `ttlSeconds`. Jangan cache proof — generate baru setiap payment.
