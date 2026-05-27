import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Search, ExternalLink, Info } from 'lucide-react'
import { useCanReport, useVranConfig, useReport, useConfirmReport } from 'payid-react'
import { useV4Palette } from '@/components/v4/theme'

export function ReportConfirmSection() {
  const p = useV4Palette()
  const [reportIdInput, setReportIdInput] = useState('')
  const [lookupId, setLookupId] = useState<bigint | null>(null)
  const { score } = useCanReport({})
  const { minReporterReputation } = useVranConfig({})
  const { report, isLoading: loadingReport } = useReport({ reportId: lookupId ?? 0n })
  const { confirmReport, isPending, isSuccess, error } = useConfirmReport({})

  const canConfirm = score >= Number(minReporterReputation)

  const handleLookup = () => {
    const id = parseInt(reportIdInput.trim())
    if (!isNaN(id) && id > 0) setLookupId(BigInt(id))
  }

  const handleConfirm = () => {
    if (!lookupId) return
    confirmReport(lookupId)
  }

  const statusLabel = report?.resolved
    ? report.valid ? 'Confirmed Scam' : 'Rejected'
    : `Pending — ${report?.confirmations ?? 0} confirmations`

  const statusColor = report?.resolved
    ? report.valid ? 'text-[#EF4444]' : 'text-gray-400'
    : 'text-[#F59E0B]'

  return (
    <div className="space-y-4">
      {!canConfirm && (
        <div className="p-3 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          You need {Number(minReporterReputation)}+ reputation to confirm reports. Your score: {score}.
        </div>
      )}

      <div>
        <label className={`block text-xs font-medium ${p.textMuted} mb-1.5`}>Report ID</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="e.g. 42"
            value={reportIdInput}
            onChange={(e) => setReportIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className={`flex-1 px-4 py-3 rounded-xl bg-transparent ${p.textMain} placeholder-gray-500 focus:outline-none border ${p.cardBorder} text-sm`}
          />
          <button
            onClick={handleLookup}
            disabled={!reportIdInput}
            className="px-4 py-3 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] text-sm font-bold hover:bg-[#0EA5E9]/20 disabled:opacity-40 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {lookupId !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {loadingReport ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : report ? (
              <div className={`p-4 rounded-xl border ${p.cardBorder}`} style={{ backgroundColor: p.cardBg }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-sm font-semibold ${p.textMain}`}>Report #{reportIdInput}</p>
                    <p className={`text-xs ${statusColor} mt-0.5`}>{statusLabel}</p>
                  </div>
                  {report.evidenceHash && (
                    <a
                      href={`https://ipfs.io/ipfs/${report.evidenceHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#0EA5E9] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Evidence
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-[#64748B]" />
                    <p className={`text-xs ${p.textMuted}`}>Reported: {new Date(Number(report.timestamp) * 1000).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-[#64748B]" />
                    <p className={`text-xs ${p.textMuted}`}>Target: {report.target.slice(0, 8)}…{report.target.slice(-6)}</p>
                  </div>
                </div>
                {!report.resolved && canConfirm && (
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="mt-3 w-full py-2.5 rounded-xl bg-[#00D084] text-white text-sm font-bold hover:bg-[#00D084]/90 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? 'Confirming…' : 'Confirm Report'}
                  </button>
                )}
                {isSuccess && (
                  <div className="mt-3 p-2 rounded-lg bg-[#00D084]/10 text-[#00D084] text-xs text-center">
                    Report confirmed successfully!
                  </div>
                )}
                {error && (
                  <div className="mt-3 p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] text-xs text-center">
                    Failed to confirm report
                  </div>
                )}
              </div>
            ) : (
              <div className={`p-4 rounded-xl border ${p.cardBorder} text-center`} style={{ backgroundColor: p.cardBg }}>
                <p className={`text-sm ${p.textMuted}`}>Report not found</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
