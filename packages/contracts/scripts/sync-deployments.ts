/**
 * sync-deployments.ts
 * Reads Hardhat Ignition deployment results and updates addresses.ts
 * in both frontend/example-product and frontend-docs.
 *
 * Usage:
 *   bun run scripts/sync-deployments.ts
 *   bun run scripts/sync-deployments.ts --network zeroGGalileo
 */

import fs from 'fs';
import path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────

const NETWORK_CHAIN_MAP: Record<string, number> = {
  zeroGTestnet: 16600,
  zeroGFork: 16601,
  zeroGGalileo: 16602,
  zeroGMainnet: 16661,
  devnode: 31337,
  localhost: 31337,
};

const CHAIN_META: Record<number, { name: string, label: string, isTestnet: boolean; }> = {
  16600: { name: "zeroGTestnet", label: "0G Newton Testnet", isTestnet: true },
  16601: { name: "zeroGFork", label: "0G Newton Testnet (Fork)", isTestnet: true },
  16602: { name: "zeroGGalileo", label: "0G Galileo Testnet", isTestnet: true },
  137: { name: "polygon", label: "Polygon", isTestnet: false },
  31337: { name: "devnode", label: "Devnode", isTestnet: true },
};

// Contract name → key in addresses.ts
const CONTRACT_KEY_MAP: Record<string, string> = {
  'PayIDModule#AIAgentRegistry': 'AIAgentRegistry',
  'PayIDModule#AIAgentRuleManager': 'AIAgentRuleManager',
  'PayIDModule#AttestationVerifier': 'AttestationVerifier',
  'PayIDModule#CombinedRuleStorage': 'CombinedRuleStorage',
  'PayIDModule#MockEAS': 'MockEAS',
  'PayIDModule#MockOracle': 'MockOracle',
  'PayIDModule#PayIDVerifier': 'PayIDVerifier',
  'PayIDModule#PayWithPayID': 'PayWithPayID',
  'PayIDModule#PayWithPayIDBatch': 'PayWithPayIDBatch',
  'PayIDModule#RecurringPayments': 'RecurringPayments',
  'PayIDModule#RuleAuthority': 'RuleAuthority',
  'PayIDModule#RuleItemERC721': 'RuleItemERC721',
  'PayIDModule#AgentPayID': 'AgentPayID',
  'PayIDModule#MockAgentRegistry': 'MockAgentRegistry',
  'PayIDModule#VindexRegistry': 'VindexRegistry',
  'PayIDModule#EscrowMilestone': 'EscrowMilestone',
  'PayIDModule#TimeLockVesting': 'TimeLockVesting',
};

// Target frontend addresses.ts files to update
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TARGETS = [
  path.join(REPO_ROOT, 'frontend/example-product/src/constants/contracts/addresses.ts'),
  path.join(REPO_ROOT, 'frontend/frontend-docs/src/constants/contracts/addresses.ts'),
];

