---
id: client
title: "Example: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Example: Client Payment Flow

Source: `examples/simple/client.ts`

Flow **fully serverless** — tidak butuh server, tidak butuh trusted issuers. Semua berjalan di client (browser/mobile/Node.js).

---

## Kapan Pakai Client Mode

| ✅ Client Mode | ❌ Perlu Server Mode |
|---|---|
| Rule hanya butuh `tx.*` | Rule butuh `env` yang di-attest |
| Rule butuh `env.timestamp` dari client | State (spent tracking) dari database |
| Tidak ada `requiresAttestation` | Rule butuh `oracle` atau `risk` data |
| Payer sign sendiri dengan wallet | Butuh KYC attestation |

---

## Jalankan

```bash
bun examples/simple/client.ts
```

---

## Walkthrough Lengkap

### Setup

```ts
import { createPayID } from "payid";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

// Load WASM dari file — di browser: await fetch("/rule_engine.wasm")
const wasm = new Uint8Array(
  fs.readFileSync(path.join(__dirname, "../rule_engine.wasm"))
);

// Client mode: tidak ada trustedIssuers
const payid = createPayID({ wasm });
```

### Step 1 — Load Rule Set dari Chain + IPFS

```ts
// Baca active rule set hash milik receiver
const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);
const ruleSetHash = await combined.getFunction("activeRuleOf")(RECEIVER);

if (ruleSetHash === ethers.ZeroHash) {
  throw new Error("Receiver tidak punya active rule set");
}

const [owner, ruleRefs, version] =
  await combined.getFunction("getRuleByHash")(ruleSetHash);

// Fetch setiap rule config dari IPFS
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

const authorityRule = {
  version: version.toString(),
  logic: "AND" as const,
  rules: ruleConfigs,
};
```

### Step 2 — Build Context V1

```ts
const AMOUNT = 150_000_000n; // 150 USDC (6 decimals)

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
    // Client isi timestamp sendiri
    // Kalau rule butuh timestamp yang di-attest server, gunakan server mode
    timestamp: Math.floor(Date.now() / 1000),
  },
  state: {
    spentTodayPlusTx: (spentToday + AMOUNT).toString(),
    spentThisMonthPlusTx: (spentMonth + AMOUNT).toString(),
    dailyLimit: "500000000",
  },
};
```

### Step 3 — Evaluate + Generate Proof

```ts
// evaluateAndProve: evaluate rules + payer sign proof dengan wallet mereka
const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: "pay.id/merchant",
  payer: payerWallet.address,
  receiver: RECEIVER,
  asset: USDC,
  amount: AMOUNT,
  signer: payerWallet,
  ttlSeconds: 60,                       // proof valid 60 detik
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
});

if (!proof) {
  // result.decision === "REJECT"
  throw new Error(`Payment ditolak: ${result.reason ?? result.code}`);
}
```

### Step 4 — Approve ERC20

```ts
const usdc = new ethers.Contract(USDC, usdcAbi.abi, payerWallet);
const allowance = await usdc.getFunction("allowance")(payerWallet.address, PAY_CONTRACT);

if (allowance < AMOUNT) {
  const approveTx = await usdc.getFunction("approve").send(PAY_CONTRACT, AMOUNT);
  await approveTx.wait();
}
```

### Step 5 — Send Payment

```ts
const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);

const tx = await payContract.getFunction("payERC20").send(
  proof.payload,    // Decision struct
  proof.signature,  // EIP-712 signature
  []                // attestationUIDs — kosong kalau tidak butuh KYC
);

await tx.wait();
console.log("✅ Payment success! TX:", tx.hash);
```

---

## Output Lengkap

```
Payer: 0xPAYER...

[1/5] Loading rule set from chain + IPFS...
  ruleSetHash: 0xabc...
  rules count: 1
  Fetching [0xa513... #1]: https://gateway.pinata.cloud/ipfs/Qm...

[2/5] Building Context V1...

[3/5] Evaluating rule & generating proof...
  Decision: ALLOW (OK)
  ✅ Proof generated

[4/5] Checking USDC allowance...
  ✅ Approved

[5/5] Sending payERC20...
  TX hash: 0xdef...

✅ Payment success!
   Payer   : 0xPAYER...
   Receiver: 0xRECEIVER...
   Amount  : 150000000 μUSDC (150 USDC)
```

---

## Proof TTL

Proof default valid **60 detik** (`ttlSeconds: 60`). Setelah itu contract akan revert dengan `PAYID: INVALID_PROOF`. Jangan cache proof — generate baru setiap payment.

---

## Perbedaan Client vs Server

```ts
// Client mode — tidak ada trustedIssuers
const payid = createPayID({ wasm });

// Server mode — ada trustedIssuers untuk verifikasi attestation Context V2
const payid = createPayID({
  wasm,
  trustedIssuers: new Set([ENV_ISSUER, STATE_ISSUER]),
});
```
