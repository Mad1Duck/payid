import { Activity, Cpu, Shield, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RuleConnection {
  id: string
  name: string
  status: 'active' | 'inactive' | 'pending'
  type: 'min-amount' | 'token' | 'sender' | 'time' | 'custom'
}

interface MonitorProps {
  connections: RuleConnection[]
  chainName?: string
  className?: string
}

export function MiniRuleMonitor({
  connections,
  chainName = 'Hardhat',
  className,
}: MonitorProps) {
  const activeCount = connections.filter((c) => c.status === 'active').length

  return (
    <div
      className={cn(
        'rounded-2xl p-4 text-xs font-mono relative overflow-hidden',
        'bg-slate-900 border border-slate-700/50',
        'shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      {/* CRT scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,255,0,0.03) 2px,
            rgba(0,255,0,0.03) 4px
          )`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50 relative z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
            System Monitor
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[10px]">{chainName}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
          <p className="text-lg font-bold text-emerald-400">{activeCount}</p>
          <p className="text-[9px] text-slate-500 uppercase">Active</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
          <p className="text-lg font-bold text-slate-300">{connections.length}</p>
          <p className="text-[9px] text-slate-500 uppercase">Total</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/30">
          <p className="text-lg font-bold text-emerald-400">
            {connections.length > 0 ? Math.round((activeCount / connections.length) * 100) : 0}%
          </p>
          <p className="text-[9px] text-slate-500 uppercase">Health</p>
        </div>
      </div>

      {/* Connection List */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-1.5 text-slate-500 uppercase text-[9px] tracking-wider mb-2">
          <Activity className="w-3 h-3" />
          <span>Active Rules</span>
        </div>

        {connections.length === 0 && (
          <div className="text-center py-4 text-slate-600 text-[10px] uppercase tracking-wider">
            No rules connected
          </div>
        )}

        {connections.map((connection, index) => (
          <motion.div
            key={connection.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg',
              connection.status === 'active'
                ? 'bg-emerald-500/5 border border-emerald-500/15'
                : connection.status === 'pending'
                  ? 'bg-amber-500/5 border border-amber-500/15'
                  : 'bg-slate-800/30 border border-slate-700/20',
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                connection.status === 'active'
                  ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]'
                  : connection.status === 'pending'
                    ? 'bg-amber-400'
                    : 'bg-slate-600',
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 truncate text-[10px]">{connection.name}</p>
              <p className="text-[8px] text-slate-500 uppercase">
                {connection.type}
              </p>
            </div>
            {connection.status === 'active' && (
              <Shield className="w-3 h-3 text-emerald-400" />
            )}
            {connection.status === 'pending' && (
              <Zap className="w-3 h-3 text-amber-400" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Connection Flow Visualization */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 relative z-10">
        <div className="flex items-center gap-1.5 text-slate-500 uppercase text-[9px] tracking-wider mb-2">
          <Activity className="w-3 h-3" />
          <span>Connection Flow</span>
        </div>
        <div className="flex items-center gap-1">
          {connections.length === 0 ? (
            <div className="w-full h-1.5 rounded-full bg-slate-800" />
          ) : (
            connections.map((connection, index) => (
              <div key={connection.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    'w-full h-1.5 rounded-full transition-all duration-300',
                    connection.status === 'active'
                      ? 'bg-linear-to-r from-emerald-500 to-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                      : connection.status === 'pending'
                        ? 'bg-amber-500/30'
                        : 'bg-slate-700',
                  )}
                />
                {index < connections.length - 1 && (
                  <div
                    className={cn(
                      'w-2 h-0.5',
                      connection.status === 'active'
                        ? 'bg-emerald-500/50'
                        : 'bg-slate-700',
                    )}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
