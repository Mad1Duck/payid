import { useHistoryPage } from '../hooks/useHistoryPage'
import { WalletConnectPrompt, StatsCards, SearchAndTabs, TransactionList } from '../components'

export default function HistoryPage() {
  const {
    p, isConnected, activeTab, setActiveTab, search, setSearch,
    mounted, filteredTxs, totalSent, totalReceived, relativeTime,
  } = useHistoryPage()

  if (!isConnected) {
    return <WalletConnectPrompt p={p} />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>History</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          All transactions via PAY.ID
        </p>
      </div>

      <StatsCards totalSent={totalSent} totalReceived={totalReceived} />

      <SearchAndTabs
        p={p}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <TransactionList
        p={p}
        mounted={mounted}
        filteredTxs={filteredTxs}
        activeTab={activeTab}
        search={search}
        isConnected={isConnected}
        relativeTime={relativeTime}
      />
    </div>
  )
}
