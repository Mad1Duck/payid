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
                ruleAuthority: '0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB',
                ruleItemERC721: '0x9E545E3C0baAB3E08CdfD552C960A1050f373042',
                combinedRuleStorage:
                  '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F',
                payIDVerifier: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
                payWithPayID: '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690',
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
