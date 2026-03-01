---
id: sdk-reference
title: SDK Reference
sidebar_label: SDK Reference
---

# SDK Reference

Package: `@payid/sdk-core`

---

## `createPayID(params)`

Factory function — the main SDK entry point.

```ts
import { createPayID } from "payid/client";   // client mode
import { createPayID } from "payid/server";   // server mode

function createPayID(params: {
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;
}): PayIDClient & PayIDServer
```

| Param | Type | Description |
|---|---|---|
| `debugTrace` | `boolean?` | Enable trace output for debugging |
| `trustedIssuers` | `Set<string>?` | Issuer addresses for Context V2 attestation verification |

---

## `payid.evaluate(context, rule)`

Pure evaluation — no signing, no server.

```ts
async evaluate(context: RuleContext, rule: RuleConfig): Promise<RuleResult>
```

```ts
const result = await payid.evaluate(context, ruleConfig);
// { decision: "ALLOW", code: "OK" }
// { decision: "REJECT", code: "RULE_FAILED", reason: "min_amount" }
```

---

## `payid.evaluateAndProve(params)`

Evaluate + generate an EIP-712 Decision Proof. The payer signs with their own wallet.

```ts
async evaluateAndProve(params: {
  context: RuleContext;
  authorityRule: RuleConfig;
  payId: string;
  payer: string;
  receiver: string;
  asset: string;
  amount: bigint;
  signer: ethers.Signer;
  verifyingContract: string;
  ruleAuthority: string;
  chainId: number;
  ttlSeconds?: number;     // default 300 seconds
}): Promise<{ result: RuleResult; proof: DecisionProof | null; }>
```

`proof` is `null` if `result.decision === "REJECT"`.

```ts
const { result, proof } = await payid.evaluateAndProve({
  context, authorityRule,
  payId: "pay.id/merchant",
  payer: "0xPAYER", receiver: "0xRECEIVER",
  asset: USDC_ADDRESS, amount: 150_000_000n,
  signer, ttlSeconds: 300,
  verifyingContract: PAYID_VERIFIER,
  ruleAuthority: COMBINED_RULE_STORAGE,
  chainId: 4202,
});

if (!proof) throw new Error(`Rejected: ${result.reason}`);
await payContract.payERC20(proof.payload, proof.signature, []);
```

---

## `buildContextV2(params)`

Build Context V2 with attestations. **Server only.**

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

### `RuleConfig`

```ts
interface RuleConfig {
  version?: string;
  logic: "AND" | "OR";
  rules: AnyRule[];
  requires?: string[];
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
```

### `DecisionProof`

```ts
interface DecisionProof {
  payload: {
    version: string; payId: string;
    payer: string; receiver: string; asset: string; amount: bigint;
    contextHash: string; ruleSetHash: string; ruleAuthority: string;
    issuedAt: number; expiresAt: number;
    nonce: string;
    requiresAttestation: boolean;
  };
  signature: string;
}
```

---

## Result Codes

| Code | Condition |
|---|---|
| `OK` | All rules passed |
| `RULE_FAILED` | Rule condition is false |
| `FIELD_NOT_FOUND` | Context field is missing |
| `INVALID_CONFIG` | Rule config is malformed |
| `CONTEXT_OR_ENGINE_ERROR` | WASM / runtime error |
| `INVALID_ENGINE_OUTPUT` | WASM output is invalid |
