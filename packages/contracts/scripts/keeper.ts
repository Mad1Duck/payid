#!/usr/bin/env bun
/**
 * keeper.ts
 *
 * Off-chain cron/keeper service for PAY.ID advanced contracts.
 *
 * Responsibilities:
 *   1. RecurringPayments — call charge() when nextChargeTime <= now
 *   2. TimeLockVesting  — call release() when vested amount > 0
 *   3. EscrowMilestone  — call autoRefund() when deadline passed
 *
 * Usage:
 *   PRIVATE_KEY=0x... RPC_URL=https://... bun run scripts/keeper.ts --chainId 31337
 *
 *   # Dry-run (no transactions)
 *   bun run scripts/keeper.ts --chainId 31337 --dry-run
 *
 *   # Single run (default = loop every 60s)
 *   bun run scripts/keeper.ts --chainId 31337 --once
 */

import { createPublicClient, createWalletClient, http, parseAbi, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.resolve(__dirname, '..')

// ── CLI ────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const chainIdArg = args.find(a => /^\d+$/.test(a)) ?? '31337'
const chainId = Number(chainIdArg)
const dryRun = args.includes('--dry-run')
const once = args.includes('--once')

// ── Env ────────────────────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ''
const RPC_URL = process.env.RPC_URL ?? (
  chainId === 31337 ? 'http://127.0.0.1:8545' : ''
)

if (!RPC_URL) {
  console.error('Missing RPC_URL. Set env or use localhost (chainId 31337).')
  process.exit(1)
}

// ── Contracts ─────────────────────────────────────────────────────────────────
// ABIs (minimal)
const RECURRING_ABI = parseAbi([
  'function subscriptionCount() view returns (uint256)',
  'function subscriptions(uint256) view returns (address payer, address receiver, address asset, uint256 maxAmount, uint256 period, uint256 nextChargeTime, bool active)',
  'function charge(uint256 subId, bytes calldata decisionProof)',
  'event SubscriptionCreated(uint256 indexed subId, address indexed payer, address indexed receiver)',
  'event Charged(uint256 indexed subId, uint256 amount)',
])

const VESTING_ABI = parseAbi([
  'function scheduleCount() view returns (uint256)',
  'function schedules(uint256) view returns (address beneficiary, address asset, uint256 totalAmount, uint256 released, uint256 startTime, uint256 cliff, uint256 duration, address revoker, bool revoked)',
  'function releasable(uint256 scheduleId) view returns (uint256)',
  'function release(uint256 scheduleId)',
  'event Released(uint256 indexed scheduleId, uint256 amount)',
])

const ESCROW_ABI = parseAbi([
  'function escrowCount() view returns (uint256)',
  'function escrows(uint256) view returns (address client, address freelancer, address arbiter, address asset, uint256 totalAmount, uint256 deadline, uint8 status)',
  'function autoRefund(uint256 escrowId)',
  'event AutoRefunded(uint256 indexed escrowId)',
])

// Addresses (hardcoded per chain for demo; replace with ignition lookup)
const ADDRESSES: Record<number, { recurring?: string; vesting?: string; escrow?: string }> = {
  31337: {
    recurring: '0x0000000000000000000000000000000000000000',
    vesting: '0x0000000000000000000000000000000000000000',
    escrow: '0x0000000000000000000000000000000000000000',
  },
}

const addr = ADDRESSES[chainId] ?? {}

// ── Clients ─────────────────────────────────────────────────────────────────────
const transport = http(RPC_URL)
const publicClient = createPublicClient({ transport })

let walletClient: ReturnType<typeof createWalletClient> | null = null
if (PRIVATE_KEY) {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
  walletClient = createWalletClient({ account, transport })
} else if (!dryRun) {
  console.error('Missing PRIVATE_KEY. Use --dry-run to simulate.')
  process.exit(1)
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function log(label: string, msg: string) {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [${label}] ${msg}`)
}

async function tryCall(label: string, fn: () => Promise<any>) {
  try {
    return await fn()
  } catch (e: any) {
    log('ERR', `${label}: ${e.shortMessage ?? e.message}`)
    return null
  }
}

// ── Tasks ───────────────────────────────────────────────────────────────────────
async function checkRecurring() {
  if (!addr.recurring || addr.recurring === '0x0000000000000000000000000000000000000000') return
  const count = await publicClient.readContract({
    address: addr.recurring as `0x${string}`,
    abi: RECURRING_ABI,
    functionName: 'subscriptionCount',
  })
  log('RECUR', `${count} subscriptions`)

  for (let i = 1; i <= Number(count); i++) {
    const sub = await publicClient.readContract({
      address: addr.recurring as `0x${string}`,
      abi: RECURRING_ABI,
      functionName: 'subscriptions',
      args: [BigInt(i)],
    })
    const [payer, receiver, asset, maxAmount, period, nextChargeTime, active] = sub as any
    if (!active) continue

    const now = Math.floor(Date.now() / 1000)
    if (Number(nextChargeTime) <= now) {
      log('RECUR', `Sub #${i} due. Receiver=${receiver}, max=${formatEther(maxAmount)}`)
      if (dryRun) continue
      if (!walletClient) continue
      const hash = await walletClient.writeContract({
        address: addr.recurring as `0x${string}`,
        abi: RECURRING_ABI,
        functionName: 'charge',
        args: [BigInt(i), '0x'], // decisionProof placeholder
      })
      log('RECUR', `charge() tx: ${hash}`)
    }
  }
}

