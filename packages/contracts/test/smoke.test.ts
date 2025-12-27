import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("SMOKE", async () => {
  const { viem } = await network.connect();

  it("hardhat + viem works", async () => {
    const wallets = await viem.getWalletClients();
    assert.ok(wallets.length > 0);
  });
});
