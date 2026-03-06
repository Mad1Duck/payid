---
id: sdk-reference
title: SDK Reference
sidebar_label: SDK Reference
---

# SDK Reference

Package: `payid`

Subpath exports: `payid/client` · `payid/server` · `payid/sessionPolicy` · `payid/context` · `payid/rule`

---

## `createPayID(params)`

Factory function — the main SDK entry point. Import from `payid/client` for browser/Node, or `payid/server` for backend with trusted issuers.

```ts
import { createPayID } from "payid/client";   // client mode
import { createPayID } from "payid/server";   // server mode

createPayID(params: {
  debugTrace?: boolean;
  trustedIssuers?: Set<string>;  // server mode only
}): PayIDClient
```

| Param | Type | Description |
|---|---|---|
| `debugTrace` | `boolean?` | Log evaluation trace to console |
| `trustedIssuers` | `Set<string>?` | Issuer addresses allowed to sign Context V2 attestations. Server mode only. |

---

## `payid.ready()`

Wait for the WASM rule engine to finish loading. Must be called before `evaluate()` or `evaluateAndProve()`.

```ts
await payid.ready();
```

---

## `payid.evaluate(context, rule)`

Pure rule evaluation — no signing, no network calls.

```ts
async evaluate(
  context: RuleContext,
  rule: RuleConfig | RuleSource
): Promise<RuleResult>
```

```ts
const result = await payid.evaluate(
  {
    tx: { sender: "0x...", receiver: "0x...", asset: "USDC", amount: "150000000", chainId: 1 },
    env: { timestamp: Math.floor(Date.now() / 1000) },
  },
  {
    version: "1",
    logic: "AND",
    rules: [
      { id: "min_amount", if: { field: "tx.amount", op: ">=", value: "100000000" } },
    ],
  }
);

console.log(result.decision); // "ALLOW" | "REJECT"
```

---

## `payid.evaluateAndProve(params)`

Evaluate rules and generate an EIP-712 Decision Proof. The payer signs with their own wallet. Returns `proof: null` if the decision is `REJECT`.

```ts
async evaluateAndProve(params: {
  // Rule evaluation
  context:          RuleContext;         // payment details
  authorityRule:    RuleConfig;          // merchant's rules (loaded from IPFS)
  evaluationRule?:  RuleConfig;          // override rule for evaluation only

  // Session policy (Channel A — optional)
  sessionPolicyV2?: SessionPolicyV2;

  // Payment identity
  payId:     string;   // e.g. "pay.id/merchant"
  payer:     string;   // payer wallet address
  receiver:  string;   // receiver wallet address
  asset:     string;   // token address (zero address = ETH)
  amount:    bigint;   // amount in token's smallest unit

  // Signing
  signer:            ethers.Signer;  // payer's ethers signer

  // On-chain binding
  verifyingContract: string;    // PayIDVerifier address
  ruleAuthority:     string;    // CombinedRuleStorage address
  ruleSetHashOverride?: string; // pass activeRuleSetHash from chain to avoid mismatch

  // Timing
  chainId:        number;  // e.g. 31337 for localhost
  blockTimestamp: number;  // Math.floor(Date.now() / 1000)
  ttlSeconds?:    number;  // proof TTL, default 300 seconds
}): Promise<{ result: RuleResult; proof: DecisionProof | null }>
```

:::warning blockTimestamp is required
Always pass `blockTimestamp: Math.floor(Date.now() / 1000)`. This is used for proof expiry calculation and must match the chain's block time as closely as possible.
:::

**Example:**

```ts
import { createPayID } from "payid/client";
import { ethers } from "ethers";

const payid = createPayID({});
await payid.ready();

const { result, proof } = await payid.evaluateAndProve({
  context: {
    tx: {
      sender:   payerAddress,
      receiver: merchantAddress,
      asset:    usdcAddress,
      amount:   "150000000",
      chainId:  31337,
    },
    env:   { timestamp: Math.floor(Date.now() / 1000) },
    state: { spentToday: "0", period: new Date().toISOString().slice(0, 10) },
  },
  authorityRule: {
    version: "1",
    logic: "AND",
    rules: ruleConfigs,     // loaded from IPFS
  },
  payId:              "pay.id/merchant",
  payer:              payerAddress,
  receiver:           merchantAddress,
  asset:              usdcAddress,
  amount:             150_000_000n,
  signer:             payerSigner,
  verifyingContract:  PAYID_VERIFIER,
  ruleAuthority:      COMBINED_RULE_STORAGE,
  ruleSetHashOverride: activeHashFromChain,  // prevents hash mismatch
  chainId:            31337,
  blockTimestamp:     Math.floor(Date.now() / 1000),
  ttlSeconds:         300,
});

if (!proof) throw new Error(`Rejected: ${result.reason ?? result.code}`);

// Submit to blockchain
await payContract.payERC20(proof.payload, proof.signature, []);
```

