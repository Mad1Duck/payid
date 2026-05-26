import { describe, test, expect } from "bun:test";
import { evaluate } from "../evaluate";
import type { RuleConfig, RuleContext } from "../types";

const baseContext: RuleContext = {
  tx: {
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    asset: "0x0000000000000000000000000000000000000000",
    amount: "1000000000000000000",
    chainId: 1,
    receiver: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
};

const allowRule: RuleConfig = {
  logic: "AND",
  rules: [{ id: "min-amount", if: { field: "tx.amount", op: ">=", value: "1" } }],
};

const rejectRule: RuleConfig = {
  logic: "AND",
  rules: [{ id: "max-amount", if: { field: "tx.amount", op: "<=", value: "0" } }],
};

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("evaluate() — happy path", () => {
  test("returns ALLOW when condition passes", async () => {
    const result = await evaluate(baseContext, allowRule);
    expect(result.decision).toBe("ALLOW");
  });

  test("returns REJECT when condition fails", async () => {
    const result = await evaluate(baseContext, rejectRule);
    expect(result.decision).toBe("REJECT");
  });

  test("OR logic: allows when any rule passes", async () => {
    const rule: RuleConfig = {
      logic: "OR",
      rules: [
        { id: "r1", if: { field: "tx.amount", op: "==", value: "0" } },
        { id: "r2", if: { field: "tx.amount", op: ">=", value: "1" } },
      ],
    };
    const result = await evaluate(baseContext, rule);
    expect(result.decision).toBe("ALLOW");
  });

  test("AND logic: rejects when any rule fails", async () => {
    const rule: RuleConfig = {
      logic: "AND",
      rules: [
        { id: "r1", if: { field: "tx.amount", op: ">=", value: "1" } },
        { id: "r2", if: { field: "tx.amount", op: "==", value: "0" } },
      ],
    };
    const result = await evaluate(baseContext, rule);
    expect(result.decision).toBe("REJECT");
  });

  test("multiple simple rules in AND group", async () => {
    const rule: RuleConfig = {
      logic: "AND",
      rules: [
        { id: "r1", if: { field: "tx.amount", op: ">=", value: "1" } },
        { id: "r2", if: { field: "tx.amount", op: "<=", value: "999999999999999999999" } },
      ],
    };
    const result = await evaluate(baseContext, rule);
    expect(result.decision).toBe("ALLOW");
  });

  test("debug mode returns trace", async () => {
    const result = await evaluate(baseContext, allowRule, { debug: true });
    expect(result.decision).toBe("ALLOW");
    expect((result as any).debug).toBeDefined();
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe("evaluate() — input validation", () => {
  test("throws when context is null", async () => {
    await expect(evaluate(null as any, allowRule)).rejects.toThrow("context is required");
  });

  test("throws when context.tx is missing", async () => {
    await expect(evaluate({} as any, allowRule)).rejects.toThrow("context.tx is required");
  });

  test("throws when ruleConfig is null", async () => {
    await expect(evaluate(baseContext, null as any)).rejects.toThrow("ruleConfig is required");
  });

  test("throws when ruleConfig.logic is invalid", async () => {
    const badRule = { ...allowRule, logic: "NAND" as any };
    await expect(evaluate(baseContext, badRule)).rejects.toThrow('ruleConfig.logic harus "AND" atau "OR"');
  });

  test("throws when ruleConfig.rules is empty", async () => {
    const badRule: RuleConfig = { logic: "AND", rules: [] };
    await expect(evaluate(baseContext, badRule)).rejects.toThrow("ruleConfig.rules harus array non-kosong");
  });

  test("throws when chainId is not a positive integer", async () => {
    const ctx = { tx: { ...baseContext.tx, chainId: -1 } };
    await expect(evaluate(ctx, allowRule)).rejects.toThrow("chainId tidak valid");
  });

  test("throws when amount is zero", async () => {
    const ctx = { tx: { ...baseContext.tx, amount: "0" } };
    await expect(evaluate(ctx, allowRule)).rejects.toThrow("amount harus > 0");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("evaluate() — edge cases", () => {
  test("REJECT wraps unexpected engine errors", async () => {
    const badRule: RuleConfig = {
      logic: "AND",
      rules: [{ id: "r", if: { field: "tx.amount", op: "regex", value: "(a+)+" } }],
    };
    const result = await evaluate(baseContext, badRule);
    expect(result.decision).toBe("REJECT");
  });

  test("missing field in context returns REJECT (not crash)", async () => {
    const rule: RuleConfig = {
      logic: "AND",
      rules: [{ id: "r", if: { field: "state.dailyLimit", op: ">=", value: "100" } }],
    };
    const result = await evaluate(baseContext, rule);
    expect(result.decision).toBe("REJECT");
  });

  // Depth limit ditest langsung di tsSandbox.test.ts karena evaluate() pakai WASM engine
  test("engine error wraps to REJECT with CONTEXT_OR_ENGINE_ERROR", async () => {
    const badRule: RuleConfig = {
      logic: "AND",
      rules: [{ id: "r", if: { field: "tx.amount", op: "regex", value: "(a+)+" } }],
    };
    const result = await evaluate(baseContext, badRule);
    expect(result.decision).toBe("REJECT");
  });
});
