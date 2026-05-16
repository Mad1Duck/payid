import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from '@tanstack/react-router'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { PayIDProvider } from 'payid-react'
import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

// V4 hackathon futuristic UI
import {
  LandingPageV4,
  AdminPage as V4AdminPage,
  AgentPayIDPage as V4AgentPayIDPage,
  AdvancedTools as V4AdvancedTools,
  AppLayout as V4AppLayout,
  DAOPayroll as V4DAOPayroll,
  Dashboard as V4Dashboard,
  HistoryPage as V4HistoryPage,
  PolicyMarketplace as V4PolicyMarketplace,
  ProofVisualizer as V4ProofVisualizer,
  ReceivePage as V4ReceivePage,
  RulesConsolePage as V4RulesConsolePage,
  RulesPage as V4RulesPage,
  SendFlow as V4SendFlow,
  SettingsPage as V4SettingsPage,
  ThemeProvider as V4ThemeProvider,
} from './components/v4'

import { addresses } from './constants/contracts'
import { Toaster } from './components/ui/sonner'
import './globals.css'
import reportWebVitals from './reportWebVitals.ts'

import type { Chain } from 'viem'

import { RPC_URLS } from './constants/rpc'

export const zeroGTestnet = {
  id: 16601,
  name: '0G Newton Testnet (Fork)',
  nativeCurrency: { decimals: 18, name: 'A0GI', symbol: 'A0GI' },
  rpcUrls: {
    default: { http: [RPC_URLS.zeroG] },
    public: { http: [RPC_URLS.zeroG] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan-newton.0g.ai' },
  },
} as const satisfies Chain

export const devNode = {
  id: 31337,
  name: 'DevNode',
  nativeCurrency: { decimals: 18, name: 'Dev Token', symbol: 'DEV' },
  rpcUrls: {
    default: { http: [RPC_URLS.devNode] },
    public: { http: [RPC_URLS.devNode] },
  },
} as const satisfies Chain

const wagmiConfig = createConfig({
  chains: [devNode, zeroGTestnet],
  connectors: [injected(), metaMask()],
  transports: {
    [devNode.id]: http(),
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
  component: V4RulesConsolePage,
})

const v4RulesBuilderRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'rules/builder',
  component: V4RulesPage,
})

const v4ProofRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'proof',
  component: V4ProofVisualizer,
})

const v4MarketplaceRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'marketplace',
  component: V4PolicyMarketplace,
})

const v4AdvancedToolsRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'tools',
  component: V4AdvancedTools,
})

const v4DAOPayrollRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'payroll',
  component: V4DAOPayroll,
})

const v4SettingsRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'settings',
  component: V4SettingsPage,
})

const v4AdminRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'admin',
  component: V4AdminPage,
})

const v4AgentRoute = createRoute({
  getParentRoute: () => v4AppRoute,
  path: 'agent',
  component: V4AgentPayIDPage,
})

const routeTree = rootRoute.addChildren([
  rootIndexRoute,
  v4Route.addChildren([
    v4IndexRoute,
    v4AppRoute.addChildren([
      v4AppIndexRoute,
      v4DashboardRoute,
      v4SendRoute,
      v4ReceiveRoute,
      v4HistoryRoute,
      v4RulesRoute,
      v4RulesBuilderRoute,
      v4ProofRoute,
      v4MarketplaceRoute,
      v4AdvancedToolsRoute,
      v4DAOPayrollRoute,
      v4SettingsRoute,
      v4AdminRoute,
      v4AgentRoute,
    ]),
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
            contracts={Object.keys(addresses).reduce((acc, cid) => {
              const chainId = Number(cid)
              const addr = (addresses as any)[chainId]
              acc[chainId] = {
                ruleAuthority: addr.RuleAuthority,
                ruleItemERC721: addr.RuleItemERC721,
                payIDVerifier: addr.PayIDVerifier,
                payWithPayID: addr.PayWithPayID,
                combinedRuleStorage: addr.CombinedRuleStorage,
                vindexRegistry: addr.VindexRegistry,
                attestationVerifier: addr.AttestationVerifier,
              }
              return acc
            }, {} as any)}
            ipfsGateway={(import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ?? 'https://gateway.pinata.cloud/ipfs/'}
            zgGateway={(import.meta.env.VITE_0G_STORAGE_GATEWAY as string | undefined) ?? 'https://indexer-storage-testnet-turbo.0g.ai'}
          >
            <RouterProvider router={router} />
            <Toaster position="bottom-right" richColors />
          </PayIDProvider>
        </TanStackQueryProvider.Provider>
      </WagmiProvider>
    </StrictMode>,
  )
}

reportWebVitals()
