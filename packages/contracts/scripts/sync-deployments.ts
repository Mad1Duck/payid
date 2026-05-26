/**
 * sync-deployments.ts
 * Reads Hardhat Ignition deployment results and updates:
 *   - addresses.ts        (contract addresses per chain)
 *   - chainRegistry.ts    (viem Chain objects — auto-generated, imported by main.tsx)
 *   - chain.ts            (chainMeta — auto-generated)
 *
 * Usage:
 *   bun run scripts/sync-deployments.ts
 *   bun run scripts/sync-deployments.ts --network zeroGGalileo
 *   bun run scripts/sync-deployments.ts --network myChain --rpc-url http://... --chain-name "My Chain" --native-symbol ETH
 */

import fs from 'fs';
import path from 'path';

// ─── Single source of truth for all known chains ─────────────────────────────
//
// To add a new chain permanently:
//   1. Add an entry here with all metadata
//   2. Run sync — chainRegistry.ts, chain.ts, and addresses.ts are all auto-updated
//   That's it. No manual edits to main.tsx or any other file.

type ChainFullMeta = {
  networkName: string;    // name used in --network flag and hardhat config
  label: string;          // displayed in UI
  isTestnet: boolean;
  deployDirs: string[];   // candidate ignition deployment dir names
  envVar?: string;        // VITE_xxx_RPC_URL override (optional)
  defaultRpcUrl: string;  // fallback RPC URL
  nativeCurrency: { name: string; symbol: string; decimals: number; };
  blockExplorer?: { name: string; url: string; };
};

