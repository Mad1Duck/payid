import { useDashboard } from '../hooks/useDashboard'
import { BalanceCard, PersonalLinkCard, QuickActions, ReputationCard, CacheStats, TransactionList } from '../components'

export default function Dashboard() {
  const {
    address, isConnected, balanceLoading, balanceValue, ethUsdPrice,
    txMounted,
    p, copied, cacheStats, cacheReady,
    activeTab, setActiveTab,
    score, isBlacklisted, isTrusted, repLoading,
    payId, handleCopy,
    filteredTx, tokens, relativeTime,
  } = useDashboard()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Dashboard</h1>
      </div>

      <BalanceCard
        balanceValue={balanceValue}
        ethUsdPrice={ethUsdPrice}
        balanceLoading={balanceLoading}
        tokens={tokens}
      />

      <PersonalLinkCard
        isConnected={isConnected}
        address={address}
        payId={payId}
        copied={copied}
        handleCopy={handleCopy}
        p={p}
      />

      <QuickActions p={p} />

      <ReputationCard
        score={score}
        isBlacklisted={isBlacklisted}
        isTrusted={isTrusted}
        repLoading={repLoading}
        p={p}
      />

      {cacheReady && <CacheStats cacheStats={cacheStats} p={p} />}

      <TransactionList
        filteredTx={filteredTx}
        txMounted={txMounted}
        isConnected={isConnected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        relativeTime={relativeTime}
        p={p}
      />
    </div>
  )
}
