# payid-react

React hooks for **PAY.ID** — programmable payment policy system on EVM chains.

`payid-react` wraps your smart contracts with clean hooks so you can:

- Fetch receiver payment policies from chain
- Evaluate WASM rules in the browser
- Generate EIP-712 proofs
- Execute ETH or ERC20 payments
- Query subscription status and rule NFTs

Built on top of [wagmi](https://wagmi.sh) v3 + [viem](https://viem.sh) v2.

---

## Table of Contents

- [payid-react](#payid-react)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Setup](#setup)
    - [Vite — fix multiple React instances](#vite--fix-multiple-react-instances)
  - [Provider](#provider)
    - [`<PayIDProvider>`](#payidprovider)
  - [Hooks](#hooks)
    - [`usePayIDFlow`](#usepayidflow)
    - [`usePayETH`](#usepayeth)
    - [`usePayERC20`](#usepayerc20)
    - [`useVerifyDecision`](#useverifydecision)
    - [`useNonceUsed`](#usenonceused)
    - [`useRules`](#userules)
    - [`useMyRules`](#usemyrules)
    - [`useRule`](#userule)
    - [`useRuleCount`](#userulecount)
    - [`useRuleExpiry`](#useruleexpiry)
    - [`useSubscription`](#usesubscription)
    - [`useAllCombinedRules`](#useallcombinedrules)
    - [`useActiveCombinedRule`](#useactivecombinedrule)
    - [`useActiveCombinedRuleByDirection`](#useactivecombinedrulebydirection)
    - [`useOwnerRuleSets`](#useownerrulesets)
    - [`useMyRuleSets`](#usemyrulesets)
  - [Types](#types)
  - [Contract Addresses](#contract-addresses)
  - [Supported Networks](#supported-networks)
  - [Peer Dependencies](#peer-dependencies)
  - [License](#license)

---

## Installation

```bash
# bun
bun add payid-react wagmi@3 viem@2 @tanstack/react-query ethers

# npm
npm install payid-react wagmi@3 viem@2 @tanstack/react-query ethers
```

> **React version:** wagmi v3 requires **React 18**. React 19 is not yet supported.

---

## Setup

Wrap your app in this exact order — `WagmiProvider` → `QueryClientProvider` → `PayIDProvider`:

```tsx
// main.tsx
import { WagmiProvider, createConfig, http } from 'wagmi';
import { hardhat, liskSepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayIDProvider } from 'payid-react';

const wagmiConfig = createConfig({
  chains: [hardhat, liskSepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [liskSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

root.render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <PayIDProvider
        contracts={{
          31337: {
            ruleAuthority: '0xYourAddress',
            ruleItemERC721: '0xYourAddress',
            combinedRuleStorage: '0xYourAddress',
            payIDVerifier: '0xYourAddress',
            payWithPayID: '0xYourAddress',
          },
        }}>
        <App />
      </PayIDProvider>
    </QueryClientProvider>
  </WagmiProvider>,
);
```

### Vite — fix multiple React instances

If you use `payid-react` via local link (`bun link`), add this to `vite.config.ts` to prevent the "multiple React" error:

```ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'react/jsx-runtime': path.resolve('./node_modules/react/jsx-runtime'),
    },
    dedupe: ['react', 'react-dom', 'wagmi', 'viem', '@tanstack/react-query'],
  },
});
```

---

## Provider

### `<PayIDProvider>`

Context provider that supplies contract addresses to all hooks.
Must be placed inside `<WagmiProvider>`.

```tsx
import { PayIDProvider } from 'payid-react';

<PayIDProvider
  contracts={{
    // key = chain ID
    31337: {
      ruleAuthority: '0x...',
      ruleItemERC721: '0x...',
      combinedRuleStorage: '0x...',
      payIDVerifier: '0x...',
      payWithPayID: '0x...',
    },
    4202: {
      // Lisk Sepolia addresses
    },
  }}>
  <App />
</PayIDProvider>;
```

**Props:**

| Prop        | Type                                      | Description                                                     |
| ----------- | ----------------------------------------- | --------------------------------------------------------------- |
| `contracts` | `Partial<Record<number, PayIDContracts>>` | Contract addresses per chain ID. Merged with built-in defaults. |
| `children`  | `ReactNode`                               | Your app                                                        |

The provider auto-detects the current chain from wagmi and resolves the right contract addresses. If the chain is not configured, addresses fall back to `address(0)`.

---

## Hooks

---

### `usePayIDFlow`

**The main hook.** Runs the complete PAY.ID payment flow in one call:

1. `fetching-rule` — fetch receiver's active policy from chain
2. `evaluating` — run WASM rule engine in browser
3. `proving` — generate EIP-712 decision proof + wallet signature
4. `awaiting-wallet` — user confirms in MetaMask
5. `confirming` — wait for on-chain confirmation
6. `success` — done

If the rule engine returns `DENY`, the flow stops at `denied` — no transaction is sent.

```tsx
import { usePayIDFlow } from 'payid-react';

function PayButton() {
  const { execute, reset, status, isPending, isSuccess, error, decision, denyReason, txHash } =
    usePayIDFlow();

  const handlePay = () => {
    execute({
      receiver: '0xMerchant...',
      asset: '0xUSDC...', // use address(0) for ETH
      amount: 100_000_000n, // 100 USDC (6 decimals)
      payId: 'pay.id/merchant',
    });
  };

  return (
    <div>
      <button onClick={handlePay} disabled={isPending}>
        {status === 'idle' && 'Pay'}
        {status === 'fetching-rule' && 'Checking policy...'}
        {status === 'evaluating' && 'Evaluating...'}
        {status === 'proving' && 'Proving...'}
        {status === 'awaiting-wallet' && 'Confirm in wallet...'}
        {status === 'confirming' && 'Confirming...'}
        {status === 'success' && '✅ Done'}
      </button>

      {status === 'denied' && <p>Blocked: {denyReason}</p>}

      {status === 'success' && <p>TX: {txHash}</p>}

      {status === 'error' && <p>Error: {error}</p>}

      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

**`execute(params)` parameters:**

| Param                  | Type                      | Required | Description                                               |
| ---------------------- | ------------------------- | -------- | --------------------------------------------------------- |
| `receiver`             | `Address`                 | ✅       | Merchant / recipient wallet address                       |
| `asset`                | `Address`                 | ✅       | ERC20 token address. Use `0x000...000` for native ETH     |
| `amount`               | `bigint`                  | ✅       | Amount in raw token units (wei / 6-dec USDC, etc.)        |
| `payId`                | `string`                  | ✅       | PAY.ID identifier e.g. `"pay.id/merchant"`                |
| `context`              | `Record<string, unknown>` | —        | Extra fields merged into rule evaluation context          |
| `attestationUIDs`      | `Hash[]`                  | —        | EAS attestation UIDs if receiver requires KYC/attestation |
| `ruleAuthorityAddress` | `Address`                 | —        | Override which contract to use for rule lookup            |

**Return values:**

| Value        | Type                        | Description                                      |
| ------------ | --------------------------- | ------------------------------------------------ |
| `status`     | `PayIDFlowStatus`           | Current stage of the flow (see below)            |
| `isPending`  | `boolean`                   | `true` while any async step is in progress       |
| `isSuccess`  | `boolean`                   | `true` after on-chain confirmation               |
| `decision`   | `'ALLOW' \| 'DENY' \| null` | Result from rule engine                          |
| `denyReason` | `string \| null`            | Human-readable reason when `decision === 'DENY'` |
| `txHash`     | `Hash \| undefined`         | Transaction hash after submission                |
| `error`      | `string \| null`            | Error message if `status === 'error'`            |
| `execute`    | `(params) => Promise<void>` | Start the payment flow                           |
| `reset`      | `() => void`                | Reset back to `'idle'`                           |

**Status values:**

```ts
type PayIDFlowStatus =
  | 'idle' // ready to start
  | 'fetching-rule' // reading receiver policy from chain
  | 'evaluating' // WASM rule engine running
  | 'proving' // generating EIP-712 proof + wallet signature
  | 'awaiting-wallet' // waiting for user to confirm in MetaMask
  | 'confirming' // tx submitted, waiting for block
  | 'success' // confirmed on chain
  | 'denied' // rule engine returned DENY (no tx sent)
  | 'error'; // something went wrong
```

**Rule resolution logic:**

`usePayIDFlow` first tries `CombinedRuleStorage.getActiveRuleOf(receiver)`.
If not found, falls back to `RuleAuthority.getOwnerRuleSets(receiver)` and uses the latest hash.
If neither has a rule, defaults to **allow all** (`{ logic: 'AND', rules: [] }`).

---

### `usePayETH`

Low-level hook for paying with ETH. Use this if you want to manage the flow manually (generate proof yourself via SDK, then submit).

```tsx
import { usePayETH } from 'payid-react';

const { pay, hash, isPending, isConfirming, isSuccess, error } = usePayETH();

// After you have a proof from sdk.evaluateAndProve()
pay({
  decision: proof.payload,
  signature: proof.signature,
  attestationUIDs: [], // optional
});
```

**Return values:**

| Value          | Type                             | Description                       |
| -------------- | -------------------------------- | --------------------------------- |
| `pay`          | `(params) => void`               | Submit the ETH payment            |
| `hash`         | `Hash \| undefined`              | Transaction hash                  |
| `isPending`    | `boolean`                        | Waiting for wallet confirmation   |
| `isConfirming` | `boolean`                        | Waiting for on-chain confirmation |
| `isSuccess`    | `boolean`                        | Transaction confirmed             |
| `error`        | `WriteContractErrorType \| null` | Write error if any                |

---

### `usePayERC20`

Same as `usePayETH` but for ERC20 tokens. Make sure to `approve` the `PayWithPayID` contract before calling `pay`.

```tsx
import { usePayERC20 } from 'payid-react';

const { pay, hash, isPending, isConfirming, isSuccess, error } = usePayERC20();

// Remember: approve PayWithPayID contract first
pay({
  decision: proof.payload,
  signature: proof.signature,
});
```

---

### `useVerifyDecision`

Read-only hook. Verify an EIP-712 decision proof on-chain.

```tsx
import { useVerifyDecision } from 'payid-react';

const { data: isValid, isLoading } = useVerifyDecision(decision, signature);
// isValid: boolean | undefined
```

| Param       | Type                       | Description                            |
| ----------- | -------------------------- | -------------------------------------- |
| `decision`  | `Decision \| undefined`    | The decision struct from proof payload |
| `signature` | `0x${string} \| undefined` | The EIP-712 signature                  |

---

### `useNonceUsed`

Check if a nonce has already been used (replay protection).

```tsx
import { useNonceUsed } from 'payid-react';

const { data: used } = useNonceUsed(payerAddress, nonce);
// used: boolean | undefined
```

---

### `useRules`

Fetch all rules created in `RuleItemERC721`. Auto-batches via multicall.

```tsx
import { useRules } from 'payid-react';

// All rules
const { data: rules, isLoading, isError, refetch } = useRules();

// Only active rules
const { data: active } = useRules({ onlyActive: true });

// Rules by a specific creator
const { data: creatorRules } = useRules({ creator: '0x...' });

// Combined filters
const { data: myActive } = useRules({ onlyActive: true, creator: address });
```

**Options:**

| Option       | Type      | Description                             |
| ------------ | --------- | --------------------------------------- |
| `onlyActive` | `boolean` | Filter to rules where `active === true` |
| `creator`    | `Address` | Filter to rules created by this address |

**Returns:** `{ data: RuleDefinition[], isLoading, isError, refetch }`

Each `RuleDefinition`:

```ts
interface RuleDefinition {
  ruleId: bigint; // rule ID (sequential from 1)
  ruleHash: Hash; // keccak256 of rule content
  uri: string; // IPFS URI to rule config (e.g. ipfs://Qm...)
  creator: Address; // wallet that created this rule
  rootRuleId: bigint; // ID of root rule in version chain (same as ruleId if root)
  version: number; // version number (1 = initial, 2+ = updated)
  deprecated: boolean; // true if replaced by newer version
  active: boolean; // true if currently has a minted NFT token
  tokenId: bigint; // NFT token ID (0 if not activated)
  expiry: bigint; // unix timestamp expiry (0 if not fetched)
}
```

---

### `useMyRules`

Shortcut — rules owned by the currently connected wallet.

```tsx
import { useMyRules } from 'payid-react';

const { data: myRules, isLoading } = useMyRules();
```

Equivalent to `useRules({ creator: connectedAddress })`.

---

### `useRule`

Fetch a single rule by `ruleId`.

```tsx
import { useRule } from 'payid-react';

const { data: rule, isLoading } = useRule(1n);

// rule.ruleId, rule.uri, rule.creator, rule.active, rule.version ...
```

| Param    | Type                  | Description                                         |
| -------- | --------------------- | --------------------------------------------------- |
| `ruleId` | `bigint \| undefined` | Rule ID to fetch. Hook is disabled when `undefined` |

---

### `useRuleCount`

Get the total number of rules ever created (`nextRuleId - 1`).

```tsx
import { useRuleCount } from 'payid-react';

const { data: count } = useRuleCount();
// count: bigint | undefined
```

---

### `useRuleExpiry`

Get the expiry timestamp for a specific rule NFT token.

```tsx
import { useRuleExpiry } from 'payid-react';

const { data: expiry } = useRuleExpiry(tokenId);
// expiry: bigint | undefined (unix timestamp)
```

| Param     | Type                  | Description                                            |
| --------- | --------------------- | ------------------------------------------------------ |
| `tokenId` | `bigint \| undefined` | NFT token ID. Hook is disabled for `0n` or `undefined` |

---

### `useSubscription`

Get subscription status for any wallet address.

```tsx
import { useSubscription } from 'payid-react';
import { useAccount } from 'wagmi';

const { address } = useAccount();
const { data: sub } = useSubscription(address);

if (sub?.isActive) {
  console.log(`Active until ${new Date(Number(sub.expiry) * 1000)}`);
  console.log(`${sub.logicalRuleCount} / ${sub.maxSlots} slots used`);
}
```

**Returns:**

```ts
{
  expiry: bigint; // unix timestamp when subscription expires
  isActive: boolean; // expiry >= now
  logicalRuleCount: number; // number of root rules created by this address
  maxSlots: number; // 1 without sub, MAX_SLOT (3) with active sub
}
```

**Subscription model:**

- Free tier: 1 rule slot
- With active subscription: up to `MAX_SLOT` (3) rule slots
- Subscription renewed via `RuleItemERC721.subscribe()` — costs ~0.0001 ETH / 30 days

---

### `useAllCombinedRules`

Fetch all rule sets registered in `CombinedRuleStorage`. Batches all queries via multicall.

```tsx
import { useAllCombinedRules } from 'payid-react';

const { data: rules, isLoading } = useAllCombinedRules();
const { data: active } = useAllCombinedRules({ onlyActive: true });
```

**Returns:** `{ data: CombinedRule[], isLoading, isError, refetch }`

Each `CombinedRule`:

```ts
interface CombinedRule {
  hash: Hash; // keccak256 commitment hash
  owner: Address; // address that registered this rule set
  version: bigint; // version number
  active: boolean; // currently active
  ruleRefs: RuleRef[]; // array of rule NFT references
  direction?: RuleDirection; // INBOUND | OUTBOUND (if fetched by direction)
}

interface RuleRef {
  ruleNFT: Address; // RuleItemERC721 contract address
  tokenId: bigint; // token ID of the rule NFT
}
```

---

### `useActiveCombinedRule`

Get the currently active combined rule for a specific wallet address.

```tsx
import { useActiveCombinedRule } from 'payid-react';

const { data: rule, isLoading } = useActiveCombinedRule('0xMerchant...');
// rule.hash, rule.owner, rule.version, rule.ruleRefs
```

Returns `undefined` if the address has no active combined rule.

---

### `useActiveCombinedRuleByDirection`

Get the active combined rule filtered by payment direction (INBOUND or OUTBOUND).

```tsx
import { useActiveCombinedRuleByDirection, RuleDirection } from 'payid-react';

// Rule applied when receiving payments
const { data: inbound } = useActiveCombinedRuleByDirection('0xMerchant...', RuleDirection.INBOUND);

// Rule applied when sending payments
const { data: outbound } = useActiveCombinedRuleByDirection('0xUser...', RuleDirection.OUTBOUND);
```

---

### `useOwnerRuleSets`

Get all rule sets registered by a specific address in `RuleAuthority` (the stricter registry with hash commitment + versioning).

```tsx
import { useOwnerRuleSets } from 'payid-react';

const { data: ruleSets, isLoading } = useOwnerRuleSets('0x...');
// ruleSets[].hash, .owner, .version, .active, .registeredAt, .refCount, .ruleRefs
```

---

### `useMyRuleSets`

Shortcut — rule sets owned by the currently connected wallet from `RuleAuthority`.

```tsx
import { useMyRuleSets } from 'payid-react';

const { data: myRuleSets } = useMyRuleSets();
```

---

## Types

```ts
import type {
  PayIDContracts,
  RuleDefinition,
  CombinedRule,
  RuleRef,
  RuleSet,
  SubscriptionInfo,
  PayIDFlowParams,
  PayIDFlowResult,
  PayIDFlowStatus,
} from 'payid-react';

import { RuleDirection } from 'payid-react';
```

**`PayIDContracts`**

```ts
interface PayIDContracts {
  ruleAuthority: Address;
  ruleItemERC721: Address;
  combinedRuleStorage: Address;
  payIDVerifier: Address;
  payWithPayID: Address;
}
```

**`RuleDirection`**

```ts
enum RuleDirection {
  INBOUND = 0, // rule applied to incoming payments
  OUTBOUND = 1, // rule applied to outgoing payments
}
```

---

## Contract Addresses

```ts
import { PAYID_CONTRACTS, getContracts } from 'payid-react';

// Get addresses for current chain
const contracts = getContracts(31337);

// All configured chains
console.log(PAYID_CONTRACTS);
```

Built-in chains (addresses filled in after deployment):

| Chain               | Chain ID |
| ------------------- | -------- |
| Localhost (Hardhat) | 31337    |
| Lisk Sepolia        | 4202     |
| Monad Testnet       | 10143    |
| Moonbase Alpha      | 1287     |

For chains not in the list, pass addresses via `<PayIDProvider contracts={...}>`.

---

## Supported Networks

| Network        | Chain ID | EAS        | Status     |
| -------------- | -------- | ---------- | ---------- |
| Localhost      | 31337    | MockEAS    | ✅ Dev     |
| Lisk Sepolia   | 4202     | MockEAS    | 🔜 Testnet |
| Monad Testnet  | 10143    | MockEAS    | 🔜 Testnet |
| Moonbase Alpha | 1287     | MockEAS    | 🔜 Testnet |
| Polygon Amoy   | 80002    | MockEAS    | 🔜 Testnet |
| Sepolia        | 11155111 | Native EAS | 🔜 Testnet |
| Base Sepolia   | 84532    | Native EAS | 🔜 Testnet |

---

## Peer Dependencies

```json
{
  "react": ">=18",
  "viem": ">=2",
  "wagmi": ">=3",
  "ethers": ">=6",
  "@tanstack/react-query": ">=5"
}
```

---

## License

MIT
