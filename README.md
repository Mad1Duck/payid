# PayID SDK: Programmable Payment Policies

PayID is a high-performance SDK and smart contract infrastructure for **Programmable Payment Policies**. It allows developers to define, verify, and enforce complex conditions on payments using off-chain decision proofs and on-chain attestations.

Built for the **0G APAC Hackathon**, PayID leverages 0G's modular infrastructure to enable a verifiable and autonomous "Agentic Economy".

## 🚀 0G Integration Highlights

- **0G Storage**: Rule metadata and NFT assets are stored on 0G Storage (Newton Testnet). We use the `@0gfoundation/0g-storage-ts-sdk` for high-availability, decentralized persistence of payment policies.
- **Agent ID (ERC-7857)**: Integrated with 0G Agent ID standards. AI Agents can own and manage their own payment rules via the `AgentPayID` registry, enabling autonomous financial agency.
- **0G Chain**: Designed for deterministic deployment on 0G Chain via CREATE2.

## 📦 Packages

- `@payid/sdk-core`: Framework-agnostic core logic for rule evaluation and EIP-712 signing.
- `@payid/payid-react`: High-level React hooks and components for easy frontend integration.
- `@payid/contracts`: Solidity smart contracts including `PayIDVerifier`, `RuleAuthority`, and `AgentPayID`.

## 🛠️ Getting Started

### 1. Installation
```bash
bun install
```

### 2. Configuration
Copy `.env.example` to `.env` and fill in your 0G Testnet credentials:
```env
ZGS_RPC_URL="https://rpc-testnet.0g.ai"
ZGS_INDEXER_URL="https://indexer-testnet.0g.ai"
ZGS_PRIVATE_KEY="your_private_key"
```

### 3. Usage (React)
```tsx
import { usePayIDFlow } from 'payid-react';

const { pay } = usePayIDFlow();

// Execute a payment that follows a specific rule set
await pay({
  receiver: "0x...",
  amount: parseEther("1.0"),
  ruleSetHash: "0x..."
});
```

## 🛡️ Security
PayID uses EIP-712 for secure off-chain decisions and EAS for identity attestations. All contracts are audit-ready and feature front-running protection.

---
Built by MadDuck for the 0G Ecosystem.