---

## `buildContextV2(params)`

Build Context V2 with server-signed attestations. **Server mode only.**

```ts
import { buildContextV2 } from "payid/context";

const contextV2 = await buildContextV2({
  baseContext: {
    tx: { sender: "0x...", receiver: "0x...", asset: "USDC", amount: "50000000", chainId: 1 },
  },
  env:    { issuer: envSigner },
  state:  { issuer: stateSigner, spentToday: "0", period: "DAY" },
  oracle: { issuer: oracleSigner, data: { country: "ID", kycLevel: "2" } },
  risk:   { issuer: riskSigner, score: 25, category: "LOW", modelHash: "0x..." },
});
```

Each field gets a `proof` attestation signed by the respective issuer. The SDK verifies all proofs against `trustedIssuers` during evaluation.

---

## `createSessionPolicyV2(params)`

Create a Channel A session policy — signed by the **receiver** with their payment constraints. Used to generate QR codes that payers scan.

```ts
import { createSessionPolicyV2 } from "payid/sessionPolicy";

const policy = await createSessionPolicyV2({
  receiver:          merchantAddress,
  ruleSetHash:       activeRuleSetHash,
  ruleAuthority:     COMBINED_RULE_STORAGE,
  allowedAsset:      usdcAddress,
  maxAmount:         50_000_000n,          // 50 USDC
  expiresAt:         Math.floor(Date.now() / 1000) + 3600,  // 1 hour
  payId:             "pay.id/merchant",
  chainId:           31337,
  verifyingContract: PAYID_VERIFIER,
  signer:            merchantSigner,
});
```

---

## `encodeSessionPolicyV2QR(policy)` / `decodeSessionPolicyV2QR(str)`

Encode/decode a `SessionPolicyV2` to/from a QR-safe string (`"payid-v2:<base64url>"`).

```ts
import { encodeSessionPolicyV2QR, decodeSessionPolicyV2QR } from "payid/sessionPolicy";

// Merchant side — encode to QR payload
const qrString = encodeSessionPolicyV2QR(policy);
// → "payid-v2:eyJ2ZXJzaW9uIjoicGF5aWQuc2..."

// Payer side — decode from scanned QR
const policy = decodeSessionPolicyV2QR(qrString);
```

---

## Types

### `RuleContext`

```ts
interface RuleContext {
  tx: {
    sender?:   string;   // payer wallet address
    receiver?: string;   // merchant wallet address
    asset:     string;   // token address or symbol
    amount:    string;   // amount in token units (as string)
    chainId:   number;
  };
  payId?: { id: string; owner: string };
  env?:   { timestamp: number };
  state?: { spentToday?: string; period?: string; [key: string]: unknown };
}
```

### `RuleConfig`

```ts
interface RuleConfig {
  version?: string;
  logic:    "AND" | "OR";
  rules:    AnyRule[];
  requires?: string[];    // ["oracle", "risk", "state"] for server fields
  message?: string;
}
type AnyRule = SimpleRule | MultiConditionRule | NestedRule;
```

### `RuleResult`

```ts
interface RuleResult {
  decision: "ALLOW" | "REJECT";
  code:     string;
  reason?:  string;
}
```

### `DecisionProof`

```ts
interface DecisionProof {
  payload: {
    version:              string;   // keccak256("2")
    payId:                string;
    payer:                string;
    receiver:             string;
    asset:                string;
    amount:               bigint;
    contextHash:          string;
    ruleSetHash:          string;   // must match merchant's active hash on-chain
    ruleAuthority:        string;   // CombinedRuleStorage address
    issuedAt:             number;
    expiresAt:            number;   // issuedAt + ttlSeconds
    nonce:                string;   // random, prevents replay
    requiresAttestation:  boolean;
  };
  signature: string;  // EIP-712 signature from payer's wallet
}
```

### `SessionPolicyV2`

```ts
interface SessionPolicyV2 {
  version:           "payid.session.policy.v2";
  receiver:          string;
  ruleSetHash:       string;
  ruleAuthority:     string;
  allowedAsset:      string;
  maxAmount:         string;         // bigint serialized as string
  expiresAt:         number;
  policyNonce:       string;
  payId:             string;
  chainId:           number;
  verifyingContract: string;
  signature:         string;         // EIP-712 from receiver
}
```

---

## Result Codes

| Code | Condition |
|---|---|
| `OK` | All rules passed |
| `RULE_FAILED` | Rule condition evaluated to false |
| `FIELD_NOT_FOUND` | Context field referenced in rule is missing |
| `INVALID_CONFIG` | Rule JSON is malformed |
| `CONTEXT_OR_ENGINE_ERROR` | WASM / runtime error |
| `INVALID_ENGINE_OUTPUT` | WASM output format unexpected |
