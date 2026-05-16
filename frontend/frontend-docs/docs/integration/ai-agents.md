---
id: ai-agents
title: AI Agents
sidebar_label: AI Agents
---

# AI Agents in PAY.ID

PAY.ID supports **AI-powered payment agents** — autonomous or semi-autonomous services that can evaluate and execute payments on behalf of users, subject to on-chain policy enforcement.

This is not "AI replacing wallets." It is **delegated execution with cryptographic guardrails**: the AI can propose transactions, but the on-chain contract enforces the user's policy before any funds move.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Service    │────▶│   AIAgentRule    │────▶│  User's Policy  │
│  (off-chain)    │     │   Manager        │     │ (combined rule) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
   Proposes tx           Validates agent           ALLOW / REJECT
   + proof              subscription status
```

**Key insight**: The AI never holds user funds. It generates a **Decision Proof** (same EIP-712 flow as normal payments), and the user's policy (Combined Rule) decides whether to ALLOW or REJECT.

---

## Smart Contracts

| Contract | Purpose |
|---|---|
| `AIAgentRegistry` | Register admin agents with metadata (name, endpoint, description, root rule hash) |
| `AIAgentRuleManager` | Link agents to combined rule policies, handle subscriptions, preferred agent selection |
| `AgentPayID` | Execute agent-initiated payments with proof verification |
| `CombinedRuleStorage` | Store the actual rule set hash that the agent must follow |

---

## Agent Lifecycle

### 1. Register an Agent (Admin)

Register your AI service so users can discover and subscribe to it.

```tsx
import { useCreateAIAgent } from 'payid-react'

function RegisterAgent() {
  const { createAgent, isPending } = useCreateAIAgent()

  const handleRegister = () => {
    createAgent({
      agentWallet: '0xAgentWalletAddress...',
      name: 'MyAI Assistant',
      endpoint: 'https://api.myai.com/v1/pay',
      description: 'AI agent for automated bill payments',
      rootRuleHash: '0x...', // Hash of the agent's base rule config
    })
  }

  return <button onClick={handleRegister} disabled={isPending}>Register Agent</button>
}
```

### 2. Set Agent Policy (Owner)

Link an agent to a **Combined Rule** (your payment policy). The agent can only execute payments that pass this rule.

```tsx
import { useSetAgentCombinedRule } from 'payid-react'
import { keccak256, toBytes } from 'viem'

function SetAgentPolicy() {
  const { setAgentCombinedRule, isPending } = useSetAgentCombinedRule()

  const handleSetPolicy = () => {
    // Your combined rule hash from CombinedRuleStorage
    const ruleSetHash = keccak256(toBytes(JSON.stringify(myRuleConfig)))

    setAgentCombinedRule(
      '0xAgentWalletAddress...', // agent to authorize
      ruleSetHash               // policy the agent must follow
    )
  }

  return <button onClick={handleSetPolicy} disabled={isPending}>Set Agent Policy</button>
}
```

### 3. Subscribe to an Agent (User)

Users must subscribe (pay a small fee) before an agent can act on their behalf.

```tsx
import { useSubscribeToAgent, useAgentSubscriptionPrice } from 'payid-react'

function SubscribeToAgent({ agentAddress }: { agentAddress: Address }) {
  const { data: price } = useAgentSubscriptionPrice()
  const { subscribeToAgent, isPending } = useSubscribeToAgent()

  const handleSubscribe = () => {
    if (!price) return
    subscribeToAgent({ agent: agentAddress, value: price })
  }

  return (
    <button onClick={handleSubscribe} disabled={isPending}>
      Subscribe ({price ? formatEther(price) : '...'} ETH)
    </button>
  )
}
```

### 4. Set Preferred Agent (User)

Users choose their default agent for automated payments.

```tsx
import { useSetPreferredAgent } from 'payid-react'

function SetPreferredAgent({ agentAddress }: { agentAddress: Address }) {
  const { setPreferredAgent, isPending } = useSetPreferredAgent()

  return (
    <button onClick={() => setPreferredAgent(agentAddress)} disabled={isPending}>
      Set as Preferred Agent
    </button>
  )
}
```

---

## React Hooks Reference

### Read Hooks

| Hook | Returns | Description |
|---|---|---|
| `useAdminAIAgent(address)` | `AdminAgent` | Single agent metadata from registry |
| `useAllAdminAIAgents(options?)` | `AdminAgent[]` | List all registered agents |
| `useAgentCombinedRule(agent)` | `AgentRuleInfo` | Active policy hash for an agent |
| `useEffectiveAgentRule(user)` | `{ ruleSetHash, agent }` | User's effective rule + agent |
| `usePreferredAgent(user)` | `Address` | User's preferred agent address |
| `useAgentSubscription(user, agent)` | `AgentSubscription` | Subscription status + expiry |
| `useIsSubscribedToAgent(user, agent)` | `boolean` | Quick subscription check |
| `useAllAgentsWithRules()` | `AgentWithRule[]` | All agents that have policies set |
| `useAgentSubscriptionPrice()` | `bigint` | Current subscription fee |

### Write Hooks

| Hook | Action | Description |
|---|---|---|
| `useCreateAIAgent()` | `createAgent(...)` | Register a new AI agent |
| `useSetAgentCombinedRule()` | `setAgentCombinedRule(agent, hash)` | Link agent to policy |
| `useUnsetAgentCombinedRule()` | `unset(agent)` | Remove agent policy |
| `useSubscribeToAgent()` | `subscribeToAgent({ agent, value })` | Subscribe user to agent |
| `useUnsubscribeFromAgent()` | `unsubscribeFromAgent(agent)` | Cancel subscription |
| `useSetPreferredAgent()` | `setPreferredAgent(agent)` | Set default agent |
| `useToggleAgentStatus()` | `toggleStatus(agent)` | Activate/deactivate agent |

---

## Security Model

1. **Fail-closed by default** — If no policy is set, the agent cannot execute any payments.
2. **Subscription required** — Users must actively subscribe (and pay) before delegation is active.
3. **Policy-bound** — The agent can only propose transactions that satisfy the user's Combined Rule.
4. **Proof-based** — Every agent-initiated payment still requires a valid EIP-712 Decision Proof.
5. **Owner override** — Agent policy can only be set by the agent owner or admin registry.

---

## Example: Complete Agent Flow

```tsx
import { usePayIDFlow } from 'payid-react'

// The AI service calls this after evaluating user's policy off-chain
async function executeAgentPayment(
  agentWallet: Address,
  receiver: Address,
  amount: bigint,
  asset: Address
) {
  const { execute, status } = usePayIDFlow()

  // 1. AI loads user's effective rule from AIAgentRuleManager
  // 2. AI evaluates the payment context with WASM rule engine
  // 3. If ALLOW, AI generates EIP-712 Decision Proof (signed by agent)
  // 4. Submit through AgentPayID contract

  await execute({
    receiver,
    amount,
    asset,
    // ... other params
  })
}
```

---

## Contract Addresses

See [Contract Addresses →](../network/contracts-address) for deployed addresses per chain.

Key contracts for AI Agent functionality:
- `AIAgentRegistry`
- `AIAgentRuleManager`
- `AgentPayID`
- `CombinedRuleStorage`

---

## Next Steps

- Learn about [Combined Rules →](../rules/combining-rules) — the policy format agents must follow
- See [React Integration →](./react-integration) for full provider setup
- Explore [Rule Basics →](../rules/rule-basics) to design agent-compatible policies
