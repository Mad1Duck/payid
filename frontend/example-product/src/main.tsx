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
import Subscription from './routes/subscription/index.tsx'
import Vrify from './routes/verify/index.tsx'
import OldRoute from './routes/old/index.tsx'
import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import { addresses } from './constants/contracts'
import './styles.css'
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

const routeTree = rootRoute.addChildren([
  HomeRoute(rootRoute as any),
  RuleConsole(rootRoute as any),
  History(rootRoute as any),
  Proof(rootRoute as any),
  Qr(rootRoute as any),
  RuleBuilder(rootRoute as any),
  Subscription(rootRoute as any),
  Vrify(rootRoute as any),
  OldRoute(rootRoute as any),
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
              },
              [zeroGTestnet.id]: {
                ruleAuthority:       '0x0000000000000000000000000000000000000000',
                ruleItemERC721:      '0x0000000000000000000000000000000000000000',
                payIDVerifier:       '0x0000000000000000000000000000000000000000',
                payWithPayID:        '0x0000000000000000000000000000000000000000',
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
