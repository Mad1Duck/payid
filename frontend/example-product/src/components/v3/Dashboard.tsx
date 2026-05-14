import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Send, Download, Clock, ArrowUpRight, ArrowDownLeft, User } from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'

interface Transaction {
  id: string
  type: 'sent' | 'received'
  name: string
  payId: string
  amount: string
  token: string
  fiatAmount: string
  date: string
  status: 'completed' | 'pending'
}

// Demo transactions — in production these would come from indexer/chain queries
const demoTxs: Transaction[] = [
  {
    id: 'tx1',
    type: 'sent',
    name: 'Alice Johnson',
    payId: 'alice@payid.app',
    amount: '0.05',
    token: 'ETH',
    fiatAmount: 'Rp 2.450.000',
    date: 'Today, 14:32',
    status: 'completed',
  },
  {
    id: 'tx2',
    type: 'received',
    name: 'Bob Smith',
    payId: 'bob@payid.app',
    amount: '0.12',
    token: 'ETH',
    fiatAmount: 'Rp 5.880.000',
    date: 'Yesterday, 09:15',
    status: 'completed',
  },
  {
    id: 'tx3',
    type: 'sent',
    name: 'Carol White',
    payId: 'carol@payid.app',
    amount: '0.03',
    token: 'ETH',
    fiatAmount: 'Rp 1.470.000',
    date: 'May 12, 18:45',
    status: 'completed',
  },
]

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1A1F71, #2D336B)',
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })

  const ethBalance = balance?.value ? Number(formatEther(balance.value)) : 0
  const ethPrice = 3500 // Mock ETH price in USD — in production use oracle
  const idrRate = 15800 // Mock USD to IDR rate
  const fiatBalance = ethBalance * ethPrice * idrRate

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Good afternoon
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {isConnected && address ? 'Ready to send or receive?' : 'Connect your wallet to get started'}
        </p>
      </div>

      {/* Balance Card */}
      <div
        className="card p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1A1F71 0%, #2D336B 100%)',
          color: 'white',
        }}
      >
        <div className="relative z-10">
          <p className="text-sm opacity-80">Your Balance</p>
          <p className="text-3xl font-bold mt-2">
            {formatIDR(fiatBalance)}
          </p>
          <p className="text-sm opacity-70 mt-1">
            {ethBalance.toFixed(4)} ETH
          </p>
        </div>
        {/* Decorative circles */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
        <div
          className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/v3/app/send" className="card p-4 flex flex-col items-center gap-2 text-center hover:scale-[1.02] transition-transform">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(26, 31, 113, 0.08)' }}
          >
            <Send style={{ width: 22, height: 22, color: 'var(--accent-blue)' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Send
          </span>
        </Link>

        <Link to="/v3/app/receive" className="card p-4 flex flex-col items-center gap-2 text-center hover:scale-[1.02] transition-transform">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0, 200, 150, 0.08)' }}
          >
            <Download style={{ width: 22, height: 22, color: 'var(--accent-green)' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Receive
          </span>
        </Link>

        <Link to="/v3/app/history" className="card p-4 flex flex-col items-center gap-2 text-center hover:scale-[1.02] transition-transform">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.08)' }}
          >
            <Clock style={{ width: 22, height: 22, color: '#F59E0B' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            History
          </span>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>
          <Link
            to="/v3/app/history"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent-blue)' }}
          >
            See All
          </Link>
        </div>

        <div className="space-y-3">
          {demoTxs.map((tx) => (
            <div
              key={tx.id}
              className="card p-4 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: tx.type === 'sent'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(0, 200, 150, 0.08)',
                }}
              >
                {tx.type === 'sent' ? (
                  <ArrowUpRight
                    style={{
                      width: 20,
                      height: 20,
                      color: '#EF4444',
                    }}
                  />
                ) : (
                  <ArrowDownLeft
                    style={{
                      width: 20,
                      height: 20,
                      color: 'var(--accent-green)',
                    }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {tx.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {tx.date}
                </p>
              </div>

              <div className="text-right">
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: tx.type === 'sent' ? '#EF4444' : 'var(--accent-green)',
                  }}
                >
                  {tx.type === 'sent' ? '-' : '+'}{tx.fiatAmount}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {tx.amount} {tx.token}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
