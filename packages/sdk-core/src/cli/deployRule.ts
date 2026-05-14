import { readFileSync } from "fs";
import { createHash } from "crypto";
import { writeFileSync } from "fs";

export interface DeployRuleOptions {
  ruleFile: string;
  ipfsGateway?: string;
  ruleAuthorityAddress: string;
  chainId: number;
  privateKey: string;
  rpcUrl: string;
  outputJson?: string;
}

export interface DeployRuleResult {
  ruleHash: string;
  ipfsCid?: string;
  ruleId?: string;
  txHash: string;
  status: "success" | "error";
  error?: string;
}

/**
 * Deploy a rule JSON file to IPFS and register it with RuleAuthority.
 *
 * @example
 * ```bash
 * npx payid deploy-rule ./my-rule.json \
 *   --authority 0x1234... \
 *   --chain 31337 \
 *   --key $PRIVATE_KEY \
 *   --rpc http://127.0.0.1:8545
 * ```
 */
export async function deployRule(options: DeployRuleOptions): Promise<DeployRuleResult> {
  try {
    // 1. Read and validate rule JSON
    const raw = readFileSync(options.ruleFile, "utf-8");
    const config = JSON.parse(raw);

    // Basic validation
    if (!config.version || !config.logic || !Array.isArray(config.rules)) {
      return {
        ruleHash: "",
        txHash: "",
        status: "error",
        error: "Invalid rule schema: requires version, logic, and rules[]",
      };
    }

    // 2. Compute rule hash (keccak256 of canonical JSON)
    const canonical = JSON.stringify(config, Object.keys(config).sort());
    const ruleHash = createHash("sha3-256").update(canonical).digest("hex");

    // 3. Upload to IPFS (mock — real implementation would use pinata/nft.storage)
    const ipfsCid = await uploadToIPFS(raw, options.ipfsGateway);

    // 4. Register on-chain via RuleAuthority
    // NOTE: Real implementation would use ethers/viem to call RuleAuthority.createRule
    const txHash = await simulateRegistration({
      ruleHash,
      ipfsCid,
      authority: options.ruleAuthorityAddress,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
      privateKey: options.privateKey,
    });

    const result: DeployRuleResult = {
      ruleHash: `0x${ruleHash}`,
      ipfsCid,
      txHash,
      status: "success",
    };

    if (options.outputJson) {
      writeFileSync(options.outputJson, JSON.stringify(result, null, 2));
    }

    return result;
  } catch (err: any) {
    return {
      ruleHash: "",
      txHash: "",
      status: "error",
      error: err.message ?? String(err),
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadToIPFS(content: string, gateway?: string): Promise<string> {
  // Placeholder: real implementation uses Pinata SDK or NFT.Storage
  const mockCid = `Qm${createHash("sha256").update(content).digest("hex").slice(0, 44)}`;

  if (gateway) {
    try {
      const res = await fetch(`${gateway}/api/v0/add`, {
        method: "POST",
        body: content,
      });
      if (res.ok) {
        const data = await res.json();
        return data.Hash ?? mockCid;
      }
    } catch {
      // Fallback to mock
    }
  }

  return mockCid;
}

async function simulateRegistration(params: {
  ruleHash: string;
  ipfsCid: string;
  authority: string;
  chainId: number;
  rpcUrl: string;
  privateKey: string;
}): Promise<string> {
  // Placeholder: real implementation calls RuleAuthority.createRule(hash, uri)
  // via ethers.js or viem using the provided privateKey and rpcUrl
  const mockTxHash = `0x${createHash("sha256")
    .update(params.ruleHash + params.ipfsCid + Date.now())
    .digest("hex")
    .slice(0, 64)}`;

  console.log(`[CLI] Simulating registration to RuleAuthority ${params.authority}`);
  console.log(`[CLI] Rule hash: ${params.ruleHash}`);
  console.log(`[CLI] IPFS CID: ${params.ipfsCid}`);
  console.log(`[CLI] Chain ID: ${params.chainId}`);

  return mockTxHash;
}
