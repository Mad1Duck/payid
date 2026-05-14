import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from './AppLayout'
import { LandingPage } from './LandingPage'
import { Overview } from './Overview'
import { CartridgeComposer } from './CartridgeComposer'
import { PayIDAddressBar } from './PayIDAddressBar'
import { DecisionProofPanel, type DecisionProof } from './DecisionProofPanel'
import { SessionPolicyPanel, type SessionPolicy } from './SessionPolicyPanel'
import { WalletContextPanel, type PaymentContext } from './WalletContextPanel'
import { IssuerPanel, type IssuerConfig } from './IssuerPanel'

// Route components
function Index() {
  return <LandingPage />
}

function AppIndex() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

function OverviewPage() {
  return <Overview />
}

function ResolvePage() {
  return (
    <div className="space-y-6">
      <PayIDAddressBar />
      {/* Evaluation result would go here after resolve */}
    </div>
  )
}

function RulesPage() {
  const mockCartridges = [
    {
      id: 'rule_1',
      type: 'velocity' as const,
      name: 'Velocity Limit',
      summary: 'Max $500 per 24h',
      active: true,
    },
    {
      id: 'rule_2',
      type: 'blocklist' as const,
      name: 'Blocklist',
      summary: 'Block suspicious addresses',
      active: true,
    },
    {
      id: 'rule_3',
      type: 'allowlist' as const,
      name: 'Allowlist',
      summary: 'Allow only whitelisted',
      active: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Cartridge System
      </div>
      <CartridgeComposer availableCartridges={mockCartridges} />
    </div>
  )
}

function SessionPage() {
  const mockSession: SessionPolicy = {
    type: 'time',
    maxTx: 50,
    window: 3600,
    maxVolume: '$10,000',
    currentTx: 12,
    currentVolume: '$2,100',
    expiresAt: Date.now() + 3600000,
    enabled: true,
  }

  return <SessionPolicyPanel policy={mockSession} />
}

function ProofPage() {
  const mockProof: DecisionProof = {
    signer: '0x1234567890abcdef1234567890abcdef12345678',
    ruleAuthority: '0xabcdef1234567890abcdef1234567890abcdef12',
    decision: 'ALLOW',
    nonce: '0x9f3a1bc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
    chainId: 8453,
    ttlSeconds: 3600,
    easUids: ['0xeid1234567890abcdef1234567890abcdef1234567890abcdef', '0xeid0987654321fedcba0987654321fedcba0987654321'],
    rawSignature: '0x1b3f5a7c9e2d4f6b8a0c3e5g7h9i1j3k5l7m9n1o3p5q7r9s1t3u5v7w9x1y3z5',
    rawJson: JSON.stringify({
      signer: '0x1234567890abcdef1234567890abcdef12345678',
      decision: 'ALLOW',
      nonce: '0x9f3a1bc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
      chainId: 8453,
      ttl: 3600,
    }, null, 2),
  }

  return <DecisionProofPanel proof={mockProof} />
}

function ContextPage() {
  const mockContext: PaymentContext = {
    sender: '0x1234567890abcdef1234567890abcdef12345678',
    receiver: '0xabcdef1234567890abcdef1234567890abcdef12',
    amount: '0.5',
    token: 'ETH',
    chainId: 8453,
    chainName: 'Base',
    paymaster: '0x9876543210fedcba9876543210fedcba98765432',
    mode: 'erc4337',
    userOp: {
      sender: '0x1234567890abcdef1234567890abcdef12345678',
      nonce: '0x0',
      initCode: '0x',
      callData: '0x',
      callGasLimit: '0x5208',
      verificationGasLimit: '0x186a0',
      preVerificationGas: '0x4b2c',
      maxFeePerGas: '0x59682f00',
      maxPriorityFeePerGas: '0x59682f00',
      paymasterAndData: '0x',
      signature: '0x',
    },
  }

  return <WalletContextPanel context={mockContext} />
}

function IssuerPage() {
  const mockIssuer: IssuerConfig = {
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    network: 'Base Sepolia',
    contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    lastSigned: Date.now() - 120000,
    totalProofs: 147,
  }

  return <IssuerPanel config={mockIssuer} />
}

function SettingsPage() {
  return (
    <div className="card p-5">
      <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Settings
      </div>
      <div className="separator mb-4" />
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Settings panel coming soon...
      </div>
    </div>
  )
}

// Root route (no parent, no path needed)
const rootRoute = createRootRoute()

// Route configuration
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
})

const v3Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v3',
  component: AppIndex,
})

const overviewRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'overview',
  component: OverviewPage,
})

const resolveRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'resolve',
  component: ResolvePage,
})

const rulesRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'rules',
  component: RulesPage,
})

const sessionRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'session',
  component: SessionPage,
})

const proofRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'proof',
  component: ProofPage,
})

const contextRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'context',
  component: ContextPage,
})

const issuerRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'issuer',
  component: IssuerPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'settings',
  component: SettingsPage,
})

// Build route tree
const routeTree = rootRoute.addChildren([indexRoute, v3Route.addChildren([
  overviewRoute,
  resolveRoute,
  rulesRoute,
  sessionRoute,
  proofRoute,
  contextRoute,
  issuerRoute,
  settingsRoute,
])])

// Create router
export const router = createRouter({ routeTree })
