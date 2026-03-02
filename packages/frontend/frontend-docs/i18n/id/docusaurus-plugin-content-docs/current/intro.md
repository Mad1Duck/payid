---
id: intro
title: Pengenalan
sidebar_label: Apa itu PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · ERC-4337 Ready**

## Ide Sederhananya 💡

Bayangkan kamu adalah seorang merchant. Kamu mau terima pembayaran, tapi hanya kalau:
- Hanya stablecoin (USDC, USDT)
- Antara $10–$500 saja
- Hanya di jam kerja
- Hanya dari pelanggan yang sudah terverifikasi

Biasanya, untuk enforce rules seperti ini kamu butuh server backend, database, dan kode yang rumit. **PAY.ID memungkinkan kamu mendefinisikan rules ini sebagai file JSON sederhana** — dan rules itu otomatis di-enforce di blockchain manapun, tanpa kamu harus jalankan server.

> **PAY.ID menjawab satu pertanyaan mendasar: "Apakah transaksi ini boleh terjadi?"**

---

## Cara Kerjanya — Gambaran Besar

Bayangkan PAY.ID seperti **satpam pintar** untuk pembayaranmu:

```
[Payer mau kirim uang]
        ↓
[Satpam cek rules-mu]  ← Ini PAY.ID
        ↓               ↓
   [DIIZINKAN ✅]   [DIBLOKIR ❌]
        ↓
[Smart contract di blockchain]
        ↓
   [Uang berpindah]
```

Secara teknis lebih detailnya:

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

| Langkah | Yang Terjadi |
|---|---|
| **Context** | PAY.ID kumpulkan info: siapa yang bayar, token apa, berapa, kapan |
| **Rules** | Rules-mu dievaluasi di WASM engine yang cepat dan aman |
| **Decision** | Hasilnya ALLOW ✅ atau REJECT ❌ |
| **Proof** | Kalau ALLOW, dibuatkan bukti kriptografis (ditandatangani wallet payer) |
| **Verify** | Smart contract cek buktinya, lalu transfer uang atau revert |

---

## PAY.ID Bukan...

| ❌ Bukan | ✅ Tapi |
| --- | --- |
| Wallet | Policy layer untuk pembayaran |
| Payment gateway | Generator bukti kriptografis |
| Kustodian (nyimpan uangmu) | Identity + rules protocol |
| DeFi protocol | Kompatibel dengan ERC-4337 |
| Blockchain atau L2 | Berjalan di chain EVM manapun |

---

## 4 Pilar Utama

### 🪪 1. Payment Identity

`pay.id/namamu` adalah **payment identity** milikmu. Bukan sekadar alamat wallet — ia membawa rules pembayaranmu. Saat seseorang membayar kamu, rules yang melekat pada ID-mu otomatis dicek.

### 📋 2. Rule Engine

Rules adalah **pure JSON config** yang dievaluasi di sandboxed WASM engine. Sifatnya:
- **Deterministik** — input yang sama selalu menghasilkan output yang sama
- **Auditabel** — siapapun bisa baca rulesnya
- **Immutable** — disimpan di IPFS + di-hash on-chain

Ada 3 format rule: `SimpleRule`, `MultiConditionRule`, dan `NestedRule`. Lihat [Rule Basics →](./rules/rule-basics)

### 🔐 3. Decision Proof

Setiap evaluasi menghasilkan **EIP-712 signed proof** — sebuah bukti kriptografis yang menyatakan "pembayaran ini sudah dicek dan disetujui pada saat ini." Proof ditandatangani oleh wallet payer sendiri, sehingga tidak butuh pihak ketiga yang dipercaya.

### ⛓️ 4. On-chain Enforcement

Smart contracts hanya memverifikasi proof. Mereka **tidak pernah melihat atau menjalankan rules**. Ini membuat kontrak tetap sederhana, murah dijalankan, dan mudah diaudit.

---

## Contoh Kode Singkat

```ts
import { createPayID } from 'payid/client';

// 1. Buat SDK
const payid = createPayID({});

// 2. Evaluasi rules dan buat proof (ditandatangani wallet payer)
const { result, proof } = await payid.evaluateAndProve({
  context,        // detail pembayaran (siapa, token apa, berapa)
  authorityRule,  // rules merchant yang diload dari blockchain
  payId: 'pay.id/merchant',
  payer: '0xPAYER',
  receiver: '0xRECEIVER',
  asset: USDC_ADDRESS,
  amount: 150_000_000n, // 150 USDC (6 desimal)
  signer,
  ttlSeconds: 300, // proof berlaku 5 menit
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

// 3. Kirim ke blockchain (hanya kalau rules lolos)
if (proof) {
  await payContract.payERC20(proof.payload, proof.signature, []);
}
```

---

## Mulai Dari Sini

- [⚡ Quick Start →](./quickstart) — Dari nol ke payment pertama dalam 5 langkah
- [🔧 Instalasi & Setup →](./installation/setup) — Setup environment lengkap
- [📖 Konsep Dasar →](./core-concepts/overview) — Pahami building blocks-nya
- [📋 Rule Basics →](./rules/rule-basics) — Pelajari cara nulis rules