const CHAIN_FULL_META: Record<number, ChainFullMeta> = {
  16600: {
    networkName: 'zeroGTestnet',
    label: '0G Newton Testnet',
    isTestnet: true,
    deployDirs: ['zerog-newton-v1'],
    envVar: 'VITE_ZEROG_NEWTON_RPC_URL',
    defaultRpcUrl: 'https://16600.rpc.thirdweb.com',
    nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
    blockExplorer: { name: '0G Explorer', url: 'https://chainscan-newton.0g.ai' },
  },
  16601: {
    networkName: 'zeroGFork',
    label: '0G Newton Testnet (Fork)',
    isTestnet: true,
    deployDirs: ['zerog-fork-v1'],
    envVar: 'VITE_ZEROG_FORK_RPC_URL',
    defaultRpcUrl: 'http://100.73.196.95:8550',
    nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
    blockExplorer: { name: '0G Explorer', url: 'https://chainscan-newton.0g.ai' },
  },
  16602: {
    networkName: 'zeroGGalileo',
    label: '0G Galileo Testnet',
    isTestnet: true,
    deployDirs: ['zerog-galileo-v1', 'chain-16602'],
    envVar: 'VITE_ZEROG_GALILEO_RPC_URL',
    defaultRpcUrl: 'https://evmrpc-testnet.0g.ai',
    nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
    blockExplorer: { name: '0G Galileo Explorer', url: 'https://chainscan-galileo.0g.ai' },
  },
  16661: {
    networkName: 'zeroGMainnet',
    label: '0G Mainnet',
    isTestnet: false,
    deployDirs: ['zerog-mainnet-v1'],
    envVar: 'VITE_ZEROG_MAINNET_RPC_URL',
    defaultRpcUrl: 'https://evmrpc.0g.ai',
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    blockExplorer: { name: '0G Explorer', url: 'https://chainscan.0g.ai' },
  },
  31337: {
    networkName: 'devnode',
    label: 'DevNode',
    isTestnet: true,
    deployDirs: ['payid-devnode', 'chain-31337'],
    envVar: 'VITE_DEV_NODE_RPC_URL',
    defaultRpcUrl: '/rpc',
    nativeCurrency: { name: 'Dev Token', symbol: 'DEV', decimals: 18 },
  },
  31338: {
    networkName: 'localFork',
    label: 'Local Fork',
    isTestnet: true,
    deployDirs: ['local-fork-v1', 'chain-31338'],
    envVar: 'VITE_LOCAL_FORK_RPC_URL',
    defaultRpcUrl: 'http://100.73.196.95:8550',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
  421614: {
    networkName: 'arbitrumSepolia',
    label: 'Arbitrum Sepolia',
    isTestnet: true,
    deployDirs: ['arbitrum-sepolia-v1', 'chain-421614'],
    envVar: 'VITE_ARBITRUM_SEPOLIA_RPC_URL',
    defaultRpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: { name: 'Arbiscan Sepolia', url: 'https://sepolia.arbiscan.io' },
  },
};

// Aliases: hardhat network name → canonical networkName in CHAIN_FULL_META
const NETWORK_ALIASES: Record<string, string> = {
  localhost: 'devnode',
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

const REPO_ROOT = path.resolve(__dirname, '../../..');

// Target addresses.ts files
const ADDRESS_TARGETS = [
  path.join(REPO_ROOT, 'frontend/example-product/src/constants/contracts/addresses.ts'),
  path.join(REPO_ROOT, 'frontend/frontend-docs/src/constants/contracts/addresses.ts'),
];

// Generated chain files (one per frontend app)
const CHAIN_REGISTRY_TARGET = path.join(REPO_ROOT, 'frontend/example-product/src/constants/contracts/chainRegistry.ts');
const CHAIN_META_TARGET = path.join(REPO_ROOT, 'frontend/example-product/src/constants/contracts/chain.ts');

// ─── Derived maps (from CHAIN_FULL_META — do not edit manually) ──────────────

function buildNetworkChainMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [id, meta] of Object.entries(CHAIN_FULL_META)) {
    map[meta.networkName] = Number(id);
  }
  for (const [alias, canonical] of Object.entries(NETWORK_ALIASES)) {
    const target = Object.values(CHAIN_FULL_META).find(m => m.networkName === canonical);
    if (target) {
      const id = Object.entries(CHAIN_FULL_META).find(([, m]) => m.networkName === canonical)?.[0];
      if (id) map[alias] = Number(id);
    }
  }
  return map;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findDeploymentDir(chainId: number): string | null {
  const ignitionDeployments = path.join(__dirname, '../ignition/deployments');
  const meta = CHAIN_FULL_META[chainId];
  const candidates = [
    `chain-${chainId}`,
    ...(meta?.deployDirs ?? []),
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
  const meta = CHAIN_FULL_META[chainId];
  const label = meta ? `${meta.label} — Chain ${chainId}` : `Chain ${chainId}`;
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
  const crlf = raw.includes('\r\n');
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const openRe = new RegExp(`^  ${chainId}:\\s*\\{\\s*$`);
  let openIdx = -1;
  let closeIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (openRe.test(lines[i])) {
      openIdx = (i > 0 && /^\s*\/\//.test(lines[i - 1])) ? i - 1 : i;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^  \},?$/.test(lines[j])) { closeIdx = j; break; }
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
    content = normalized.replace(/(\n} as const)/, `,\n\n${newBlock}\n$1`);
    console.log(`  ✅ Inserted chain ${chainId} block`);
  }

  content = content.replace(/\/\/ Last synced:.*/, `// Last synced: ${new Date().toISOString()}`);
  if (crlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ─── Generated file: chainRegistry.ts ────────────────────────────────────────

function buildChainRegistryFile(
  extraChain?: { id: number; label: string; envVar: string; defaultRpcUrl: string; nativeCurrency: ChainFullMeta['nativeCurrency']; blockExplorer?: ChainFullMeta['blockExplorer']; }
): string {
  const allChains = { ...CHAIN_FULL_META };
  if (extraChain) {
    allChains[extraChain.id] = {
      networkName: `chain${extraChain.id}`,
      label: extraChain.label,
      isTestnet: true,
      deployDirs: [`chain-${extraChain.id}`],
      envVar: extraChain.envVar,
      defaultRpcUrl: extraChain.defaultRpcUrl,
      nativeCurrency: extraChain.nativeCurrency,
      blockExplorer: extraChain.blockExplorer,
    };
  }

  const chainBlocks = Object.entries(allChains).map(([id, meta]) => {
    const rpcExpr = meta.envVar
      ? `import.meta.env.${meta.envVar} ?? '${meta.defaultRpcUrl}'`
      : `'${meta.defaultRpcUrl}'`;
    const explorerBlock = meta.blockExplorer
      ? `\n    blockExplorers: {\n      default: { name: '${meta.blockExplorer.name}', url: '${meta.blockExplorer.url}' },\n    },`
      : '';
    return (
      `  // ${meta.label}\n` +
      `  ${id}: {\n` +
      `    id: ${id},\n` +
      `    name: '${meta.label}',\n` +
      `    nativeCurrency: { decimals: ${meta.nativeCurrency.decimals}, name: '${meta.nativeCurrency.name}', symbol: '${meta.nativeCurrency.symbol}' },\n` +
      `    rpcUrls: {\n` +
      `      default: { http: [${rpcExpr}] },\n` +
      `      public: { http: [${rpcExpr}] },\n` +
      `    },${explorerBlock}\n` +
      `  }`
    );
  });

  return (
    `// Auto-generated by sync-deployments.ts — do not edit manually\n` +
    `// Last synced: ${new Date().toISOString()}\n` +
    `//\n` +
    `// To add a new chain: edit CHAIN_FULL_META in packages/contracts/scripts/sync-deployments.ts\n` +
    `// then run the sync command. This file will be regenerated automatically.\n\n` +
    `import type { Chain } from 'viem'\n\n` +
    `export const CHAIN_REGISTRY: Record<number, Chain> = {\n` +
    chainBlocks.join(',\n\n') + ',\n' +
    `}\n`
  );
}

function writeChainRegistry(extraChain?: Parameters<typeof buildChainRegistryFile>[0]): void {
  if (!fs.existsSync(path.dirname(CHAIN_REGISTRY_TARGET))) {
    console.warn(`  ⚠️  chainRegistry target dir not found, skipping`);
    return;
  }
  const content = buildChainRegistryFile(extraChain);
  fs.writeFileSync(CHAIN_REGISTRY_TARGET, content, 'utf-8');
  console.log(`  ✅ Generated chainRegistry.ts (${Object.keys(CHAIN_FULL_META).length + (extraChain ? 1 : 0)} chains)`);
}

// ─── Generated file: chain.ts (chainMeta) ────────────────────────────────────

function buildChainMetaFile(
  extraChain?: { id: number; label: string; networkName: string; isTestnet: boolean; }
): string {
  const allChains = { ...CHAIN_FULL_META };
  if (extraChain) {
    allChains[extraChain.id] = {
      ...allChains[extraChain.id],
      networkName: extraChain.networkName,
      label: extraChain.label,
      isTestnet: extraChain.isTestnet,
    } as ChainFullMeta;
  }

  const entries = Object.entries(allChains).map(([id, meta]) => {
    const isLocalProp = !meta.isTestnet
      ? `isTestnet: false as const`
      : Number(id) >= 31337
        ? `isTestnet: true as const`
        : `isTestnet: true as const`;
    return `  ${id}: { name: "${meta.networkName}", label: "${meta.label}", ${isLocalProp} }`;
  });

  return (
    `// Auto-generated by sync-deployments.ts — do not edit manually\n\n` +
    `export const chainMeta = {\n` +
    entries.join(',\n') + ',\n' +
    `} as const;\n\n` +
    `export type ChainId = keyof typeof chainMeta;\n`
  );
}

function writeChainMeta(extraChain?: Parameters<typeof buildChainMetaFile>[0]): void {
  if (!fs.existsSync(path.dirname(CHAIN_META_TARGET))) {
    console.warn(`  ⚠️  chain.ts target dir not found, skipping`);
    return;
  }
  const content = buildChainMetaFile(extraChain);
  fs.writeFileSync(CHAIN_META_TARGET, content, 'utf-8');
  console.log(`  ✅ Generated chain.ts`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const getFlag = (name: string) =>
    args.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ??
    (() => { const i = args.indexOf(`--${name}`); return i !== -1 ? args[i + 1] : undefined; })();

  const networkFlagName = getFlag('network');
  const rpcUrlFlag = getFlag('rpc-url');
  const chainNameFlag = getFlag('chain-name');
  const nativeSymbolFlag = getFlag('native-symbol') ?? 'ETH';
  const positional = args.find(a => !a.startsWith('-'));

  const NETWORK_CHAIN_MAP = buildNetworkChainMap();

  let chainId: number;
  let networkArg: string;

  if (networkFlagName) {
    networkArg = NETWORK_ALIASES[networkFlagName] ?? networkFlagName;
    const resolved = NETWORK_CHAIN_MAP[networkArg];
    if (!resolved) {
      console.error(`❌ Unknown network: "${networkFlagName}". Known: ${Object.keys(NETWORK_CHAIN_MAP).join(', ')}`);
      process.exit(1);
    }
    chainId = resolved;
  } else if (positional && /^\d+$/.test(positional)) {
    chainId = Number(positional);
    networkArg =
      Object.entries(NETWORK_CHAIN_MAP).find(([, id]) => id === chainId)?.[0] ??
      String(chainId);
  } else if (positional) {
    networkArg = NETWORK_ALIASES[positional] ?? positional;
    const resolved = NETWORK_CHAIN_MAP[networkArg];
    if (!resolved) {
      console.error(`❌ Unknown network: "${positional}". Known: ${Object.keys(NETWORK_CHAIN_MAP).join(', ')}`);
      process.exit(1);
    }
    chainId = resolved;
  } else {
    networkArg = 'zeroGGalileo';
    chainId = NETWORK_CHAIN_MAP[networkArg];
  }

  console.log(`\n🔍 Syncing deployments for network: ${networkArg} (Chain ID: ${chainId})\n`);

  // Handle completely unknown chain (not in CHAIN_FULL_META)
  let extraChain: Parameters<typeof writeChainRegistry>[0] | undefined;
  if (!CHAIN_FULL_META[chainId]) {
    if (!rpcUrlFlag) {
      console.error(
        `❌ Chain ${chainId} is not in CHAIN_FULL_META.\n` +
        `   Either add it to sync-deployments.ts, or pass --rpc-url <url> --chain-name "<name>" for a one-time sync.`
      );
      process.exit(1);
    }
    const label = chainNameFlag ?? `Chain ${chainId}`;
    const envVar = `VITE_CHAIN_${chainId}_RPC_URL`;
    extraChain = {
      id: chainId,
      label,
      envVar,
      defaultRpcUrl: rpcUrlFlag,
      nativeCurrency: { name: nativeSymbolFlag, symbol: nativeSymbolFlag, decimals: 18 },
    };
    console.warn(
      `⚠️  Chain ${chainId} is not in CHAIN_FULL_META.\n` +
      `   Syncing with --rpc-url as a one-time override.\n` +
      `   To make it permanent, add it to CHAIN_FULL_META in sync-deployments.ts.\n`
    );
  }

  const deployDir = findDeploymentDir(chainId);
  if (!deployDir) {
    console.error(`❌ No deployment found for chain ${chainId}. Run: bun hardhat ignition deploy ... --network ${networkArg}`);
    process.exit(1);
  }

  console.log(`📁 Reading from: ${deployDir}`);
  const rawAddresses = readDeployedAddresses(deployDir);

  console.log(`\n📋 Deployed contracts found: ${Object.keys(rawAddresses).length}`);
  for (const [k, v] of Object.entries(rawAddresses)) {
    console.log(`   ${CONTRACT_KEY_MAP[k] || k}: ${v}`);
  }

  const newBlock = buildAddressBlock(chainId, rawAddresses);

  console.log('\n📝 Updating addresses.ts...');
  for (const target of ADDRESS_TARGETS) {
    console.log(`\n  → ${path.relative(REPO_ROOT, target)}`);
    updateAddressesFile(target, chainId, newBlock);
  }

  console.log('\n📝 Regenerating chainRegistry.ts and chain.ts...');
  writeChainRegistry(extraChain);
  writeChainMeta(extraChain ? { id: chainId, label: extraChain.label, networkName: `chain${chainId}`, isTestnet: true } : undefined);

  console.log(`\n✅ Sync complete for chain ${chainId} (${networkArg})\n`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
