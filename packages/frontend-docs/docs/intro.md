---
id: intro
title: Introduction
sidebar_label: Apa itu PAY.ID?
slug: /
---

# PAY.ID — Programmable Payment Identity

> **One ID · Rule-based · Non-custodial · ERC-4337 Ready**

PAY.ID adalah **policy & proof layer** open-source untuk pembayaran terprogram.

Ia menjawab satu pertanyaan fundamental:

> **"Apakah transaksi ini boleh terjadi?"**

---

## Apa yang PAY.ID Lakukan

PAY.ID memungkinkan kamu mendefinisikan **payment rules** sebagai data, mengevaluasinya off-chain dengan deterministic WASM engine, dan menghasilkan **Decision Proof** bertanda tangan kriptografis yang dapat diverifikasi on-chain oleh smart contract manapun.

```
Context → Rules (WASM) → Decision → Proof (EIP-712) → Verify (Solidity)
```

---

## PAY.ID Bukan...

| ❌ PAY.ID BUKAN | ✅ PAY.ID ADALAH |
|---|---|
| Wallet | Policy layer |
| Payment gateway | Proof generator |
| Kustodian | Identity protocol |
| DeFi protocol | ERC-4337 compatible |
| Blockchain / L2 | Chain-agnostic |

---

## 4 Pilar Utama

### 🪪 Payment Identity
`pay.id/yourname` adalah **payment identity** kamu — membawa rules-mu, bukan hanya alamatmu.

### 📋 Rule Engine
Rules adalah **pure JSON config** yang dieksekusi oleh **sandboxed WASM engine**. Deterministik, auditabel, immutable. Support 3 format rule: `SimpleRule`, `MultiConditionRule`, dan `NestedRule`.

### 🔐 Decision Proof
Setiap evaluasi menghasilkan **EIP-712 signed proof** yang dapat diverifikasi on-chain. Zero trust required.

### ⛓️ On-chain Enforcement
Smart contracts hanya memverifikasi proof. Mereka tidak pernah mengeksekusi atau mengetahui rules. **Contracts stay dumb.**

---

## Model Infrastruktur (Seperti ENS)

PAY.ID adalah **shared infrastructure** — kamu tidak perlu deploy contract apapun.

```
App kamu ──────► RuleItemERC721
App lain ──────► CombinedRuleStorage ──► PayIDVerifier (trust anchor)
App lain ──────► PayWithPayID
                 (satu set contract, semua pakai bersama)
```

Sama seperti ENS — tidak ada developer yang deploy ENS Registry sendiri. Semua connect ke contract resmi yang sama.

---

## Quick Flow

```ts
import { createPayID } from "@payid/sdk-core";
import fs from "fs";

// 1. Init SDK dengan WASM
const payid = createPayID({
  wasm: new Uint8Array(fs.readFileSync("rule_engine.wasm")),
});

// 2. Evaluate + generate proof
const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: "pay.id/merchant",
  payer: "0xPAYER",
  receiver: "0xRECEIVER",
  asset: USDC_ADDRESS,
  amount: 150_000_000n,
  signer,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
});

// 3. Kirim payment dengan proof
await payContract.payERC20(proof.payload, proof.signature, []);
```

---

## Mulai Dari Sini

- [⚡ Quick Start →](./quickstart)
- [Instalasi & Setup →](./installation/setup)
- [Core Concepts →](./core-concepts/overview)
- [Rule Basics →](./rules/rule-basics)
