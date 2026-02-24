---
id: sdk-reference
title: SDK Reference
sidebar_label: SDK Reference
---

# SDK Reference

Package: `@payid/sdk-core`

---

## `createPayID(params)`

Factory function — entry point utama SDK.

```ts
import { createPayID } from "@payid/sdk-core";

function createPayID(params: {
  wasm: Uint8Array;
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;
}): PayIDClient & PayIDServer
```

| Param | Tipe | Deskripsi |
|---|---|---|
| `wasm` | `Uint8Array` | WASM binary dari `rule_engine.wasm` |
| `debugTrace` | `boolean?` | Enable trace output untuk debugging |
| `trustedIssuers` | `Set<string>?` | Issuer addresses untuk Context V2. Kalau diisi, attestation wajib ada dan valid |

**Contoh:**

```ts
// Client mode
const payid = createPayID({ wasm });

// Server mode
const payid = createPayID({
  wasm,
  trustedIssuers: new Set([ENV_ISSUER, STATE_ISSUER]),
});
```

---

## `payid.evaluate(context, rule)`

Pure evaluation — tanpa signing, tanpa server.

```ts
async evaluate(
  context: RuleContext,
  rule: RuleConfig | RuleSource
): Promise<RuleResult>
```

**Contoh:**

```ts
const result = await payid.evaluate(context, ruleConfig);
// { decision: "ALLOW", code: "OK" }
// atau
// { decision: "REJECT", code: "RULE_FAILED", reason: "min_amount" }
```

---

## `payid.evaluateAndProve(params)`

Evaluate + generate EIP-712 Decision Proof. Payer sign sendiri dengan wallet mereka.

```ts
async evaluateAndProve(params: {
  context: RuleContext;
  authorityRule: RuleConfig | RuleSource;
  evaluationRule?: RuleConfig;
  sessionPolicy?: PayIDSessionPolicyPayloadV1;

  payId: string;
  payer: string;
  receiver: string;
  asset: string;
  amount: bigint;

  signer: ethers.Signer;        // client mode
  verifyingContract: string;
  ruleAuthority: string;
  ttlSeconds?: number;          // default 60 detik
}): Promise<{
  result: RuleResult;
  proof: DecisionProof | null;
}>
```

`proof` adalah `null` jika `result.decision === "REJECT"`.

**Contoh:**

```ts
const { result, proof } = await payid.evaluateAndProve({
  context,
  authorityRule,
  payId: "pay.id/merchant",
  payer: "0xPAYER",
  receiver: "0xRECEIVER",
  asset: USDC_ADDRESS,
  amount: 150_000_000n,
  signer,
  ttlSeconds: 60,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
});

if (!proof) throw new Error(`Rejected: ${result.reason}`);

// Kirim ke contract
await payContract.payERC20(proof.payload, proof.signature, []);
```

---

## `payid.buildUserOperation(params)`

Build ERC-4337 UserOperation dari Decision Proof. **Server only.**

```ts
buildUserOperation(params: {
  proof: DecisionProof;
  smartAccount: string;
  nonce: string;
  gas: GasConfig;
  targetContract: string;
  paymasterAndData?: string;
  attestationUIDs?: string[];
  paymentType?: "eth" | "erc20";
}): UserOperation
```

---

## `buildContextV2(params)`

Helper untuk build Context V2 dengan attestations. **Server only.**

```ts
import { buildContextV2 } from "payid/context";

async function buildContextV2(params: {
  baseContext: RuleContext;
  env?:    { issuer: ethers.Signer };
  state?:  { issuer: ethers.Signer; spentToday: string; period: string };
  oracle?: { issuer: ethers.Signer; data: Record<string, any> };
  risk?:   { issuer: ethers.Signer; score: number; category: string; modelHash: string };
}): Promise<ContextV2>
```

---

## Types

### `RuleContext`

```ts
interface RuleContext {
  tx: {
    sender?: string;
    receiver?: string;
    asset: string;
    amount: string;    // micro-units sebagai string
    chainId: number;
  };
  payId?: {
    id: string;
    owner: string;
  };
  intent?: {
    type: "QR" | "DIRECT" | "API";
    expiresAt?: number;
    nonce?: string;
    issuer?: string;
  };
}
```

### `RuleConfig`

```ts
interface RuleConfig {
  version?: string;
  logic: "AND" | "OR";
  rules: AnyRule[];
  requires?: string[];   // ["oracle", "risk", "state"]
  message?: string;
}

type AnyRule = SimpleRule | MultiConditionRule | NestedRule;
```

### `RuleResult`

```ts
interface RuleResult {
  decision: "ALLOW" | "REJECT";
  code: string;
  reason?: string;
}

// Dengan debug trace (kalau debugTrace: true)
interface RuleResultDebug extends RuleResult {
  debug?: {
    trace: Array<{
      ruleId: string;
      field: string;
      op: string;
      expected: any;
      actual: any;
      result: "PASS" | "FAIL";
    }>;
  };
}
```

### `DecisionProof`

```ts
interface DecisionProof {
  payload: {
    version: string;
    payId: string;
    payer: string;
    receiver: string;
    asset: string;
    amount: bigint;
    contextHash: string;
    ruleSetHash: string;
    ruleAuthority: string;
    issuedAt: number;
    expiresAt: number;       // issuedAt + ttlSeconds
    nonce: string;           // random hex, replay protection
    requiresAttestation: boolean;
  };
  signature: string;         // EIP-712 signature dari payer
}
```

---

## Result Codes

| Code | Kondisi |
|---|---|
| `OK` | Semua rules pass |
| `RULE_FAILED` | Kondisi rule false |
| `FIELD_NOT_FOUND` | Context field tidak ada |
| `INVALID_CONFIG` | Rule config malformed |
| `CONTEXT_OR_ENGINE_ERROR` | Error WASM / runtime |
| `INVALID_ENGINE_OUTPUT` | Output WASM tidak valid |

---

## Exports

```ts
import { createPayID } from "@payid/sdk-core";          // factory
import { createPayID } from "payid/server";              // server alias

import { buildContextV2 } from "payid/context";          // context V2 builder

import * as sessionPolicy from "@payid/sdk-core";
import * as rule from "@payid/sdk-core";
import * as issuer from "@payid/sdk-core";
import * as eas from "@payid/sdk-core";

import type { PayIDClient, PayIDServer } from "@payid/sdk-core";
```
