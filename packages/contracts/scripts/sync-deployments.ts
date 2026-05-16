#!/usr/bin/env bun
/**
 * sync-deployments.ts
 *
 * Syncs Hardhat Ignition deployment artifacts to all frontend consumers.
 *
 * Usage:
 *   bun run scripts/sync-deployments.ts [chainId|all] [--abi-only] [--skip-docs]
 *
 * Outputs:
 *   frontend/example-product/src/constants/contracts/   — per-contract ABI files + multi-chain addresses
 *   frontend/frontend-docs/docs/network/contracts-address.md  — updates address tables
 *
 * Examples:
 *   bun run scripts/sync-deployments.ts           # sync all deployed chains
 *   bun run scripts/sync-deployments.ts 31337     # sync only localhost
 *   bun run scripts/sync-deployments.ts --abi-only  # write ABIs without addresses
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Root Paths ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");          // packages/contracts
const MONO_ROOT = path.resolve(PKG_ROOT, "../..");        // repo root

const ARTIFACT_ROOT = path.join(PKG_ROOT, "artifacts", "contracts");
const IGNITION_DEPLOYMENTS = path.join(PKG_ROOT, "ignition", "deployments");

// Output targets
const EXAMPLE_CONSTANTS = path.resolve(MONO_ROOT, "frontend/example-product/src/constants/contracts");
const DOCS_ADDR_FILE = path.resolve(MONO_ROOT, "frontend/frontend-docs/docs/network/contracts-address.md");

// ── CLI Args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const abiOnly = args.includes("--abi-only");
const skipDocs = args.includes("--skip-docs");
const chainArg = args.find(a => /^\d+$/.test(a) || a === "all") ?? "all";

// ── Contract Registry ─────────────────────────────────────────────────────────
const CONTRACT_NAMES = [
  "AIAgentRegistry",
  "AIAgentRuleManager",
  "AttestationVerifier",
  "CombinedRuleStorage",
  "MockEAS",
  "PayIDVerifier",
  "PayWithPayID",
  "RuleAuthority",
  "RuleItemERC721",
  "AgentPayID",
  "MockAgentRegistry",
  "VindexRegistry",
] as const;

type ContractName = (typeof CONTRACT_NAMES)[number];

// Contracts only shown on local deployments (mocks)
const MOCK_CONTRACTS = new Set<ContractName>([
  "MockEAS", "MockAgentRegistry"
]);

// Display order in docs tables (core first, mocks last)
const DOCS_ORDER: ContractName[] = [
  "AIAgentRegistry",
  "AIAgentRuleManager",
  "RuleAuthority",
  "RuleItemERC721",
  "CombinedRuleStorage",
  "PayIDVerifier",
  "PayWithPayID",
  "AttestationVerifier",
  "AgentPayID",
  "VindexRegistry",
  "MockEAS",
  "MockAgentRegistry",
];

// ── Chain Metadata ────────────────────────────────────────────────────────────
interface ChainMeta {
  name: string;
  label: string;
  isLocal?: boolean;
  isTestnet?: boolean;
}

const CHAIN_META: Record<number, ChainMeta> = {
  31337: { name: "hardhat", label: "Localhost (Hardhat)", isLocal: true },
  4202: { name: "liskSepolia", label: "Lisk Sepolia", isTestnet: true },
  10143: { name: "monadTestnet", label: "Monad Testnet", isTestnet: true },
  1287: { name: "moonbaseAlpha", label: "Moonbase Alpha", isTestnet: true },
  80002: { name: "polygonAmoy", label: "Polygon Amoy", isTestnet: true },
  11155111: { name: "sepolia", label: "Sepolia", isTestnet: true },
  84532: { name: "baseSepolia", label: "Base Sepolia", isTestnet: true },
  137: { name: "polygon", label: "Polygon", isTestnet: false },
  8453: { name: "base", label: "Base", isTestnet: false },
  1284: { name: "moonbeam", label: "Moonbeam", isTestnet: false },
  1285: { name: "moonriver", label: "Moonriver", isTestnet: false },
};

// ── Step 1: Discover deployed chains ─────────────────────────────────────────
interface DeploymentInfo {
  deploymentId: string;
  chainId: number;
}

function readChainIdFromJournal(deploymentId: string): number | null {
  const journalPath = path.join(IGNITION_DEPLOYMENTS, deploymentId, "journal.jsonl");
  if (!fs.existsSync(journalPath)) return null;

  const content = fs.readFileSync(journalPath, "utf8");
  const lines = content.split("\n").filter(Boolean);

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as { chainId?: number; type?: string; };
      if (typeof entry.chainId === "number" && entry.type === "DEPLOYMENT_INITIALIZE") {
        return entry.chainId;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getDeployedChains(): DeploymentInfo[] {
  if (!fs.existsSync(IGNITION_DEPLOYMENTS)) return [];

  const result: DeploymentInfo[] = [];

  for (const entry of fs.readdirSync(IGNITION_DEPLOYMENTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const deploymentId = entry.name;

    if (/^chain-\d+$/.test(deploymentId)) {
      const chainId = parseInt(deploymentId.replace("chain-", ""), 10);
      result.push({ deploymentId, chainId });
    } else {
      const chainId = readChainIdFromJournal(deploymentId);
      if (chainId !== null) {
        result.push({ deploymentId, chainId });
      }
    }
  }

  return result.sort((a, b) => a.chainId - b.chainId);
}

// ── Step 2: Read addresses for a deployment ──────────────────────────────────
function readAddresses(deploymentId: string): Partial<Record<ContractName, string>> | null {
  const file = path.join(IGNITION_DEPLOYMENTS, deploymentId, "deployed_addresses.json");
  if (!fs.existsSync(file)) return null;

  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
  const result: Partial<Record<ContractName, string>> = {};

  for (const [key, address] of Object.entries(raw)) {
    const name = (key.includes("#") ? key.split("#")[1] : key) as ContractName;
    if ((CONTRACT_NAMES as readonly string[]).includes(name)) {
      result[name] = address;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ── Step 3: Read ABIs from Hardhat artifacts ──────────────────────────────────
function findArtifact(contractName: string): string | null {
  function walk(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (entry.name === `${contractName}.json`) {
        return full;
      }
    }
    return null;
  }
  return walk(ARTIFACT_ROOT);
}

function readAllAbis(): Partial<Record<ContractName, unknown[]>> {
  const abis: Partial<Record<ContractName, unknown[]>> = {};
  for (const name of CONTRACT_NAMES) {
    const artifactPath = findArtifact(name);
    if (!artifactPath) {
      console.warn(`    ⚠️   ABI not found for ${name} — skipping (run hardhat compile first)`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abis[name] = artifact.abi;
  }
  return abis;
}

// ── Step 4: Write frontend/example-product/src/constants/contracts/ ──────────
function writeExampleProductConstants(
  allChainAddresses: Record<number, Partial<Record<ContractName, string>>>,
  abis: Partial<Record<ContractName, unknown[]>>,
) {
  fs.mkdirSync(EXAMPLE_CONSTANTS, { recursive: true });

  // ── Per-contract ABI files ────────────────────────────────────────────────
  console.log(`\n📦  Writing ABIs → frontend/example-product/src/constants/contracts/`);

  for (const name of CONTRACT_NAMES) {
    const abi = abis[name];
    if (!abi) continue;

    const varName = name.charAt(0).toLowerCase() + name.slice(1) + "Abi";
    const content =
      `// Auto-generated by sync-deployments.ts — do not edit manually\n` +
      `export const ${varName} = ${JSON.stringify(abi, null, 2)} as const;\n`;

    fs.writeFileSync(path.join(EXAMPLE_CONSTANTS, `${name}.ts`), content);
    console.log(`    ✅  ${name}.ts`);
  }

  // ── addresses.ts (multi-chain) ────────────────────────────────────────────
  const chainBlocks = Object.entries(allChainAddresses).map(([id, addrs]) => {
    const meta = CHAIN_META[Number(id)];
    const label = meta ? `${meta.label} — Chain ${id}` : `Chain ${id}`;
    const rows = CONTRACT_NAMES
      .filter(n => addrs[n])
      .map(n => `    ${n}: "${addrs[n]!}" as \`0x\${string}\``)
      .join(",\n");
    return `  // ${label}\n  ${id}: {\n${rows}\n  }`;
  });

  const addressesContent =
    `// Auto-generated by sync-deployments.ts — do not edit manually\n` +
    `// Last synced: ${new Date().toISOString()}\n\n` +
    `export const addresses = {\n` +
    chainBlocks.join(",\n") +
    `\n} as const;\n\n` +
    `export type SupportedChainId = keyof typeof addresses;\n`;

  fs.writeFileSync(path.join(EXAMPLE_CONSTANTS, "addresses.ts"), addressesContent);
  console.log(`    ✅  addresses.ts  (chains: ${Object.keys(allChainAddresses).join(", ")})`);

  // ── chain.ts ──────────────────────────────────────────────────────────────
  const chainEntries = Object.entries(CHAIN_META).map(([id, m]) => {
    const flags = [
      m.isLocal ? "isLocal: true as const" : null,
      m.isTestnet === true ? "isTestnet: true as const" : null,
      m.isTestnet === false ? "isTestnet: false as const" : null,
    ].filter(Boolean).join(", ");
    return `  ${id}: { name: "${m.name}", label: "${m.label}"${flags ? `, ${flags}` : ""} }`;
  });

  const chainContent =
    `// Auto-generated by sync-deployments.ts — do not edit manually\n\n` +
    `export const chainMeta = {\n${chainEntries.join(",\n")}\n} as const;\n\n` +
    `export type ChainId = keyof typeof chainMeta;\n`;

  fs.writeFileSync(path.join(EXAMPLE_CONSTANTS, "chain.ts"), chainContent);
  console.log(`    ✅  chain.ts`);

  // ── index.ts ──────────────────────────────────────────────────────────────
  const abiExports = CONTRACT_NAMES
    .filter(n => abis[n])
    .map(n => {
      const varName = n.charAt(0).toLowerCase() + n.slice(1) + "Abi";
      return `export { ${varName} } from './${n}';`;
    })
    .join("\n");

  const indexContent =
    `// Auto-generated by sync-deployments.ts — do not edit manually\n\n` +
    `export { addresses } from './addresses';\n` +
    `export type { SupportedChainId } from './addresses';\n` +
    `export { chainMeta } from './chain';\n` +
    `export type { ChainId } from './chain';\n` +
    `${abiExports}\n`;

  fs.writeFileSync(path.join(EXAMPLE_CONSTANTS, "index.ts"), indexContent);
  console.log(`    ✅  index.ts`);
}

// ── Step 5: Update docs/network/contracts-address.md ─────────────────────────
/**
 * Sync markers delimit auto-generated address tables:
 *   <!-- sync:31337:start -->
 *   | Contract | Address |
 *   |---|---|
 *   ...rows...
 *   <!-- sync:31337:end -->
 *
 * First run: injects markers + table into the existing section.
 * Subsequent runs: replaces content between existing markers.
 */
