import { Bell, Plus, QrCode, Settings } from 'lucide-react'
import { MobileLayout } from '@/components/Layouts/MobileLayout'
import { BalanceCard } from '@/components/BalanceCard'
import { PaymentCard } from '@/components/PaymentCard'
import { Button } from '@/components/ui/button'

// Mock data
const recentPayments = [
  {
    id: '1',
    amount: 250,
    token: 'USDC',
    status: 'allowed' as const,
    type: 'incoming' as const,
    sender: 'alice.pay.id',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '2',
    amount: 50,
    token: 'USDC',
    status: 'rejected' as const,
    type: 'incoming' as const,
    sender: 'unknown.sender',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    amount: 1000,
    token: 'USDC',
    status: 'allowed' as const,
    type: 'incoming' as const,
    sender: 'company.pay.id',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '4',
    amount: 75,
    token: 'ETH',
    status: 'rejected' as const,
    type: 'incoming' as const,
    sender: 'random.pay.id',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
]

export default function Index() {
  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">PayID</h1>
            <p className="text-sm text-muted-foreground">Welcome back</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-secondary transition-colors relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </button>
            <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Balance Card */}
        <div className="mt-2 animate-fade-in">
          <BalanceCard balance={12450.5} token="USDC" payId="pay.id/satoshi" />
        </div>

        {/* Quick Actions */}
        <div
          className="mt-6 grid grid-cols-2 gap-3 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <Button
            size="lg"
            className="h-14 rounded-2xl"
            // onClick={() => navigate("/rules")}
          >
            <Plus className="w-5 h-5" />
            Create Rule
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-14 bg-accent rounded-2xl"
            // onClick={() => navigate("/qr")}
          >
            <QrCode className="w-5 h-5" />
            Generate QR
          </Button>
        </div>

        {/* Recent Activity */}
        <section
          className="mt-8 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Activity
            </h2>
            <button
              // onClick={() => navigate("/history")}
              className="text-sm text-accent font-medium hover:underline"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {recentPayments.map((payment, index) => (
              <div
                key={payment.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.05}s` }}
              >
                <PaymentCard
                  {...payment}
                  // onClick={() => navigate(`/verify?id=${payment.id}`)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Stats Summary */}
        <section
          className="mt-8 mb-6 animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground mt-1">Active Rules</p>
            </div>
            <div className="p-4 rounded-2xl bg-success-muted border border-success/20 text-center">
              <p className="text-2xl font-bold text-success">89%</p>
              <p className="text-xs text-success/80 mt-1">Allowed</p>
            </div>
            <div className="p-4 rounded-2xl bg-destructive-muted border border-destructive/20 text-center">
              <p className="text-2xl font-bold text-destructive">11%</p>
              <p className="text-xs text-destructive/80 mt-1">Rejected</p>
            </div>
          </div>
        </section>
      </div>
    </MobileLayout>
  )
}
