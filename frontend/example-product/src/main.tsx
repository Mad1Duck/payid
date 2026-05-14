import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRouter,
  createRoute,
  useNavigate,
} from '@tanstack/react-router'
import { WagmiProvider, createConfig, http, useAccount } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { PayIDProvider, useMyRules, useActiveCombinedRule, useSubscription } from 'payid-react'

import HomeRoute from './routes/home/index.tsx'
import RuleConsole from './routes/rule-console/index.tsx'
import History from './routes/history/index.tsx'
import Proof from './routes/proof/index.tsx'
import Qr from './routes/qr/index.tsx'
import RuleBuilder from './routes/rule-builder/index.tsx'
import Subscription from './routes/subscription/index.tsx'
import Verify from './routes/verify/index.tsx'
import OldRoute from './routes/old/index.tsx'
import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

// V3 redesigned UI
import {
  AppLayout as NewAppLayout,
  Dashboard,
  SendFlow,
  ReceivePage,
  HistoryPage,
  ContactsPage,
  SettingsPage,
  Onboarding,
} from './components/v3'

// V4 hackathon futuristic UI
import {
  AppLayout as V4AppLayout,
  Dashboard as V4Dashboard,
  SendFlow as V4SendFlow,
  ReceivePage as V4ReceivePage,
  HistoryPage as V4HistoryPage,
  RulesPage as V4RulesPage,
  SettingsPage as V4SettingsPage,
  LandingPageV4,
  ThemeProvider as V4ThemeProvider,
} from './components/v4'

// V2 components still used in some v3 routes
import { LandingPage } from './components/v2/LandingPage'
import { QRPage } from './components/v2/QRPage'
import { RuleBuilderPage } from './components/v2/RuleBuilderPage'
import { VerifyPage } from './components/v2/VerifyPage'
import { CartridgeComposer } from './components/v2/CartridgeComposer'
import { SessionPolicyPanel, type SessionPolicy } from './components/v2/SessionPolicyPanel'
import { addresses } from './constants/contracts'
import './globals.css'
import reportWebVitals from './reportWebVitals.ts'

import { type Chain } from 'viem'

export const zeroGTestnet = {
  id: 16600,
  name: '0G Newton Testnet',
  nativeCurrency: { decimals: 18, name: 'A0GI', symbol: 'A0GI' },
  rpcUrls: {
    default: { http: ['https://16600.rpc.thirdweb.com/'] },
    public: { http: ['https://16600.rpc.thirdweb.com/'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan-newton.0g.ai' },
  },
} as const satisfies Chain

const wagmiConfig = createConfig({
  chains: [hardhat, zeroGTestnet],
  connectors: [injected(), metaMask()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [zeroGTestnet.id]: http(),
  },
})

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// Root index redirect to latest version (v4)
const rootIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    const navigate = useNavigate()
    React.useEffect(() => {
      navigate({ to: '/v4' })
    }, [])
    return null
  },
})

// V3 routes
const v3Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v3',
  component: () => <Outlet />,
})

const v3LandingRoute = createRoute({
  getParentRoute: () => v3Route,
  path: '/',
  component: LandingPage,
})

const v3OnboardingRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'welcome',
  component: Onboarding,
})

// V3 app routes (with layout)
const v3AppRoute = createRoute({
  getParentRoute: () => v3Route,
  path: 'app',
  component: () => (
    <NewAppLayout>
      <Outlet />
    </NewAppLayout>
  ),
})

const v3DashboardRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'dashboard',
  component: Dashboard,
})

const v3SendRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'send',
  component: SendFlow,
})

const v3ReceiveRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'receive',
  component: ReceivePage,
})

const v3HistoryRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'history',
  component: HistoryPage,
})

const v3ContactsRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'contacts',
  component: ContactsPage,
})

const v3SettingsRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'settings',
  component: SettingsPage,
})

const v3RulesConsoleRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'rules/console',
  component: () => {
    const { address } = useAccount()
    const { data: myRules = [] } = useMyRules()
    const { data: activeCombined } = useActiveCombinedRule(address)

    const cartridges = myRules.map((rule: any) => ({
      id: rule.id,
      type: 'custom' as const,
      name: rule.ruleHash.slice(0, 10) + '...',
      summary: rule.active ? 'Active' : 'Inactive',
      active: rule.active,
    }))

    return (
      <div className="space-y-6">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Cartridge System
        </div>
        <CartridgeComposer availableCartridges={cartridges} />
      </div>
    )
  },
})

const v3ProofRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'proof',
  component: () => {
    return (
      <div className="card p-5">
        <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Decision Proof Viewer
        </div>
        <div className="separator mb-4" />
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Decision proofs are generated during payment flows. Use the payment flow to create and view proofs.
        </div>
      </div>
    )
  },
})

