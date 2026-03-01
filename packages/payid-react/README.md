# payid-react

> React hooks for [PAY.ID](https://pay.id) — programmable payment policies on EVM chains.

Connect wallet, fetch on-chain rules, evaluate policies, and execute payments in one hook.
Built on top of [wagmi](https://wagmi.sh) + [viem](https://viem.sh) + PAY.ID SDK.

```tsx
const { execute, status, isSuccess } = usePayIDFlow();

await execute({
  receiver: '0xMerchant',
  asset: '0xUSDC',
  amount: 100_000_000n,
  payId: 'pay.id/merchant',
});
```

---

## Install

```bash
# npm
npm install payid-react wagmi viem @tanstack/react-query

# bun
bun add payid-react wagmi viem @tanstack/react-query
```

---

## Setup

Wrap your app with `PayIDProvider` **inside** `WagmiProvider`:

```tsx
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayIDProvider } from 'payid-react';

const wagmiConfig = createConfig({
  chains: [mainnet, base],
  transports: { [mainnet.id]: http(), [base.id]: http() },
});

const queryClient = new QueryClient();

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PayIDProvider>
          <YourApp />
        </PayIDProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Custom contract addresses

After deploying PAY.ID contracts to your target chain, pass the addresses via `contracts` prop:

```tsx
<PayIDProvider
  contracts={{
    4202: {                                    // Lisk Sepolia
      ruleAuthority:       '0xABC...',
      ruleItemERC721:      '0xDEF...',
      combinedRuleStorage: '0x123...',
      payIDVerifier:       '0x456...',
      payWithPayID:        '0x789...',
    },
  }}
>
```

---

## Hooks

### `usePayIDFlow` — Full payment flow in one hook

Handles everything: fetch rule → evaluate → prove → submit tx.

```tsx
import { usePayIDFlow } from 'payid-react';

function PayButton() {
  const { execute, status, isSuccess, error, denyReason } = usePayIDFlow();

  return (
    <div>
      <button
        onClick={() =>
          execute({
            receiver: '0xMerchant...',
            asset: '0xUSDC...', // address(0) for ETH
            amount: 100_000_000n, // 100 USDC (6 decimals)
            payId: 'pay.id/merchant',
          })
        }
        disabled={status !== 'idle'}>
        {status === 'idle' && 'Pay 100 USDC'}
        {status === 'fetching-rule' && 'Checking policy...'}
        {status === 'evaluating' && 'Evaluating...'}
        {status === 'proving' && 'Generating proof...'}
        {status === 'awaiting-wallet' && 'Confirm in wallet...'}
        {status === 'confirming' && 'Confirming...'}
        {status === 'success' && '✅ Done!'}
      </button>

      {status === 'denied' && <p>❌ Blocked: {denyReason}</p>}
      {status === 'error' && <p>⚠️ {error}</p>}
    </div>
  );
}
```

**Flow stages:**

```
fetching-rule → evaluating → proving → awaiting-wallet → confirming → success
                           ↓
                         denied   ← payment blocked by receiver's rule
```

**`PayIDFlowParams`:**

| Param                  | Type       | Description                                  |
| ---------------------- | ---------- | -------------------------------------------- |
| `receiver`             | `Address`  | Merchant / recipient address                 |
| `asset`                | `Address`  | ERC20 token address, or `address(0)` for ETH |
| `amount`               | `bigint`   | Amount in token raw units                    |
| `payId`                | `string`   | PAY.ID identifier e.g. `"pay.id/merchant"`   |
| `context`              | `object?`  | Extra context passed to rule engine          |
| `attestationUIDs`      | `Hash[]?`  | EAS attestation UIDs if required             |
| `ruleAuthorityAddress` | `Address?` | Override rule authority contract             |

---

### Rules

```tsx
import { useRules, useMyRules, useRule, useSubscription } from 'payid-react';

const { data: rules } = useRules();
const { data: active } = useRules({ onlyActive: true });
const { data: mine } = useMyRules(); // connected wallet only
const { data: rule } = useRule(1n); // single rule by ID
const { data: sub } = useSubscription(address);
// sub.isActive, sub.expiry, sub.maxSlots, sub.logicalRuleCount
```

---

### Combined Rules

```tsx
import {
  useAllCombinedRules,
  useActiveCombinedRule,
  useActiveCombinedRuleByDirection,
  useOwnerRuleSets,
  useMyRuleSets,
  RuleDirection,
} from 'payid-react';

const { data: allRules } = useAllCombinedRules();
const { data: active } = useAllCombinedRules({ onlyActive: true });
const { data: rule } = useActiveCombinedRule('0xMerchant...');
const { data: inbound } = useActiveCombinedRuleByDirection('0x...', RuleDirection.INBOUND);
const { data: outbound } = useActiveCombinedRuleByDirection('0x...', RuleDirection.OUTBOUND);
const { data: mine } = useMyRuleSets();
```

---

### Low-level payment hooks

```tsx
import { usePayETH, usePayERC20, useVerifyDecision, useNonceUsed } from 'payid-react';

const { pay, isPending, isSuccess } = usePayETH();
const { pay } = usePayERC20();
const { data: isValid } = useVerifyDecision(decision, signature);
const { data: used } = useNonceUsed(payerAddress, nonce);
```

---

## Supported Networks

| Network             | Chain ID |
| ------------------- | -------- |
| Localhost (Hardhat) | 31337    |
| Lisk Sepolia        | 4202     |
| Monad Testnet       | 10143    |
| Moonbase Alpha      | 1287     |
| Polygon Amoy        | 80002    |

Add a new chain by passing `contracts` prop to `<PayIDProvider>`.

---

## Requirements

- React ≥ 18
- wagmi ≥ 2
- viem ≥ 2
- `@tanstack/react-query` ≥ 5

---

## License

MIT
