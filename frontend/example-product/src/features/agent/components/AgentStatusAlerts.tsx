import { AlertTriangle } from 'lucide-react'

interface Props {
  hasApiKey: boolean
  isConnected: boolean
  isWrongChain: boolean
}

export default function AgentStatusAlerts({ hasApiKey, isConnected, isWrongChain }: Props) {
  return (
    <>
      {!hasApiKey && (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-medium">0G AI API Key not configured</p>
            <p className="text-xs text-amber-400 mt-0.5">
              Set <code className="bg-amber-500/20 px-1 rounded">VITE_0G_AI_API_KEY</code> in your <code>.env</code> file. Get your key at{' '}
              <a href="https://pc.0g.ai" target="_blank" rel="noreferrer" className="underline">pc.0g.ai</a>
            </p>
          </div>
        </div>
      )}
      {!isConnected && (
        <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">Connect wallet for on-chain execution after AI approval.</p>
        </div>
      )}
      {isWrongChain && (
        <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">Switch to <strong>0G Testnet (16601 / 16602)</strong></p>
        </div>
      )}
    </>
  )
}
