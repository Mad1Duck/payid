import { describe, test, expect } from "bun:test";
import { runWasmRule } from "../rule/engine/tsSandbox";
import type { RuleContext } from "../types";

const ctx: RuleContext = {
  tx: {
    sender: "0xabc",
    asset: "0x0000000000000000000000000000000000000000",
    amount: "5000",
    chainId: 1,
    receiver: "0xdef",
  },
};

// ─── Operators ────────────────────────────────────────────────────────────────

describe("tsSandbox — numeric operators", () => {
  const rule = (op: string, value: any) => ({
    logic: "AND",
    rules: [{ id: "r", if: { field: "tx.amount", op, value } }],
  });

  test(">= passes", async () => expect((await runWasmRule(ctx, rule(">=", "5000"))).decision).toBe("ALLOW"));
  test(">= fails", async () => expect((await runWasmRule(ctx, rule(">=", "5001"))).decision).toBe("REJECT"));
  test("<= passes", async () => expect((await runWasmRule(ctx, rule("<=", "5000"))).decision).toBe("ALLOW"));
  test("> passes", async () => expect((await runWasmRule(ctx, rule(">", "4999"))).decision).toBe("ALLOW"));
  test("< passes", async () => expect((await runWasmRule(ctx, rule("<", "5001"))).decision).toBe("ALLOW"));
  test("== passes", async () => expect((await runWasmRule(ctx, rule("==", "5000"))).decision).toBe("ALLOW"));
  test("!= passes", async () => expect((await runWasmRule(ctx, rule("!=", "1"))).decision).toBe("ALLOW"));
  test("between passes", async () => expect((await runWasmRule(ctx, rule("between", ["4000", "6000"]))).decision).toBe("ALLOW"));
  test("between fails outside", async () => expect((await runWasmRule(ctx, rule("between", ["1", "100"]))).decision).toBe("REJECT"));
  test("not_between passes", async () => expect((await runWasmRule(ctx, rule("not_between", ["1", "100"]))).decision).toBe("ALLOW"));
  test("in passes", async () => expect((await runWasmRule(ctx, rule("in", ["5000", "9999"]))).decision).toBe("ALLOW"));
  test("not_in passes", async () => expect((await runWasmRule(ctx, rule("not_in", ["1", "2"]))).decision).toBe("ALLOW"));
  test("mod_eq passes", async () => expect((await runWasmRule(ctx, rule("mod_eq", ["1000", "0"]))).decision).toBe("ALLOW"));
});

describe("tsSandbox — string operators", () => {
  const ctxStr: RuleContext = {
    tx: { ...ctx.tx, sender: "0xHello" },
  };
  const rule = (op: string, value: any) => ({
    logic: "AND",
    rules: [{ id: "r", if: { field: "tx.sender", op, value } }],
  });

  test("contains passes", async () => expect((await runWasmRule(ctxStr, rule("contains", "Hello"))).decision).toBe("ALLOW"));
  test("not_contains passes", async () => expect((await runWasmRule(ctxStr, rule("not_contains", "World"))).decision).toBe("ALLOW"));
  test("starts_with passes", async () => expect((await runWasmRule(ctxStr, rule("starts_with", "0x"))).decision).toBe("ALLOW"));
  test("ends_with passes", async () => expect((await runWasmRule(ctxStr, rule("ends_with", "Hello"))).decision).toBe("ALLOW"));
  test("regex passes", async () => expect((await runWasmRule(ctxStr, rule("regex", "^0x"))).decision).toBe("ALLOW"));
  test("not_regex passes", async () => expect((await runWasmRule(ctxStr, rule("not_regex", "^1x"))).decision).toBe("ALLOW"));
});

describe("tsSandbox — exists operators", () => {
  test("exists on present field", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "tx.sender", op: "exists", value: null } }] };
    expect((await runWasmRule(ctx, rule)).decision).toBe("ALLOW");
  });

  test("not_exists on missing field", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "state.missing", op: "not_exists", value: null } }] };
    expect((await runWasmRule(ctx, rule)).decision).toBe("ALLOW");
  });
});

// ─── Transforms ───────────────────────────────────────────────────────────────

describe("tsSandbox — field transforms", () => {
  test("div transform", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "tx.amount|div:1000", op: "==", value: "5" } }] };
    expect((await runWasmRule(ctx, rule)).decision).toBe("ALLOW");
  });

  test("mod transform", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "tx.amount|mod:1000", op: "==", value: "0" } }] };
    expect((await runWasmRule(ctx, rule)).decision).toBe("ALLOW");
  });

  test("div by zero returns original value (no crash)", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "tx.amount|div:0", op: "exists", value: null } }] };
    const result = await runWasmRule(ctx, rule);
    expect(result.decision).toBe("ALLOW");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("tsSandbox — edge cases", () => {
  test("no rules returns ALLOW", async () => {
    const rule = { logic: "AND", rules: [] };
    const result = await runWasmRule(ctx, rule);
    expect(result.decision).toBe("ALLOW");
    expect(result.code).toBe("NO_RULES");
  });

  test("rule with no evaluable condition returns REJECT", async () => {
    const rule = { logic: "AND", rules: [{ id: "r" }] };
    const result = await runWasmRule(ctx, rule);
    expect(result.decision).toBe("REJECT");
  });

  test("unsafe regex throws", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "tx.sender", op: "regex", value: "(a+)+" } }] };
    await expect(runWasmRule(ctx, rule)).rejects.toThrow("UNSAFE_REGEX_PATTERN");
  });

  test("depth limit: nesting beyond 10 returns REJECT", async () => {
    const buildNested = (d: number): any =>
      d === 0
        ? { id: "leaf", if: { field: "tx.amount", op: ">=", value: "1" } }
        : { id: `n${d}`, logic: "AND", rules: [buildNested(d - 1)] };

    const rule = { logic: "AND", rules: [buildNested(12)] };
    const result = await runWasmRule(ctx, rule);
    expect(result.decision).toBe("REJECT");
    expect(result.code).toBe("MAX_DEPTH_EXCEEDED");
  });

  test("missing context field returns REJECT (not crash)", async () => {
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "oracle.price", op: ">=", value: "100" } }] };
    const result = await runWasmRule(ctx, rule);
    expect(result.decision).toBe("REJECT");
  });

  test("cross-field reference", async () => {
    const ctxWithState = { ...ctx, state: { limit: "5000" } } as any;
    const rule = { logic: "AND", rules: [{ id: "r", if: { field: "tx.amount", op: "<=", value: "$state.limit" } }] };
    const result = await runWasmRule(ctxWithState, rule);
    expect(result.decision).toBe("ALLOW");
  });
});