async function checkVesting() {
  if (!addr.vesting || addr.vesting === '0x0000000000000000000000000000000000000000') return
  const count = await publicClient.readContract({
    address: addr.vesting as `0x${string}`,
    abi: VESTING_ABI,
    functionName: 'scheduleCount',
  })
  log('VEST', `${count} schedules`)

  for (let i = 1; i <= Number(count); i++) {
    const releasable = await tryCall('releasable', () =>
      publicClient.readContract({
        address: addr.vesting as `0x${string}`,
        abi: VESTING_ABI,
        functionName: 'releasable',
        args: [BigInt(i)],
      })
    )
    if (!releasable || releasable === 0n) continue

    log('VEST', `Schedule #${i} releasable: ${formatEther(releasable)}`)
    if (dryRun) continue
    if (!walletClient) continue
    const hash = await walletClient.writeContract({
      address: addr.vesting as `0x${string}`,
      abi: VESTING_ABI,
      functionName: 'release',
      args: [BigInt(i)],
    })
    log('VEST', `release() tx: ${hash}`)
  }
}

async function checkEscrow() {
  if (!addr.escrow || addr.escrow === '0x0000000000000000000000000000000000000000') return
  const count = await publicClient.readContract({
    address: addr.escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'escrowCount',
  })
  log('ESCROW', `${count} escrows`)

  for (let i = 1; i <= Number(count); i++) {
    const escrow = await publicClient.readContract({
      address: addr.escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'escrows',
      args: [BigInt(i)],
    })
    const [, , , , , deadline, status] = escrow as any
    // status: 0=Active, 1=Completed, 2=Refunded, 3=Disputed
    if (status !== 0) continue

    const now = Math.floor(Date.now() / 1000)
    if (Number(deadline) <= now) {
      log('ESCROW', `Escrow #${i} expired. Triggering autoRefund.`)
      if (dryRun) continue
      if (!walletClient) continue
      const hash = await walletClient.writeContract({
        address: addr.escrow as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'autoRefund',
        args: [BigInt(i)],
      })
      log('ESCROW', `autoRefund() tx: ${hash}`)
    }
  }
}

// ── Main Loop ───────────────────────────────────────────────────────────────────
async function run() {
  log('KEEPER', `chainId=${chainId} dryRun=${dryRun}`)
  await checkRecurring()
  await checkVesting()
  await checkEscrow()
}

if (once) {
  run().then(() => process.exit(0))
} else {
  const INTERVAL_MS = 60_000
  log('KEEPER', `Looping every ${INTERVAL_MS}ms. Press Ctrl+C to stop.`)
  run()
  setInterval(run, INTERVAL_MS)
}
