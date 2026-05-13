import { useState, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { Wallet, Loader2, ChevronDown, LogOut, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Connector } from 'wagmi'
import { cn } from '@/lib/utils'

function shortAddr(addr?: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect, isPending: isConnectPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitchPending } = useSwitchChain()
  const [showMenu, setShowMenu] = useState(false)
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)

  const handleConnect = useCallback(
    (connector: Connector) => {
      connect({ connector })
      setShowMenu(false)
    },
    [connect],
  )

  const activeChain = chains.find((c) => c.id === chainId)

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {/* Network Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowNetworkMenu((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              activeChain
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-amber-50 border-amber-200 text-amber-700',
            )}
            title="Switch Network"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="max-w-20 truncate">
              {activeChain?.name ?? 'Unknown'}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showNetworkMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNetworkMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-52 rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    Select Network
                  </div>
                  {chains.map((c) => (
                    <button
                      key={c.id}
                      disabled={isSwitchPending || c.id === chainId}
                      onClick={() => {
                        switchChain({ chainId: c.id })
                        setShowNetworkMenu(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                        c.id === chainId
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          c.id === chainId ? 'bg-blue-500' : 'bg-slate-300',
                        )}
                      />
                      {c.name}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Address + Disconnect */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-medium text-emerald-700">
            {shortAddr(address)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="btn-tactile p-2 rounded-lg hover:bg-red-50 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => connectors.length > 1 ? setShowMenu((v) => !v) : connect({ connector: connectors[0] })}
        disabled={isConnectPending}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'bg-slate-900 text-white font-medium text-sm',
          'hover:bg-slate-800 transition-colors btn-tactile',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isConnectPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        <span>{isConnectPending ? 'Connecting...' : 'Connect Wallet'}</span>
        {connectors.length > 1 && !isConnectPending && (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      <AnimatePresence>
        {showMenu && connectors.length > 1 && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden"
            >
              <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                Select Wallet
              </div>
              {connectors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleConnect(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Wallet className="w-4 h-4 text-slate-400" />
                  {c.name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