// Named --deployment-id directories produced by `deploy:*` scripts
const CHAIN_DEPLOY_DIRS: Record<number, string[]> = {
  16600: ['zerog-newton-v1'],
  16601: ['zerog-fork-v1'],
  16602: ['zerog-galileo-v1'],
  16661: ['zerog-mainnet-v1'],
  31337: ['payid-devnode', 'chain-31337'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findDeploymentDir(chainId: number): string | null {
  const ignitionDeployments = path.join(__dirname, '../ignition/deployments');
  const candidates = [
    `chain-${chainId}`,
    ...(CHAIN_DEPLOY_DIRS[chainId] ?? []),
  ];
  for (const c of candidates) {
    const full = path.join(ignitionDeployments, c);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function readDeployedAddresses(deployDir: string): Record<string, string> {
  const addressFile = path.join(deployDir, 'deployed_addresses.json');
  if (!fs.existsSync(addressFile)) {
    throw new Error(`deployed_addresses.json not found in ${deployDir}`);
  }
  return JSON.parse(fs.readFileSync(addressFile, 'utf-8'));
}

function buildAddressBlock(chainId: number, addresses: Record<string, string>): string {
  const meta = CHAIN_META[chainId];
  const label = meta ? `${meta.label} \u2014 Chain ${chainId}` : `Chain ${chainId}`;
  const lines: string[] = [];
  for (const [ignitionKey, tsKey] of Object.entries(CONTRACT_KEY_MAP)) {
    const addr = addresses[ignitionKey] ?? '0x0000000000000000000000000000000000000000';
    lines.push(`    ${tsKey}: "${addr}" as \`0x\${string}\`,`);
  }
  return `  // ${label}\n  ${chainId}: {\n${lines.join('\n')}\n  }`;
}

function updateAddressesFile(filePath: string, chainId: number, newBlock: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  File not found, skipping: ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  // Normalise line endings; remember original style
  const crlf = raw.includes('\r\n');
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  // Line-based block detection: regex over full content is unreliable because
  // every address property ends with `as \`0x${string}\`` which contains `{` and `}`
  // and breaks greedy [^}]* patterns.
  const openRe = new RegExp(`^  ${chainId}:\\s*\\{\\s*$`);
  let openIdx = -1;
  let closeIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (openRe.test(lines[i])) {
      // Include the preceding comment line in the replacement range if present
      openIdx = (i > 0 && /^\s*\/\//.test(lines[i - 1])) ? i - 1 : i;
      // Closing line is exactly `  }` or `  },` at the same 2-space indent
      for (let j = i + 1; j < lines.length; j++) {
        if (/^  \},?$/.test(lines[j])) {
          closeIdx = j;
          break;
        }
      }
      break;
    }
  }

  let content: string;

  if (openIdx !== -1 && closeIdx !== -1) {
    const before = lines.slice(0, openIdx);
    const after = lines.slice(closeIdx + 1);
    content = [...before, newBlock + ',', ...after].join('\n');
    console.log(`  ✅ Updated chain ${chainId} block`);
  } else {
    // Block not found — insert before the file's closing `} as const`
    content = normalized.replace(/(\n} as const)/, `,\n\n${newBlock}\n$1`);
    console.log(`  ✅ Inserted chain ${chainId} block`);
  }

  // Update header comment
  content = content.replace(/\/\/ Last synced:.*/, `// Last synced: ${new Date().toISOString()}`);

  // Restore original line endings
  if (crlf) content = content.replace(/\n/g, '\r\n');

  fs.writeFileSync(filePath, content, 'utf-8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Resolve --network <name> flag (--network=name or --network name)
  const networkFlagIdx = args.indexOf('--network');
  const networkFlagName =
    args.find(a => a.startsWith('--network='))?.split('=')[1] ??
    (networkFlagIdx !== -1 ? args[networkFlagIdx + 1] : undefined);

  // First positional arg that is not a flag (e.g. raw chain ID)
  const positional = args.find(a => !a.startsWith('-'));

  let chainId: number;
  let networkArg: string;

  if (networkFlagName) {
    // --network <name>
    networkArg = networkFlagName;
    const resolved = NETWORK_CHAIN_MAP[networkArg];
    if (!resolved) {
      console.error(`❌ Unknown network: "${networkArg}". Known: ${Object.keys(NETWORK_CHAIN_MAP).join(', ')}`);
      process.exit(1);
    }
    chainId = resolved;
  } else if (positional && /^\d+$/.test(positional)) {
    // Raw chain ID passed as positional argument (e.g. sync:zerog-fork passes 16601)
    chainId = Number(positional);
    networkArg =
      Object.keys(NETWORK_CHAIN_MAP).find(k => NETWORK_CHAIN_MAP[k] === chainId) ??
      String(chainId);
  } else if (positional) {
    // Network name as positional argument
    networkArg = positional;
    const resolved = NETWORK_CHAIN_MAP[networkArg];
    if (!resolved) {
      console.error(`❌ Unknown network: "${networkArg}". Known: ${Object.keys(NETWORK_CHAIN_MAP).join(', ')}`);
      process.exit(1);
    }
    chainId = resolved;
  } else {
    // Default
    networkArg = 'zeroGGalileo';
    chainId = NETWORK_CHAIN_MAP[networkArg];
  }

  console.log(`\n🔍 Syncing deployments for network: ${networkArg} (Chain ID: ${chainId})\n`);

  const deployDir = findDeploymentDir(chainId);
  if (!deployDir) {
    console.error(`❌ No deployment found for chain ${chainId}. Run: bun hardhat ignition deploy ... --network ${networkArg}`);
    process.exit(1);
  }

  console.log(`📁 Reading from: ${deployDir}`);
  const rawAddresses = readDeployedAddresses(deployDir);

  console.log(`\n📋 Deployed contracts found: ${Object.keys(rawAddresses).length}`);
  for (const [k, v] of Object.entries(rawAddresses)) {
    const friendlyKey = CONTRACT_KEY_MAP[k] || k;
    console.log(`   ${friendlyKey}: ${v}`);
  }

  const newBlock = buildAddressBlock(chainId, rawAddresses);

  console.log('\n📝 Updating frontend files...');
  for (const target of TARGETS) {
    console.log(`\n  → ${path.relative(REPO_ROOT, target)}`);
    updateAddressesFile(target, chainId, newBlock);
  }

  console.log(`\n✅ Sync complete for chain ${chainId} (${networkArg})\n`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
