---
id: client
title: "Contoh: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Contoh: Client Payment Flow

Source: `examples/simple/client.ts`

Flow payment **fully client-side** — tidak perlu server, tidak perlu trusted issuer. Semuanya jalan di browser atau Node.js.

---

## Kapan Pakai Client Mode

| ✅ Pakai Client Mode | ❌ Butuh Server Mode |
|---|---|
| Rules cukup cek `tx.*` (asset, jumlah, alamat) | Rules butuh KYC (`oracle.kycLevel`) |
| Payer sign dengan wallet sendiri | Rules butuh rate limit terverifikasi |
| Tidak ada `requiresAttestation` di rule | Rules butuh geoblocking (`oracle.country`) |

---

## Jalankan

```bash
bun examples/simple/client.ts
```

---

## Walkthrough Lengkap

### Setup

```ts
import { createPayID } from "payid/client";
import { ethers } from "ethers";

const provider    = new ethers.JsonRpcProvider(process.env.RPC_URL);
const payerWallet = new ethers.Wallet(process.env.SENDER_PRIVATE_KEY!, provider);

const payid = createPayID({});
await payid.ready();
```

---

### Step 1 — Load Rule Set dari Chain + IPFS

```ts
const combined    = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
const ruleSetHash = await combined.getFunction("getActiveRuleOf")(RECEIVER);

if (ruleSetHash === ethers.ZeroHash) throw new Error("Receiver tidak punya kebijakan aktif");

const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

const ruleConfigs = await Promise.all(
  ruleRefs.map(async (ref: { ruleNFT: string; tokenId: bigint }) => {
    const nft      = new ethers.Contract(ref.ruleNFT, ruleNFTAbi.abi, provider);
    const tokenURI = await nft.getFunction("tokenURI")(ref.tokenId);
    const url      = tokenURI.startsWith("ipfs://")
      ? `${process.env.PINATA_GATEWAY}/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    return (await fetch(url).then(r => r.json())).rule;
  })
);

const authorityRule = { version: version.toString(), logic: "AND" as const, rules: ruleConfigs };
```

---

### Step 2 — Build Context

```ts
const AMOUNT = 50_000_000n;  // 50 USDC (6 desimal)

const context = {
  tx: {
    sender:   payerWallet.address,
    receiver: RECEIVER,
    asset:    USDC_ADDRESS,
    amount:   AMOUNT.toString(),
    chainId:  Number(process.env.CHAIN_ID),
  },
  env: { timestamp: Math.floor(Date.now() / 1000) },
};
```

---

### Step 3 — Evaluate + Generate Proof

```ts
const blockTimestamp = Math.floor(Date.now() / 1000);

const { result, proof } = await payid.evaluateAndProve({
  context, authorityRule,
  payId:               "pay.id/merchant",
  payer:               payerWallet.address,
  receiver:            RECEIVER,
  asset:               USDC_ADDRESS,
  amount:              AMOUNT,
  signer:              payerWallet,
  verifyingContract:   process.env.PAYID_VERIFIER!,
  ruleAuthority:       COMBINED_RULE_STORAGE,
  ruleSetHashOverride: ruleSetHash,
  chainId:             Number(process.env.CHAIN_ID),
  blockTimestamp,
  ttlSeconds:          300,
});

if (result.decision === "REJECT") throw new Error(`Payment ditolak: ${result.reason ?? result.code}`);
```

---

### Step 4 — Approve ERC20

```ts
const usdc      = new ethers.Contract(USDC_ADDRESS, usdcAbi.abi, payerWallet);
const allowance = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);
if (allowance < AMOUNT) {
  await (await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT)).wait();
}
```

---

### Step 5 — Kirim Payment

```ts
const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);
const tx = await payContract.getFunction("payERC20").send(proof!.payload, proof!.signature, []);
await tx.wait();
console.log("✅ Payment success! TX:", tx.hash);
```

Untuk **payment ETH**: pakai `payETH` dan pass `value`:

```ts
await payContract.getFunction("payETH").send(proof!.payload, proof!.signature, [], { value: AMOUNT });
```