const v3QrRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'qr',
  component: QRPage,
})

const v3RuleBuilderRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'rule-builder',
  component: RuleBuilderPage,
})

const v3SubscriptionRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'subscription',
  component: () => {
    const { address } = useAccount()
    const { data: sub } = useSubscription(address)

    const session: SessionPolicy = {
      type: 'time',
      maxTx: sub?.isActive ? 50 : 1,
      window: 3600,
      maxVolume: sub?.isActive ? '$10,000' : '$1,000',
      currentTx: 0,
      currentVolume: '$0',
      expiresAt: sub?.expiry ? sub.expiry * 1000 : Date.now(),
      enabled: sub?.isActive ?? false,
    }

    return <SessionPolicyPanel policy={session} />
  },
})

const v3VerifyRoute = createRoute({
  getParentRoute: () => v3AppRoute,
  path: 'verify',
  component: VerifyPage,
})

// V4 hackathon futuristic routes
const v4Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v4',
  component: () => (
    <V4ThemeProvider>
      <Outlet />
    </V4ThemeProvider>
  ),
})

const v4IndexRoute = createRoute({
  getParentRoute: () => v4Route,
  path: '/',
  component: LandingPageV4,
})

const v4AppRoute = createRoute({
  getParentRoute: () => v4Route,
  path: 'app',
  component: () => (
    <V4AppLayout>
      <Outlet />
    </V4AppLayout>
  ),
})

const v4AppIndexRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: '/',
  component: V4Dashboard,
})

const v4DashboardRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'dashboard',
  component: V4Dashboard,
})

const v4SendRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'send',
  component: V4SendFlow,
})

const v4ReceiveRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'receive',
  component: V4ReceivePage,
})

const v4HistoryRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'history',
  component: V4HistoryPage,
})

const v4RulesRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'rules',
  component: V4RulesPage,
})

const v4SettingsRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'settings',
  component: V4SettingsPage,
})

// V2 routes (old routes with /v2 prefix)
const v2Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v2',
  component: () => <Outlet />,
})

const routeTree = rootRoute.addChildren([
  rootIndexRoute,
  v3Route.addChildren([
    v3LandingRoute,
    v3OnboardingRoute,
    v3AppRoute.addChildren([
      v3DashboardRoute,
      v3SendRoute,
      v3ReceiveRoute,
      v3HistoryRoute,
      v3ContactsRoute,
      v3SettingsRoute,
      v3RulesConsoleRoute,
      v3ProofRoute,
      v3QrRoute,
      v3RuleBuilderRoute,
      v3SubscriptionRoute,
      v3VerifyRoute,
    ]),
  ]),
  v4Route.addChildren([
    v4IndexRoute,
    v4AppRoute.addChildren([
      v4AppIndexRoute,
      v4DashboardRoute,
      v4SendRoute,
      v4ReceiveRoute,
      v4HistoryRoute,
      v4RulesRoute,
      v4SettingsRoute,
    ]),
  ]),
  v2Route.addChildren([
    HomeRoute(v2Route as any),
    RuleConsole(v2Route as any),
    History(v2Route as any),
    Proof(v2Route as any),
    Qr(v2Route as any),
    RuleBuilder(v2Route as any),
    Subscription(v2Route as any),
    Verify(v2Route as any),
    OldRoute(v2Route as any),
  ]),
])

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()

const router = createRouter({
  routeTree,
  context: { ...TanStackQueryProviderContext },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render
const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <WagmiProvider config={wagmiConfig}>
        <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
          <PayIDProvider
            contracts={{
              [hardhat.id]: {
                ruleAuthority:       addresses[31337].RuleAuthority,
                ruleItemERC721:      addresses[31337].RuleItemERC721,
                payIDVerifier:       addresses[31337].PayIDVerifier,
                payWithPayID:        addresses[31337].PayWithPayID,
                combinedRuleStorage: addresses[31337].CombinedRuleStorage || '0x0000000000000000000000000000000000000000',
              },
              [zeroGTestnet.id]: {
                ruleAuthority:       '0x0000000000000000000000000000000000000000',
                ruleItemERC721:      '0x0000000000000000000000000000000000000000',
                payIDVerifier:       '0x0000000000000000000000000000000000000000',
                payWithPayID:        '0x0000000000000000000000000000000000000000',
                combinedRuleStorage: '0x0000000000000000000000000000000000000000',
              },
            }}
          >
            <RouterProvider router={router} />
          </PayIDProvider>
        </TanStackQueryProvider.Provider>
      </WagmiProvider>
    </StrictMode>,
  )
}

reportWebVitals()
