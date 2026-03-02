import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { hardhat, liskSepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { PayIDProvider } from 'payid-react'

// routes
import HomeRoute from './routes/home/index.tsx'
import RuleConsole from './routes/rule-console/index.tsx'
import History from './routes/history/index.tsx'
import Proof from './routes/proof/index.tsx'
import Qr from './routes/qr/index.tsx'
import RuleBuilder from './routes/rule-builder/index.tsx'
import Vrify from './routes/verify/index.tsx'
import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

// Wagmi config
const wagmiConfig = createConfig({
  chains: [hardhat],
  connectors: [injected(), metaMask()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})

// Router
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
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
      {/* Urutan wajib: Wagmi → Query → PayID → Router */}
      <WagmiProvider config={wagmiConfig}>
        <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
          <PayIDProvider
            contracts={{
              31337: {
                ruleAuthority: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
                ruleItemERC721: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
                combinedRuleStorage:
                  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
                payIDVerifier: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
                payWithPayID: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
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
