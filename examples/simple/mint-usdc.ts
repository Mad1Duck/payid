/**
 * UTIL — Mint MockUSDC ke payer wallet
 *
 * Hanya bisa di local hardhat atau testnet dengan MockUSDC.
 * Admin (account[0]) yang mint karena MockUSDC pakai onlyOwner.
 *
 * Run: bun run examples/simple/mint-usdc.ts
 */
import { ethers } from "ethers";
import { envData } from "../config/config";
import usdcAbi from "../shared/PayIDModule#MockUSDC.json";

const {
  rpcUrl: RPC_URL,
  contract: { mockUSDC: USDC },
  account: {
    senderPk: SENDER_PRIVATE_KEY,
    adminPk: DEPLOYER_PRIVATE_KEY
  },
} = envData;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider); // minter
const payerWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

const MINT_AMOUNT = 10_000_000_000n; // 10,000 USDC (6 decimals)

const usdc = new ethers.Contract(USDC, usdcAbi.abi, deployerWallet);

async function main() {
  console.log("Minting USDC...");
  console.log("  Admin (minter):", deployerWallet.address);
  console.log("  Recipient     :", payerWallet.address);
  console.log("  Amount        :", (MINT_AMOUNT / 1_000_000n).toString(), "USDC");

  const tx = await usdc
    .getFunction("mint")
    .send(payerWallet.address, MINT_AMOUNT);

  console.log("TX:", tx.hash);
  await tx.wait();

  const balance: bigint =
    await usdc.getFunction("balanceOf")(payerWallet.address);

  console.log("✅ New balance:", (balance / 1_000_000n).toString(), "USDC");
}

main().catch((err) => {
  console.error("❌", err?.shortMessage ?? err?.reason ?? err?.message);
  process.exit(1);
});