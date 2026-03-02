---
id: client
title: "Contoh: Client Payment Flow"
sidebar_label: Client Payment Flow
---

# Contoh: Client Payment Flow

Source: `examples/simple/client.ts`

Flow pembayaran **fully serverless** — tidak butuh server, tidak butuh trusted issuers. Semuanya berjalan di sisi client. Ini cara paling sederhana untuk integrasi PAY.ID.

---

## Kapan Pakai Client Mode

| ✅ Pakai Client Mode | ❌ Butuh Server Mode |
|---|---|
| Rules hanya cek `tx.*` (aset, jumlah, alamat) | Rules butuh KYC (`oracle.kycLevel`) |
| Payer tandatangani dengan wallet mereka sendiri | Rules butuh rate limit (`state.spentToday`) |
| Tidak ada `requiresAttestation` di rule config | Rules butuh geoblocking (`oracle.country`) |
| Flow pembayaran merchant sederhana | Rules compliance dari backend-mu |

---

## Jalankan

```bash
bun examples/simple/client.ts
```

---

## Walkthrough Lengkap

### Setup — Inisialisasi SDK

```ts
import { createPayID } from "payid/client";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
const payid = createPayID({});
```

`createPayID({})` menginisialisasi SDK. Config kosong `{}` artinya client mode tanpa trusted issuers.

---

### Langkah 1 — Load Rule Set dari Chain + IPFS

Ambil rules pembayaran merchant yang sedang aktif:

```ts
const combined = new ethers.Contract(COMBINED_RULE_STORAGE, combinedAbi.abi, provider);

// Dapatkan rule set hash untuk receiver ini
const ruleSetHash = await combined.getFunction("activeRuleOf")(RECEIVER);
if (ruleSetHash === ethers.ZeroHash) {
  throw new Error("Receiver tidak punya active rule set");
}

// Dapatkan referensi rule NFT
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

// Ambil setiap rule JSON dari IPFS
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

// Gabungkan menjadi authority rule
const authorityRule = {
  version: version.toString(),
  logic: "AND" as const,
  rules: ruleConfigs,
};
```

---

### Langkah 2 — Bangun Context V1

Deskripsikan pembayaran secara lengkap:

```ts
const AMOUNT = 50_000_000n; // 50 USDC (6 desimal)

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
    // Sertakan tx ini di total harian agar rules batas harian bekerja dengan benar
    spentTodayPlusTx: AMOUNT.toString(),
    spentThisMonthPlusTx: AMOUNT.toString(),
    dailyLimit: "500000000", // Batas harian 500 USDC
  },
};
```

:::tip Field State
Field `state.*` disediakan oleh payer di client mode. Untuk rules yang benar-benar menerapkan batas harian dengan verifikasi server, gunakan Server Mode.
:::

---

### Langkah 3 — Evaluate + Generate Proof

Ini operasi inti PAY.ID:

```ts
const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: "pay.id/merchant",
  payer: payerWallet.address,
  receiver: RECEIVER,
  asset: USDC_ADDRESS,
  amount: AMOUNT,
  signer: payerWallet,         // Wallet payer menandatangani proof
  ttlSeconds: 300,             // Proof berlaku 5 menit
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

if (result.decision === "REJECT") {
  throw new Error(`Pembayaran ditolak: ${result.reason ?? result.code}`);
}

console.log("Decision:", result.decision); // "ALLOW"
console.log("Proof berhasil dibuat ✅");
```

**Yang terjadi di dalam `evaluateAndProve`:**
1. Evaluasi `context` terhadap `authorityRule` menggunakan WASM rule engine
2. Kalau ALLOW, buat payload `DecisionProof`
3. Wallet payer menandatangani payload dengan EIP-712
4. Kembalikan `{ result, proof }`

---

### Langkah 4 — Approve Pengeluaran ERC20

Smart contract butuh izin untuk memindahkan USDC payer:

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

### Langkah 5 — Kirim Pembayaran

Submit pembayaran bersama proof:

```ts
const payContract = new ethers.Contract(PAY_CONTRACT, PayWithPayIDAbi.abi, payerWallet);

const tx = await payContract.getFunction("payERC20").send(
  proof.payload,    // Payload decision proof
  proof.signature,  // Tanda tangan EIP-712 dari payer
  []                // Optional ERC-4337 user ops (kosong untuk sekarang)
);

await tx.wait();
console.log("✅ Pembayaran berhasil! TX:", tx.hash);
```

---

## Ringkasan Alur Lengkap

```
1. getActiveRuleOf(receiver)     → ambil ruleSetHash dari chain
2. getRuleByHash(ruleSetHash)    → dapatkan referensi rule NFT
3. ambil setiap tokenURI dari IPFS → dapatkan rule JSON config
4. buildContext(...)             → deskripsikan pembayaran
5. evaluateAndProve(...)         → evaluasi rules + tandatangani proof
6. approve(PAY_CONTRACT, amount) → izinkan kontrak pakai token
7. payERC20(payload, sig, [])    → submit ke blockchain
```

---

## Catatan

**TTL Proof.** Proof berlaku selama `ttlSeconds` detik (default: 300 = 5 menit). Jangan pernah cache proof — selalu buat yang baru untuk setiap pembayaran.

**Hash rule harus cocok.** `ruleSetHash` dalam proof harus cocok dengan rule aktif receiver on-chain. SDK menangani ini otomatis via `ruleSetHashOverride`.

**ZeroHash berarti tidak ada policy.** Kalau `activeRuleOf()` mengembalikan `0x000...000`, receiver tidak punya rules aktif — pembayaran diterima tanpa batasan.
