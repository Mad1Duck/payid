---
id: intro
title: Pengenalan
sidebar_label: Apa itu PAY.ID?
sidebar_position: 1
slug: /
---

# PAY.ID — Programmable Payment Policy

> **One ID · Rule-based · Non-custodial · ERC-4337 Ready**

PAY.ID adalah **policy & proof layer** open-source untuk pembayaran terprogram. Ia menjawab satu pertanyaan fundamental:

> **"Apakah transaksi ini boleh terjadi?"**

PAY.ID memungkinkan kamu mendefinisikan **payment rules** sebagai data, mengevaluasinya off-chain dengan deterministic WASM engine, dan menghasilkan **Decision Proof** bertanda tangan kriptografis yang dapat diverifikasi on-chain.

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

---

## PAY.ID Bukan...

| ❌ Bukan        | ✅ Tapi             |
| --------------- | ------------------- |
| Wallet          | Policy layer        |
| Payment gateway | Proof generator     |
| Kustodian       | Identity protocol   |
| DeFi protocol   | ERC-4337 compatible |
| Blockchain / L2 | Chain-agnostic      |

---

## 4 Pilar Utama

### 🪪 Payment Identity

`pay.id/yourname` adalah **payment identity** kamu — membawa rules-mu, bukan hanya alamatmu.

### 📋 Rule Engine

Rules adalah **pure JSON config** yang dieksekusi oleh **sandboxed WASM engine**. Deterministik, auditabel, immutable. Support 3 format: `SimpleRule`, `MultiConditionRule`, dan `NestedRule`.

### 🔐 Decision Proof

Setiap evaluasi menghasilkan **EIP-712 signed proof** yang dapat diverifikasi on-chain. Zero trust required.

### ⛓️ On-chain Enforcement

Smart contracts hanya memverifikasi proof. Mereka tidak pernah mengeksekusi atau mengetahui rules. **Contracts stay dumb.**

---

## Quick Flow

```ts
import { createPayID } from 'payid/client';

const payid = createPayID({});

const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: 'pay.id/merchant',
  payer: '0xPAYER',
  receiver: '0xRECEIVER',
  asset: USDC_ADDRESS,
  amount: 150_000_000n,
  signer,
  ttlSeconds: 300,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

await payContract.payERC20(proof.payload, proof.signature, []);
```

---

## Mulai Dari Sini

- [ Quick Start →](./quickstart)
- [Instalasi & Setup →](./installation/setup)
- [Konsep Dasar →](./core-concepts/overview)
- [Rule Basics →](./rules/rule-basics)
