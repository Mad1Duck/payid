---
id: intro
title: Pengenalan
sidebar_label: Apa itu PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · Enforced On-chain**

## Ide Sederhananya 💡

Bayangkan kamu seorang merchant. Kamu mau terima pembayaran, tapi hanya dengan syarat:
- Hanya stablecoin (USDC, USDT)
- Antara $10–$500 saja
- Hanya di jam kerja
- Hanya dari pelanggan yang sudah terverifikasi

Normalnya, enforcement rules seperti ini butuh backend server, database, dan code yang jalan sebelum setiap payment. **PAY.ID memungkinkan kamu mendefinisikan rules ini sebagai JSON sederhana — dan meng-enforce-nya otomatis di chain apapun, tanpa perlu server.**

> **PAY.ID menjawab satu pertanyaan fundamental: "Apakah transaksi ini boleh dilanjutkan?"**

---

## Cara Kerjanya

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

| Step | Yang Terjadi |
|---|---|
| **Context** | Detail pembayaran dikumpulkan: siapa yang bayar, token apa, berapa, kapan |
| **Rules** | Rules kamu dievaluasi di sandboxed WASM engine — deterministik, auditable |
| **Decision** | Hasilnya `ALLOW ✅` atau `REJECT ❌` |
| **Proof** | Kalau ALLOW, EIP-712 signed proof dibuat — payer sign pakai wallet mereka sendiri |
| **Verify** | Smart contract cek proof-nya, lalu transfer atau revert |

Kontrak **tidak pernah mengeksekusi rules kamu on-chain** — cukup verifikasi signed proof. Ini membuat gas cost rendah dan kontrak mudah diaudit.

---

## PAY.ID Bukan...

| ❌ Bukan | ✅ Tapi |
| --- | --- |
| Wallet | Layer kebijakan untuk pembayaran |
| Payment gateway | Generator cryptographic proof |
| Kustodian (menyimpan dana) | Protokol identitas + rules |
| Protokol DeFi | Bisa dipakai di chain EVM apapun |
| Blockchain atau L2 | Kompatibel dengan ERC-4337 |

---

## 4 Pilar Utama

### 🪪 1. Payment Identity

`pay.id/namakamu` adalah **payment identity** kamu. Bukan cuma wallet address — tapi membawa rules pembayaranmu. Saat seseorang membayar kamu, rules yang melekat pada ID-mu otomatis dicek.

### 📋 2. Rule Engine

Rules adalah **konfigurasi JSON murni** yang dievaluasi di sandboxed WASM engine:
- **Deterministik** — input yang sama selalu menghasilkan output yang sama
- **Auditable** — siapapun bisa membaca rules-nya
- **Immutable** — disimpan di IPFS dengan hash-nya di-commit on-chain

Tiga format rule: `SimpleRule`, `MultiConditionRule`, dan `NestedRule`. Lihat [Rule Basics →](./rules/rule-basics).

### 🔐 3. Decision Proof

Setiap evaluasi payment menghasilkan **EIP-712 signed proof** — tanda terima kriptografis yang menyatakan "pembayaran ini sudah dicek dan disetujui saat ini." Proof ditandatangani oleh wallet payer sendiri, jadi tidak ada pihak ketiga yang dipercaya.

### ⛓️ 4. On-chain Enforcement

Smart contract hanya memverifikasi proof. **Tidak pernah melihat atau mengeksekusi rules.** Ini membuat kontrak sederhana, murah, dan mudah diaudit.

---

## Preview Kode

### Client Mode (React, browser, Node.js)

```ts
import { createPayID } from 'payid/client';

const payid = createPayID({});
await payid.ready();

const { result, proof } = await payid.evaluateAndProve({
  context: {
    tx: { sender: payer, receiver: merchant, asset: usdcAddress, amount: '150000000', chainId: 1 },
    env: { timestamp: Math.floor(Date.now() / 1000) },
  },
  authorityRule,
  payId: 'pay.id/merchant', payer, receiver: merchant,
  asset: usdcAddress, amount: 150_000_000n, signer,
  verifyingContract: PAYID_VERIFIER, ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 1, blockTimestamp: Math.floor(Date.now() / 1000), ttlSeconds: 300,
});

if (proof) {
  await payContract.payERC20(proof.payload, proof.signature, []);
}
```

### React (payer — single hook)

```tsx
import { usePayIDFlow } from 'payid-react';

const { execute, status, isPending, txHash } = usePayIDFlow();
execute({ receiver, asset: usdcAddress, amount: 150_000_000n, payId: 'pay.id/merchant' });
```

### React (merchant QR)

```tsx
import { usePayIDQR } from 'payid-react';

const { generate, payload, qrDataUrl } = usePayIDQR();
generate({ payId: 'pay.id/toko-ku', allowedAsset: usdcAddress, maxAmount: 50_000_000n, expiresAt: ... });
// payload = "payid-v2:eyJ..."  (pakai library QR apapun)
// qrDataUrl = "data:image/png;base64,..."  (kalau package 'qrcode' terinstall)
```

---

## Mulai dari Mana

- [⚡ Quick Start →](./quickstart) — Dari nol ke payment pertama dalam 5 langkah
- [🔧 Instalasi & Setup →](./installation/setup) — Nama paket, konfigurasi env, struktur repo
- [📖 Konsep Inti →](./core-concepts/overview) — Context, Rules, Decision, Proof dijelaskan
- [📋 Rule Basics →](./rules/rule-basics) — Tulis rule pembayaran pertama kamu
- [⚛️ Integrasi React →](./integration/react-integration) — Semua hooks dengan contoh
- [📍 Contract Addresses →](./network/contracts-address) — Deploy ke network kamu
