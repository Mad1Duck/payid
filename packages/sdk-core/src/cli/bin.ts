#!/usr/bin/env node
/**
 * PAY.ID SDK CLI
 *
 * Usage:
 *   npx payid deploy-rule <rule.json> [options]
 *   npx payid verify-proof <txHash> [options]
 */

import { deployRule } from "./deployRule";
import { verifyProof } from "./verifyProof";

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function showHelp() {
  console.log(`
PAY.ID SDK CLI

Commands:
  deploy-rule <rule.json>   Deploy a rule JSON to IPFS + register on-chain
    --authority <address>    RuleAuthority contract address
    --chain <id>             Chain ID (default: 31337)
    --key <privateKey>       Deployer private key
    --rpc <url>              RPC endpoint
    --output <path>          Write result JSON to file

  verify-proof <txHash>     Verify a Decision Proof on-chain
    --verifier <address>     PayIDVerifier contract address
    --rpc <url>              RPC endpoint
    --signer <address>       Expected signer (optional)

  help                      Show this message
`);
}

async function main() {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp();
    process.exit(0);
  }

  if (command === "deploy-rule") {
    const ruleFile = args[1];
    if (!ruleFile) {
      console.error("Error: rule.json file path required");
      process.exit(1);
    }

    const authority = getFlag("--authority");
    if (!authority) {
      console.error("Error: --authority <RuleAuthority address> required");
      process.exit(1);
    }

    const result = await deployRule({
      ruleFile,
      ruleAuthorityAddress: authority,
      chainId: Number(getFlag("--chain") ?? "31337"),
      privateKey: getFlag("--key") ?? "0x0000000000000000000000000000000000000000000000000000000000000001",
      rpcUrl: getFlag("--rpc") ?? "http://127.0.0.1:8545",
      outputJson: getFlag("--output"),
    });

    if (result.status === "error") {
      console.error("Deploy failed:", result.error);
      process.exit(1);
    }

    console.log("✓ Rule deployed successfully");
    console.log("  Rule hash:", result.ruleHash);
    console.log("  IPFS CID: ", result.ipfsCid);
    console.log("  TX hash:  ", result.txHash);
    process.exit(0);
  }

  if (command === "verify-proof") {
    const txHash = args[1];
    if (!txHash) {
      console.error("Error: txHash required");
      process.exit(1);
    }

    const verifier = getFlag("--verifier");
    if (!verifier) {
      console.error("Error: --verifier <PayIDVerifier address> required");
      process.exit(1);
    }

    const result = await verifyProof({
      txHash,
      payIDVerifierAddress: verifier,
      rpcUrl: getFlag("--rpc") ?? "http://127.0.0.1:8545",
      expectedSigner: getFlag("--signer"),
    });

    if (result.status === "error" || result.status === "not_found") {
      console.error("Verification failed:", result.error);
      process.exit(1);
    }

    console.log(result.valid ? "✓ Proof is VALID" : "✗ Proof is INVALID");
    console.log("  Decision:", result.details?.decision);
    console.log("  Payer:   ", result.details?.payer);
    console.log("  Amount:  ", result.details?.amount);
    console.log("  Asset:   ", result.details?.asset);
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

main();