function buildDocsTable(
  addrs: Partial<Record<ContractName, string>>,
  isLocal: boolean,
): string {
  const rows = DOCS_ORDER
    .filter(n => addrs[n])
    .map(n => {
      const suffix = MOCK_CONTRACTS.has(n) && isLocal ? " (local only)" : "";
      return `| \`${n}\`${suffix} | \`${addrs[n]!}\` |`;
    });

  return `| Contract | Address |\n|---|---|\n${rows.join("\n")}`;
}

function updateDocsAddresses(
  allChainAddresses: Record<number, Partial<Record<ContractName, string>>>,
) {
  if (!fs.existsSync(DOCS_ADDR_FILE)) {
    console.warn(`    ⚠️   Docs file not found: ${DOCS_ADDR_FILE}`);
    return;
  }

  let content = fs.readFileSync(DOCS_ADDR_FILE, "utf8");
  let changed = false;

  for (const [chainIdStr, addrs] of Object.entries(allChainAddresses)) {
    const chainId = Number(chainIdStr);
    const meta = CHAIN_META[chainId];
    const label = meta?.label ?? `Chain ${chainId}`;
    const isLocal = !!meta?.isLocal;
    const newTable = buildDocsTable(addrs, isLocal);

    const startMarker = `<!-- sync:${chainId}:start -->`;
    const endMarker = `<!-- sync:${chainId}:end -->`;

    if (content.includes(startMarker) && content.includes(endMarker)) {
      // Markers already exist — replace between them
      const markerRegex = new RegExp(
        `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g",
      );
      const replacement = `${startMarker}\n${newTable}\n${endMarker}`;
      content = content.replace(markerRegex, replacement);
      console.log(`    ✅  Updated ${label} table (chain ${chainId})`);
      changed = true;
    } else {
      // First run: find the section heading + existing table, inject markers
      // The heading contains the chainId number
      const headingRegex = new RegExp(`(^## [^\n]*${chainId}[^\n]*$)`, "m");
      const headingMatch = headingRegex.exec(content);

      if (!headingMatch) {
        // No section for this chain yet — append one before the last "---" divider or EOF
        const section = buildNewDocsSection(chainId, addrs, isLocal, newTable, startMarker, endMarker);
        // Insert before "## Other Networks" or append
        const insertBefore = "## Other Networks";
        if (content.includes(insertBefore)) {
          content = content.replace(insertBefore, `${section}\n---\n\n${insertBefore}`);
        } else {
          content = content + `\n\n---\n\n${section}`;
        }
        console.log(`    ✅  Added new section for ${label} (chain ${chainId})`);
        changed = true;
        continue;
      }

      const headingEnd = headingMatch.index + headingMatch[0].length;
      const afterHeading = content.slice(headingEnd);

      // Find the table inside this section (between heading and next "---" or next "##")
      const nextSectionMatch = /\n---\n|\n## /.exec(afterHeading);
      const sectionBody = nextSectionMatch
        ? afterHeading.slice(0, nextSectionMatch.index)
        : afterHeading;

      // Find the table block (| Contract | Address | ...)
      const tableMatch = /(\| Contract \| Address \|[\s\S]*?)(\n\n|\n(?=[^|]))/.exec(sectionBody);

      if (tableMatch) {
        const tableStart = headingEnd + sectionBody.indexOf(tableMatch[0]);
        const tableEnd = tableStart + tableMatch[1].length;

        const before = content.slice(0, tableStart);
        const after = content.slice(tableEnd);
        content = `${before}${startMarker}\n${newTable}\n${endMarker}${after}`;
        console.log(`    ✅  Injected sync markers + updated ${label} (chain ${chainId})`);
        changed = true;
      } else {
        // Section exists but no table — append table after the section heading paragraph
        const insertPos = headingEnd + (nextSectionMatch ? nextSectionMatch.index : sectionBody.length);
        content =
          content.slice(0, insertPos) +
          `\n\n${startMarker}\n${newTable}\n${endMarker}` +
          content.slice(insertPos);
        console.log(`    ✅  Appended table for ${label} (chain ${chainId})`);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(DOCS_ADDR_FILE, content);
    console.log(`    📝  Saved: docs/network/contracts-address.md`);
  } else {
    console.log(`    ℹ️   No changes to docs`);
  }
}

function buildNewDocsSection(
  chainId: number,
  addrs: Partial<Record<ContractName, string>>,
  isLocal: boolean,
  table: string,
  startMarker: string,
  endMarker: string,
): string {
  const meta = CHAIN_META[chainId] ?? { label: `Chain ${chainId}`, name: `chain-${chainId}` };
  const label = meta.label;

  return [
    `## ${label} (Chain ID: ${chainId})`,
    ``,
    `${startMarker}`,
    table,
    `${endMarker}`,
    ``,
    `\`\`\`bash`,
    `cd packages/contracts`,
    `bun run deploy:${meta.name}`,
    `\`\`\``,
  ].join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🔄  PAY.ID — sync-deployments`);
console.log(`    Mode:  ${abiOnly ? "ABI-only" : "full sync"}`);
console.log(`    Chain: ${chainArg}`);

// Read ABIs (always needed)
console.log(`\n🔍  Reading ABIs from artifacts/contracts/...`);
const abis = readAllAbis();
const abiCount = Object.keys(abis).length;
console.log(`    Found ${abiCount} / ${CONTRACT_NAMES.length} contract ABIs`);

if (abiCount === 0) {
  console.error(`\n❌  No ABIs found. Run "bun run hardhat:compile" first.`);
  process.exit(1);
}

// Determine chains
let deployments: DeploymentInfo[] = [];
if (!abiOnly) {
  if (chainArg === "all") {
    deployments = getDeployedChains();
    if (deployments.length === 0) {
      console.log(`\n⚠️   No ignition deployments found. Continuing in ABI-only mode.`);
    } else {
      const uniqueChains = [...new Set(deployments.map(d => d.chainId))];
      console.log(`\n🔍  Discovered ${deployments.length} deployment(s) for chain(s): ${uniqueChains.join(", ")}`);
    }
  } else {
    const chainId = parseInt(chainArg, 10);
    deployments = getDeployedChains().filter(d => d.chainId === chainId);
  }
}

// Read addresses — pick the fullest deployment per chain
const chainDeploymentMap: Record<number, { deploymentId: string; count: number; addrs: Partial<Record<ContractName, string>>; }> = {};

for (const { deploymentId, chainId } of deployments) {
  const addrs = readAddresses(deploymentId);
  if (!addrs) {
    console.warn(`    ⚠️   No addresses found for deployment "${deploymentId}" — skipping`);
    continue;
  }

  const count = Object.keys(addrs).length;
  const existing = chainDeploymentMap[chainId];

  if (!existing) {
    chainDeploymentMap[chainId] = { deploymentId, count, addrs };
  } else {
    // Merge addresses from this deployment into existing (same chain)
    for (const [name, address] of Object.entries(addrs)) {
      if (address) existing.addrs[name as ContractName] = address;
    }
    existing.count = Object.keys(existing.addrs).length;
  }
}

const allChainAddresses: Record<number, Partial<Record<ContractName, string>>> = {};

for (const [chainIdStr, data] of Object.entries(chainDeploymentMap)) {
  const chainId = Number(chainIdStr);
  const meta = CHAIN_META[chainId];
  console.log(`\n📋  Chain ${chainId} (${meta?.label ?? "unknown"}) — merged ${data.count} contracts:`);
  for (const name of CONTRACT_NAMES) {
    if (data.addrs[name]) {
      const isMock = MOCK_CONTRACTS.has(name);
      console.log(`    ${(isMock ? "  " : "") + name.padEnd(28)} ${data.addrs[name]}`);
    }
  }
  allChainAddresses[chainId] = data.addrs;
}

// Write outputs
writeExampleProductConstants(allChainAddresses, abis);

if (!skipDocs && !abiOnly && Object.keys(allChainAddresses).length > 0) {
  console.log(`\n📝  Updating docs/network/contracts-address.md...`);
  updateDocsAddresses(allChainAddresses);
}

// ── Done ──────────────────────────────────────────────────────────────────────
const syncedChains = Object.keys(allChainAddresses);
const syncedContracts = CONTRACT_NAMES.filter(n => abis[n]);

console.log(`
✨  Sync complete!${abiOnly ? " (ABI-only)" : ""}

   frontend/example-product/src/constants/contracts/
   ├── index.ts          (re-exports everything)
   ├── addresses.ts      (${syncedChains.length} chain${syncedChains.length !== 1 ? "s" : ""}: ${syncedChains.join(", ") || "—"})
   ├── chain.ts          (chain metadata)
   └── ${syncedContracts.map(n => `${n}.ts`).join("\n       ")}
${!skipDocs && !abiOnly && syncedChains.length > 0 ? "\n   frontend/frontend-docs/docs/network/contracts-address.md\n   └── address tables updated\n" : ""}
   Import in your app:
   import { addresses, ruleItemERC721Abi } from '@/constants/contracts'
   const addr = addresses[chainId].RuleItemERC721
`);
