import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Trash2,
  Send,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Shield,
  Clock,
  Repeat,
} from 'lucide-react'
import { formatUnits } from 'viem'
import { toast } from 'sonner'
import { useDAOPayroll } from '../hooks/useDAOPayroll'

export default function DAOPayroll() {
  const {
    p, nativeSymbol, balance,
    recipients, newAddress, setNewAddress, newAmount, setNewAmount,
    newRole, setNewRole, newSchedule, setNewSchedule, showAddForm, setShowAddForm,
    simulationResult, runs, totalPayroll, isSufficient,
    addRecipient, removeRecipient, simulate, createSubscriptions, isCreating, isBatching,
    userSubscriptions, isLoadingSubs, fetchUserSubscriptions,
  } = useDAOPayroll()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${p.textMain}`}>DAO Payroll</h1>
            <p className={`text-sm ${p.textMuted}`}>Batch distribute to contributors with policy enforcement</p>
          </div>
        </div>
      </motion.div>

      {/* Treasury Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-2xl p-5 border ${p.cardBorder}`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className={`text-xs ${p.textMuted} mb-1`}>Treasury Balance</p>
            <p className={`text-xl font-bold font-mono ${p.textMain}`}>
              {balance ? formatUnits(balance.value, balance.decimals) : '12.50'} {balance?.symbol || nativeSymbol}
            </p>
          </div>
          <div>
            <p className={`text-xs ${p.textMuted} mb-1`}>Total Payroll</p>
            <p className={`text-xl font-bold font-mono ${isSufficient ? 'text-[#00D084]' : 'text-[#EF4444]'}`}>
              {totalPayroll} {nativeSymbol}
            </p>
          </div>
          <div>
            <p className={`text-xs ${p.textMuted} mb-1`}>Active Contributors</p>
            <p className={`text-xl font-bold font-mono ${p.textMain}`}>{recipients.length}</p>
          </div>
        </div>
        {!isSufficient && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#EF4444]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Insufficient treasury balance for this payroll run</span>
          </div>
        )}
      </motion.div>

      {/* Recipients */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div className="p-5 border-b border-dashed border-[#E5E7EB]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#64748B]" />
            <h2 className={`text-sm font-semibold ${p.textMain}`}>Contributor List</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D084]/10 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/15 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-dashed border-[#E5E7EB]/30 overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
                />
                <input
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00 ETH"
                  className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
                />
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Role"
                  className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40`}
                />
                <select
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value as any)}
                  className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="one-time">One-time</option>
                </select>
                <button
                  onClick={addRecipient}
                  className="px-3 py-2 rounded-lg bg-[#00D084] text-[#0B0F1A] text-xs font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
          {recipients.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#8B5CF6]">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                <div>
                  <p className={`text-xs font-mono ${p.textMain} truncate`}>{r.address}</p>
                  <p className={`text-[10px] ${p.textMuted}`}>{r.role}</p>
                </div>
                <div className={`text-sm font-bold font-mono ${p.textMain}`}>{r.amount} ETH</div>
                <div className="flex items-center gap-1">
                  {r.schedule === 'monthly' ? (
                    <Repeat className="w-3 h-3 text-[#64748B]" />
                  ) : r.schedule === 'weekly' ? (
                    <Clock className="w-3 h-3 text-[#64748B]" />
                  ) : (
                    <Send className="w-3 h-3 text-[#64748B]" />
                  )}
                  <span className={`text-[10px] ${p.textMuted} capitalize`}>{r.schedule}</span>
                </div>
              </div>
              <button
                onClick={() => removeRecipient(r.id)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Simulation */}
      <AnimatePresence mode="wait">
        {simulationResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
            style={{ backgroundColor: p.cardBg }}
          >
            <div className="p-5 border-b border-dashed border-[#E5E7EB]/30">
              <div className="flex items-center gap-2 mb-3">
                {simulationResult.decision === 'ALLOW' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00D084]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                )}
                <span className={`text-sm font-semibold ${simulationResult.decision === 'ALLOW' ? 'text-[#00D084]' : 'text-[#F59E0B]'}`}>
                  {simulationResult.decision === 'ALLOW' ? 'Payroll Approved' : 'Payroll Blocked'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Total</p>
                  <p className={`text-lg font-bold font-mono ${p.textMain}`}>{simulationResult.total} ETH</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Gas Est.</p>
                  <p className={`text-lg font-bold font-mono ${p.textMain}`}>{simulationResult.gasEstimate} ETH</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-1">
              {simulationResult.policyCheck.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-[#00D084]" />
                  <span className={p.textMuted}>{check}</span>
                </div>
              ))}
            </div>
            {simulationResult.decision === 'ALLOW' && (
              <div className="p-5 border-t border-dashed border-[#E5E7EB]/30 space-y-4">
                <button
                  onClick={createSubscriptions}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Subscriptions...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Create Recurring Subscriptions
                    </>
                  )}
                </button>
                <p className={`text-[11px] ${p.textMuted}`}>
                  Sets up automatic recurring payments for all contributors. First payment sent immediately, then based on schedule (weekly/monthly).
                </p>
                <button
                  onClick={() => {
                    // TODO: Generate decision proofs and signatures for batch payment
                    // This requires SDK integration to generate DecisionProofs for each recipient
                    toast.info('Batch payment requires DecisionProofs - integrate SDK to generate proofs')
                  }}
                  disabled={isBatching}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold hover:bg-[#8B5CF6]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBatching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Batch...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Execute One-Time Batch Payment
                    </>
                  )}
                </button>
                <p className={`text-[11px] ${p.textMuted}`}>
                  Sends a one-time payment to all recipients in a single transaction using PayWithPayIDBatch contract. Requires DecisionProofs for each recipient.
                </p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Action Bar */}
      {!simulationResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-3"
        >
          <button
            onClick={simulate}
            disabled={recipients.length === 0}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
              isSufficient
                ? 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
                : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
            }`}
          >
            <Shield className="w-4 h-4" />
            {isSufficient ? 'Simulate Payroll' : 'Simulate (Insufficient Funds)'}
          </button>
        </motion.div>
      )}

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div className="p-5 border-b border-dashed border-[#E5E7EB]/30">
          <h2 className={`text-sm font-semibold ${p.textMain}`}>Payroll History</h2>
        </div>
        <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
          {runs.map((run) => (
            <div key={run.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      run.status === 'completed'
                        ? '#00D08415'
                        : run.status === 'processing'
                          ? '#F59E0B15'
                          : '#EF444415',
                  }}
                >
                  {run.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
                  ) : run.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-medium ${p.textMain}`}>{run.date}</p>
                  <p className={`text-[10px] ${p.textMuted}`}>
                    {run.recipientCount} recipients · {run.totalAmount} ETH
                  </p>
                </div>
              </div>
              {run.txHash && (
                <span className={`text-[10px] font-mono ${p.textMuted}`}>{run.txHash}</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Active Subscriptions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div className="p-5 border-b border-dashed border-[#E5E7EB]/30 flex items-center justify-between">
          <h2 className={`text-sm font-semibold ${p.textMain}`}>Active Subscriptions</h2>
          <button
            onClick={fetchUserSubscriptions}
            disabled={isLoadingSubs}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isLoadingSubs
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20'
            }`}
          >
            {isLoadingSubs ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
          {userSubscriptions.length === 0 ? (
            <div className="p-8 text-center">
              <Repeat className="w-8 h-8 mx-auto mb-2 text-[#E5E7EB]" />
              <p className={`text-sm ${p.textMuted}`}>No active subscriptions</p>
              <p className={`text-xs ${p.textMuted} mt-1`}>Create subscriptions to see them here</p>
            </div>
          ) : (
            userSubscriptions.map(({ subId, sub }) => (
              <div key={subId.toString()} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00D084]/10 flex items-center justify-center">
                      <Repeat className="w-4 h-4 text-[#00D084]" />
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${p.textMain}`}>
                        {sub.receiver.slice(0, 6)}...{sub.receiver.slice(-4)}
                      </p>
                      <p className={`text-[10px] ${p.textMuted}`}>
                        {formatUnits(sub.maxAmount, 18)} {nativeSymbol} · {sub.period === 604800n ? 'Weekly' : 'Monthly'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${p.textMain}`}>
                      {formatUnits(sub.totalCharged, 18)} {nativeSymbol}
                    </p>
                    <p className={`text-[10px] ${p.textMuted}`}>
                      {sub.numCharges.toString()} charges
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-[#E5E7EB]/30">
                  <div className={`text-[10px] ${p.textMuted}`}>
                    Next charge: {new Date(Number(sub.nextCharge) * 1000).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => {
                      // TODO: Generate DecisionProof and charge subscription
                      toast.info('Manual charge requires DecisionProof - integrate SDK to generate proof')
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg bg-[#00D084] text-[#0B0F1A] font-medium hover:bg-[#00D084]/90 transition-colors`}
                  >
                    Charge Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
