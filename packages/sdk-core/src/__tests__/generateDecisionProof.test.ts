import { describe, test, expect } from "bun:test";
import { generateDecisionProof } from "../decision-proof/generate";
import { ethers } from "ethers";

const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

const base = {
  payId: "user@pay.id",
  payer: wallet.address,
  receiver: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  asset: "0x0000000000000000000000000000000000000000",
  amount: 1_000_000_000_000_000_000n,
  context: { tx: { amount: "1000000000000000000", chainId: 1 } },
  ruleConfig: { logic: "AND", rules: [{ id: "r1", if: { field: "tx.amount", op: ">=", value: "1" } }] },
  signer: wallet,
  ruleAuthority: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  verifyingContract: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  chainId: 1,
  blockTimestamp: Math.floor(Date.now() / 1000),
};

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("generateDecisionProof() — happy path", () => {
  test("returns proof with valid signature", async () => {
    const proof = await generateDecisionProof(base);
    expect(proof.signature).toMatch(/^0x[0-9a-f]{130}$/i);
    expect(proof.payload.payer).toBe(wallet.address);
    expect(proof.payload.amount).toBe(base.amount);
  });

  test("proof payload has correct fields", async () => {
    const proof = await generateDecisionProof(base);
    const p = proof.payload;
    expect(p.receiver).toBe(base.receiver);
    expect(p.asset).toBe(base.asset);
    expect(p.ruleAuthority).toBe(base.ruleAuthority);
    expect(typeof p.nonce).toBe("string");
    expect(p.issuedAt).toBeLessThan(p.expiresAt);
  });

  test("custom ttlSeconds is respected", async () => {
    const proof = await generateDecisionProof({ ...base, ttlSeconds: 60 });
    // issuedAt = now - 30, expiresAt = now + ttlSeconds → diff = ttlSeconds + 30
    const diff = Number(proof.payload.expiresAt - proof.payload.issuedAt);
    expect(diff).toBe(90);
  });

  test("attestationUIDs generates non-zero hash", async () => {
    const uids = ["0xaaaa000000000000000000000000000000000000000000000000000000000001"];
    const proof = await generateDecisionProof({ ...base, attestationUIDs: uids });
    expect(proof.payload.attestationUIDsHash).not.toBe(ethers.ZeroHash);
    expect(proof.payload.requiresAttestation).toBe(false);
  });

  test("no attestationUIDs yields ZeroHash", async () => {
    const proof = await generateDecisionProof(base);
    expect(proof.payload.attestationUIDsHash).toBe(ethers.ZeroHash);
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe("generateDecisionProof() — input validation", () => {
  test("throws on empty payId", async () => {
    await expect(generateDecisionProof({ ...base, payId: "" })).rejects.toThrow("payId tidak boleh kosong");
  });

  test("throws on zero payer", async () => {
    await expect(generateDecisionProof({ ...base, payer: ethers.ZeroAddress })).rejects.toThrow("payer");
  });

  test("throws on invalid payer address", async () => {
    await expect(generateDecisionProof({ ...base, payer: "not-an-address" })).rejects.toThrow("payer");
  });

  test("throws on zero receiver", async () => {
    await expect(generateDecisionProof({ ...base, receiver: ethers.ZeroAddress })).rejects.toThrow("receiver");
  });

  test("throws on zero verifyingContract", async () => {
    await expect(generateDecisionProof({ ...base, verifyingContract: ethers.ZeroAddress })).rejects.toThrow("verifyingContract");
  });

  test("throws on invalid ruleAuthority", async () => {
    await expect(generateDecisionProof({ ...base, ruleAuthority: "bad" })).rejects.toThrow("ruleAuthority");
  });

  test("throws on invalid asset address", async () => {
    await expect(generateDecisionProof({ ...base, asset: "not-valid" })).rejects.toThrow("asset");
  });

  test("throws on zero amount", async () => {
    await expect(generateDecisionProof({ ...base, amount: 0n })).rejects.toThrow("amount harus > 0");
  });

  test("throws on negative amount", async () => {
    await expect(generateDecisionProof({ ...base, amount: -1n })).rejects.toThrow("amount harus > 0");
  });

  test("throws on invalid chainId", async () => {
    await expect(generateDecisionProof({ ...base, chainId: 0 })).rejects.toThrow("chainId");
  });

  test("throws on non-integer ttlSeconds", async () => {
    await expect(generateDecisionProof({ ...base, ttlSeconds: 1.5 })).rejects.toThrow("ttlSeconds");
  });

  test("throws on negative ttlSeconds", async () => {
    await expect(generateDecisionProof({ ...base, ttlSeconds: -10 })).rejects.toThrow("ttlSeconds");
  });

  test("throws on invalid blockTimestamp", async () => {
    await expect(generateDecisionProof({ ...base, blockTimestamp: -1 })).rejects.toThrow("blockTimestamp");
  });
});
