import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { PayIDProvider } from 'payid-react'

import HomeRoute from './routes/home/index.tsx'
import RuleConsole from './routes/rule-console/index.tsx'
import History from './routes/history/index.tsx'
import Proof from './routes/proof/index.tsx'
import Qr from './routes/qr/index.tsx'
import RuleBuilder from './routes/rule-builder/index.tsx'
import Vrify from './routes/verify/index.tsx'
import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import { addresses } from './constants/contracts'
import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

const wagmiConfig = createConfig({
  chains: [hardhat],
  connectors: [injected(), metaMask()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const routeTree = rootRoute.addChildren([
  HomeRoute(rootRoute as any),
  RuleConsole(rootRoute as any),
  History(rootRoute as any),
  Proof(rootRoute as any),
  Qr(rootRoute as any),
  RuleBuilder(rootRoute as any),
  Vrify(rootRoute as any),
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
                combinedRuleStorage: addresses[31337].CombinedRuleStorage,
                payIDVerifier:       addresses[31337].PayIDVerifier,
                payWithPayID:        addresses[31337].PayWithPayID,
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
