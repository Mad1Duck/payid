/**
 * PAY.ID Core Test Suite
 *
 * Covers semua pure-function modules + integration dengan WASM.
 * Run: bun test packages/sdk-core/src/__tests__/core.test.ts
 *
 * Struktur:
 *  1. normalizeContext
 *  2. canonicalizeRuleSet
 *  3. hashRuleSet
 *  4. combineRules
 *  5. buildDecisionTrace
 *  6. validateRequiredContext
 *  7. decodeSessionPolicy (butuh ethers.Wallet)
 *  8. evaluate() full — integration dengan WASM
 */

import { describe, it, expect, beforeAll } from "bun:test";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// ── Module imports (sesuaikan path relatif jika diletakkan di lokasi lain) ──
import { normalizeContext } from "../normalize";
import { canonicalizeRuleSet } from "../rule/canonicalize";
import { hashRuleSet } from "../rule/hash";
import { combineRules } from "../rule/combine";
import { buildDecisionTrace } from "../core/dicisionTrace";
import { validateRequiredContext } from "payid-rule-engine/src/validateRequires";
import { createSessionPolicyPayload } from "../sessionPolicy/create";
import { decodeSessionPolicy } from "../sessionPolicy/decode";
import { evaluate } from "../evaluate";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const baseCtx = () => ({
  tx: {
    sender: "0xSENDER",
    receiver: "0xRECEIVER",
    asset: "usdc",
    amount: "150000000",
    chainId: 1,
  },
  payId: {
    id: "pay.id/demo",
    owner: "0xOWNER",
  },
});

const minAmountRule = (minValue: string) => ({
  id: "min_amount",
  if: { field: "tx.amount", op: ">=", value: minValue },
});

const assetRule = (assets: string[]) => ({
  id: "asset_allowlist",
  if: { field: "tx.asset", op: "in", value: assets },
});

const baseRuleConfig = (rules: any[], logic: "AND" | "OR" = "AND") => ({
  version: "1",
  logic,
  rules,
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. normalizeContext
// ─────────────────────────────────────────────────────────────────────────────

describe("normalizeContext", () => {
  it("lowercases sender and receiver", () => {
    const ctx = baseCtx();
    ctx.tx.sender = "0xABCDEF";
    ctx.tx.receiver = "0xFEDCBA";

    const result = normalizeContext(ctx as any);
    expect(result.tx.sender).toBe("0xabcdef");
    expect(result.tx.receiver).toBe("0xfedcba");
  });

  it("uppercases asset", () => {
    const ctx = baseCtx();
    ctx.tx.asset = "usdc";
    const result = normalizeContext(ctx as any);
    expect(result.tx.asset).toBe("USDC");
  });

  it("preserves other tx fields", () => {
    const ctx = baseCtx();
    const result = normalizeContext(ctx as any);
    expect(result.tx.amount).toBe("150000000");
    expect(result.tx.chainId).toBe(1);
  });

  it("handles missing sender/receiver (optional fields)", () => {
    const ctx = { tx: { asset: "usdc", amount: "1", chainId: 1 }, payId: { id: "x", owner: "y" } };
    const result = normalizeContext(ctx as any);
    expect(result.tx.sender).toBeUndefined();
    expect(result.tx.receiver).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. canonicalizeRuleSet
// ─────────────────────────────────────────────────────────────────────────────

describe("canonicalizeRuleSet", () => {
  it("sorts rules lexicographically by id", () => {
    const result = canonicalizeRuleSet({
      version: "1",
      logic: "AND",
      rules: [
        { id: "z_rule", if: { field: "tx.amount", op: ">=", value: "1" } },
        { id: "a_rule", if: { field: "tx.asset", op: "==", value: "USDC" } },
        { id: "m_rule", if: { field: "tx.chainId", op: "==", value: 1 } },
      ],
    });

    expect(result.rules[0].id).toBe("a_rule");
    expect(result.rules[1].id).toBe("m_rule");
    expect(result.rules[2].id).toBe("z_rule");
  });

  it("sorts keys inside condition object", () => {
    const result = canonicalizeRuleSet({
      version: "1",
      logic: "AND",
      rules: [
        { id: "r1", if: { value: "100", op: ">=", field: "tx.amount" } },
      ],
    });

    const condKeys = Object.keys(result.rules[0].if);
    expect(condKeys).toEqual(["field", "op", "value"]);
  });

  it("is idempotent — canonicalizing twice gives same result", () => {
    const input = {
      version: "1",
      logic: "AND" as const,
      rules: [
        { id: "b", if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] } },
        { id: "a", if: { field: "tx.amount", op: ">=", value: "100" } },
      ],
    };

    const once = canonicalizeRuleSet(input);
    const twice = canonicalizeRuleSet(once as any);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });

  it("preserves version and logic", () => {
    const result = canonicalizeRuleSet({
      version: "42",
      logic: "OR",
      rules: [{ id: "r1", if: { field: "tx.amount", op: ">", value: "0" } }],
    });

    expect(result.version).toBe("42");
    expect(result.logic).toBe("OR");
  });

  it("throws on undefined inside condition", () => {
    expect(() =>
      canonicalizeRuleSet({
        version: "1",
        logic: "AND",
        rules: [{ id: "r1", if: { field: undefined, op: "==", value: "x" } }],
      })
    ).toThrow("Undefined value not allowed");
  });

  it("converts Date to ISO string", () => {
    const d = new Date("2025-01-01T00:00:00Z");
    const result = canonicalizeRuleSet({
      version: "1",
      logic: "AND",
      rules: [{ id: "r1", if: { field: "env.date", op: "==", value: d } }],
    });

    expect(result.rules[0].if.value).toBe("2025-01-01T00:00:00.000Z");
  });

  it("converts bigint to string", () => {
    const result = canonicalizeRuleSet({
      version: "1",
      logic: "AND",
      rules: [{ id: "r1", if: { field: "tx.amount", op: ">=", value: 9999999999999999999n } }],
    });

    expect(typeof result.rules[0].if.value).toBe("string");
  });

  it("two semantically identical rule sets produce same JSON", () => {
    const a = canonicalizeRuleSet({
      version: "1", logic: "AND",
      rules: [
        { id: "b", if: { op: "in", field: "tx.asset", value: ["USDC"] } },
        { id: "a", if: { value: "100", field: "tx.amount", op: ">=" } },
      ],
    });
    const b = canonicalizeRuleSet({
      version: "1", logic: "AND",
      rules: [
        { id: "a", if: { field: "tx.amount", op: ">=", value: "100" } },
        { id: "b", if: { field: "tx.asset", op: "in", value: ["USDC"] } },
      ],
    });

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. hashRuleSet
// ─────────────────────────────────────────────────────────────────────────────

describe("hashRuleSet", () => {
  it("returns a 0x-prefixed 32-byte hex string", () => {
    const canonical = canonicalizeRuleSet({
      version: "1", logic: "AND",
      rules: [{ id: "r1", if: { field: "tx.amount", op: ">=", value: "1" } }],
    });
    const hash = hashRuleSet(canonical);

    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("same canonical input → same hash (deterministic)", () => {
    const canonical = canonicalizeRuleSet({
      version: "1", logic: "AND",
      rules: [{ id: "r1", if: { field: "tx.amount", op: ">=", value: "100" } }],
    });

    expect(hashRuleSet(canonical)).toBe(hashRuleSet(canonical));
  });

  it("different rule → different hash", () => {
    const r1 = canonicalizeRuleSet({ version: "1", logic: "AND", rules: [{ id: "r1", if: { field: "tx.amount", op: ">=", value: "100" } }] });
    const r2 = canonicalizeRuleSet({ version: "1", logic: "AND", rules: [{ id: "r1", if: { field: "tx.amount", op: ">=", value: "999" } }] });

    expect(hashRuleSet(r1)).not.toBe(hashRuleSet(r2));
  });

  it("re-ordered (non-canonical) rule → different hash than canonical", () => {
    const canonical = canonicalizeRuleSet({
      version: "1", logic: "AND",
      rules: [
        { id: "a", if: { field: "tx.amount", op: ">=", value: "100" } },
        { id: "b", if: { field: "tx.asset", op: "in", value: ["USDC"] } },
      ],
    });

    // Manually flip rule order WITHOUT canonicalizing
    const nonCanonical = {
      version: "1",
      logic: "AND",
      rules: [...canonical.rules].reverse(),
    };

    expect(hashRuleSet(canonical)).not.toBe(hashRuleSet(nonCanonical));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. combineRules
// ─────────────────────────────────────────────────────────────────────────────

describe("combineRules", () => {
  const defaultSet = baseRuleConfig([minAmountRule("100000000")]);

  it("merges default + session rules into AND logic", () => {
    const session = [assetRule(["USDC", "USDT"])];
    const result = combineRules(defaultSet as any, session);

    expect(result.logic).toBe("AND");
    expect(result.rules.length).toBe(2);
    expect(result.rules.some(r => r.id === "min_amount")).toBe(true);
    expect(result.rules.some(r => r.id === "asset_allowlist")).toBe(true);
  });

  it("output is canonicalized (rules sorted by id)", () => {
    const session = [
      { id: "zzz", if: { field: "tx.asset", op: "in", value: ["USDC"] } },
    ];
    const result = combineRules(defaultSet as any, session);

    const ids = result.rules.map(r => r.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("empty session rules returns just default rules canonicalized", () => {
    const result = combineRules(defaultSet as any, []);
    expect(result.rules.length).toBe(1);
    expect(result.rules[0].id).toBe("min_amount");
  });

  it("preserves version from defaultRuleSet", () => {
    const versioned = { ...defaultSet, version: "7" };
    const result = combineRules(versioned as any, []);
    expect(result.version).toBe("7");
  });

  it("uses version '1' when defaultRuleSet.version is undefined", () => {
    const noVersion = { logic: "AND" as const, rules: [minAmountRule("1")] };
    const result = combineRules(noVersion as any, []);
    expect(result.version).toBe("1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. buildDecisionTrace
// ─────────────────────────────────────────────────────────────────────────────

describe("buildDecisionTrace", () => {
  const ctx = baseCtx();

  it("returns PASS for satisfied >= condition", () => {
    const config = baseRuleConfig([minAmountRule("100000000")]);
    const trace = buildDecisionTrace(ctx as any, config as any);

    expect(trace[0].ruleId).toBe("min_amount");
    expect(trace[0].result).toBe("PASS");
    expect(trace[0].actual).toBe("150000000");
  });

  it("returns FAIL for unsatisfied >= condition", () => {
    const config = baseRuleConfig([minAmountRule("200000000")]);
    const trace = buildDecisionTrace(ctx as any, config as any);

    expect(trace[0].result).toBe("FAIL");
  });

  it("returns FAIL (not throw) for missing field", () => {
    const config = baseRuleConfig([{
      id: "missing_field",
      if: { field: "oracle.country", op: "==", value: "ID" },
    }]);
    const trace = buildDecisionTrace(ctx as any, config as any);

    expect(trace[0].result).toBe("FAIL");
    expect(trace[0].actual).toBeUndefined();
  });

  it("traces in operator correctly", () => {
    const config = baseRuleConfig([assetRule(["USDC", "USDT"])]);

    // ctx.tx.asset = "usdc" (before normalize) — trace reads raw ctx
    const ctxRaw = { ...ctx, tx: { ...ctx.tx, asset: "USDC" } };
    const trace = buildDecisionTrace(ctxRaw as any, config as any);

    expect(trace[0].result).toBe("PASS");
  });

  it("traces not_in operator correctly", () => {
    const config = baseRuleConfig([{
      id: "not_eth",
      if: { field: "tx.asset", op: "not_in", value: ["ETH"] },
    }]);
    const ctxRaw = { ...ctx, tx: { ...ctx.tx, asset: "USDC" } };
    const trace = buildDecisionTrace(ctxRaw as any, config as any);

    expect(trace[0].result).toBe("PASS");
  });

  it("traces == operator with string match", () => {
    const config = baseRuleConfig([{
      id: "chain_check",
      if: { field: "tx.chainId", op: "==", value: 1 },
    }]);
    const trace = buildDecisionTrace(ctx as any, config as any);
    expect(trace[0].result).toBe("PASS");
  });

  it("includes expected and actual values in trace entries", () => {
    const config = baseRuleConfig([minAmountRule("999")]);
    const trace = buildDecisionTrace(ctx as any, config as any);

    expect(trace[0].expected).toBe("999");
    expect(trace[0].actual).toBe("150000000");
    expect(trace[0].field).toBe("tx.amount");
    expect(trace[0].op).toBe(">=");
  });

  it("returns one entry per rule", () => {
    const config = baseRuleConfig([
      minAmountRule("1"),
      assetRule(["USDC"]),
    ]);
    const trace = buildDecisionTrace(ctx as any, config as any);
    expect(trace.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. validateRequiredContext
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRequiredContext", () => {
  it("passes when no requires defined", () => {
    expect(() => validateRequiredContext({}, undefined)).not.toThrow();
  });

  it("passes when all required fields present", () => {
    const ctx = { oracle: { country: "ID" }, risk: { score: 30 } };
    expect(() =>
      validateRequiredContext(ctx, ["oracle.country", "risk.score"])
    ).not.toThrow();
  });

  it("throws when required field missing", () => {
    expect(() =>
      validateRequiredContext({}, ["oracle.country"])
    ).toThrow("Missing required context field: oracle.country");
  });

  it("throws when required field is null", () => {
    const ctx = { oracle: { country: null } };
    expect(() =>
      validateRequiredContext(ctx, ["oracle.country"])
    ).toThrow("oracle.country");
  });

  it("throws on first missing field", () => {
    expect(() =>
      validateRequiredContext({ oracle: { country: "ID" } }, ["oracle.country", "risk.score"])
    ).toThrow("risk.score");
  });

  it("supports nested path access", () => {
    const ctx = { a: { b: { c: 42 } } };
    expect(() =>
      validateRequiredContext(ctx, ["a.b.c"])
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. decodeSessionPolicy (create + decode roundtrip)
// ─────────────────────────────────────────────────────────────────────────────

describe("decodeSessionPolicy", () => {
  let wallet: ethers.Wallet;
  let now: number;

  beforeAll(() => {
    wallet = ethers.Wallet.createRandom();
    now = Math.floor(Date.now() / 1000);
  });

  it("roundtrip: create → decode returns embedded rule", async () => {
    const rule = baseRuleConfig([minAmountRule("5000000")]);

    const policy = await createSessionPolicyPayload({
      receiver: wallet.address,
      rule: rule as any,
      expiresAt: now + 300,
      signer: wallet,
    });

    const decoded = decodeSessionPolicy(policy, now);
    // Rule is canonicalized on create — check structure preserved
    expect(decoded.logic).toBe("AND");
    expect(decoded.rules.some((r: any) => r.id === "min_amount")).toBe(true);
  });

  it("throws INVALID_SESSION_POLICY_VERSION for wrong version", async () => {
    const rule = baseRuleConfig([minAmountRule("1")]);
    const policy = await createSessionPolicyPayload({
      receiver: wallet.address, rule: rule as any,
      expiresAt: now + 300, signer: wallet,
    });

    const tampered = { ...policy, version: "wrong.version" };
    expect(() => decodeSessionPolicy(tampered, now))
      .toThrow("INVALID_SESSION_POLICY_VERSION");
  });

  it("throws SESSION_POLICY_EXPIRED when now > expiresAt", async () => {
    const rule = baseRuleConfig([minAmountRule("1")]);
    const policy = await createSessionPolicyPayload({
      receiver: wallet.address, rule: rule as any,
      expiresAt: now - 1,  // already expired
      signer: wallet,
    });

    expect(() => decodeSessionPolicy(policy, now))
      .toThrow("SESSION_POLICY_EXPIRED");
  });

  it("throws INVALID_SESSION_POLICY_SIGNATURE for tampered payload", async () => {
    const rule = baseRuleConfig([minAmountRule("1")]);
    const policy = await createSessionPolicyPayload({
      receiver: wallet.address, rule: rule as any,
      expiresAt: now + 300, signer: wallet,
    });

    // Tamper receiver after signing
    const tampered = { ...policy, receiver: ethers.Wallet.createRandom().address };
    expect(() => decodeSessionPolicy(tampered, now))
      .toThrow("INVALID_SESSION_POLICY_SIGNATURE");
  });

  it("rejects policy signed by different wallet", async () => {
    const otherWallet = ethers.Wallet.createRandom();
    const rule = baseRuleConfig([minAmountRule("1")]);
    const policy = await createSessionPolicyPayload({
      receiver: wallet.address,
      rule: rule as any,
      expiresAt: now + 300,
      signer: otherWallet,  // signed by different wallet than receiver
    });

    expect(() => decodeSessionPolicy(policy, now))
      .toThrow("INVALID_SESSION_POLICY_SIGNATURE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. evaluate() — Integration dengan WASM
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluate (WASM integration)", () => {
  let wasm: Uint8Array;

  beforeAll(() => {
    // Path ke wasm binary — sesuaikan dengan lokasi aktual
    const wasmPath = path.resolve(__dirname, "../../../../examples/rule_engine.wasm");
    wasm = new Uint8Array(fs.readFileSync(wasmPath));
  });

  const makeCtx = (amount: string, asset = "USDC") => ({
    tx: {
      sender: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      receiver: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      asset,
      amount,
      chainId: 31337,
    },
    payId: { id: "pay.id/test", owner: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" },
  });

  it("ALLOW — amount meets minimum", async () => {
    const config = baseRuleConfig([minAmountRule("100000000")]);
    const result = await evaluate(wasm, makeCtx("150000000") as any, config as any);

    expect(result.decision).toBe("ALLOW");
  });

  it("REJECT — amount below minimum", async () => {
    const config = baseRuleConfig([minAmountRule("200000000")]);
    const result = await evaluate(wasm, makeCtx("150000000") as any, config as any);

    expect(result.decision).toBe("REJECT");
  });

  it("ALLOW — asset in allowlist", async () => {
    const config = baseRuleConfig([assetRule(["USDC", "USDT"])]);
    const result = await evaluate(wasm, makeCtx("1", "USDC") as any, config as any);

    expect(result.decision).toBe("ALLOW");
  });

  it("REJECT — asset not in allowlist", async () => {
    const config = baseRuleConfig([assetRule(["USDT"])]);
    const result = await evaluate(wasm, makeCtx("1", "USDC") as any, config as any);

    expect(result.decision).toBe("REJECT");
  });

  it("ALLOW — all AND rules pass", async () => {
    const config = baseRuleConfig([
      minAmountRule("100000000"),
      assetRule(["USDC", "USDT"]),
    ]);
    const result = await evaluate(wasm, makeCtx("150000000", "USDC") as any, config as any);

    expect(result.decision).toBe("ALLOW");
  });

  it("REJECT — one AND rule fails", async () => {
    const config = baseRuleConfig([
      minAmountRule("100000000"),
      assetRule(["USDT"]),       // USDC not in list
    ]);
    const result = await evaluate(wasm, makeCtx("150000000", "USDC") as any, config as any);

    expect(result.decision).toBe("REJECT");
  });

  it("ALLOW — OR logic: one rule passes", async () => {
    const config = baseRuleConfig([
      minAmountRule("999000000"),  // fails — amount too low
      assetRule(["USDC"]),         // passes
    ], "OR");
    const result = await evaluate(wasm, makeCtx("150000000", "USDC") as any, config as any);

    expect(result.decision).toBe("ALLOW");
  });

  it("REJECT — OR logic: all rules fail", async () => {
    const config = baseRuleConfig([
      minAmountRule("999000000"),  // fails
      assetRule(["USDT"]),         // fails
    ], "OR");
    const result = await evaluate(wasm, makeCtx("100", "USDC") as any, config as any);

    expect(result.decision).toBe("REJECT");
  });

  it("REJECT — missing tx throws CONTEXT_OR_ENGINE_ERROR", async () => {
    const config = baseRuleConfig([minAmountRule("1")]);
    const result = await evaluate(wasm, {} as any, config as any);

    expect(result.decision).toBe("REJECT");
    expect(result.code).toBe("CONTEXT_OR_ENGINE_ERROR");
  });

  it("debug mode returns trace entries", async () => {
    const config = baseRuleConfig([minAmountRule("100000000")]);
    const result = await evaluate(wasm, makeCtx("150000000") as any, config as any, { debug: true });

    expect((result as any).debug).toBeDefined();
    expect((result as any).debug.trace.length).toBeGreaterThan(0);
    expect((result as any).debug.trace[0].ruleId).toBe("min_amount");
    expect((result as any).debug.trace[0].result).toBe("PASS");
  });

  it("asset is normalized to uppercase before evaluation", async () => {
    const config = baseRuleConfig([assetRule(["USDC"])]);
    // pass lowercase — normalizeContext should uppercase it
    const result = await evaluate(wasm, makeCtx("1", "usdc") as any, config as any);

    expect(result.decision).toBe("ALLOW");
  });

  it("between operator — timestamp within business hours", async () => {
    const hourNow = new Date().getUTCHours();
    const config = baseRuleConfig([{
      id: "biz_hours",
      if: { field: "env.timestamp", op: "between", value: [0, 23] }, // always pass
    }]);
    const ctx = { ...makeCtx("1"), env: { timestamp: hourNow } };
    const result = await evaluate(wasm, ctx as any, config as any);

    expect(result.decision).toBe("ALLOW");
  });

  it("not_between operator — amount outside cursed range", async () => {
    const config = baseRuleConfig([{
      id: "no_cursed",
      if: { field: "tx.amount", op: "not_between", value: ["666000000", "666000000"] },
    }]);

    const good = await evaluate(wasm, makeCtx("150000000") as any, config as any);
    expect(good.decision).toBe("ALLOW");

    const cursed = await evaluate(wasm, makeCtx("666000000") as any, config as any);
    expect(cursed.decision).toBe("REJECT");
  });

  it("exists operator — passes when field present", async () => {
    const config = baseRuleConfig([{
      id: "payid_exists",
      if: { field: "payId.id", op: "exists" },
    }]);
    const result = await evaluate(wasm, makeCtx("1") as any, config as any);
    expect(result.decision).toBe("ALLOW");
  });

  it("not_exists operator — passes when field absent", async () => {
    const config = baseRuleConfig([{
      id: "no_oracle",
      if: { field: "oracle.country", op: "not_exists" },
    }]);
    const result = await evaluate(wasm, makeCtx("1") as any, config as any);
    expect(result.decision).toBe("ALLOW");
  });
});