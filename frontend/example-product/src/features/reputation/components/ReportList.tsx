import { motion } from 'framer-motion'
import { useReport } from 'payid-react'
import { useReportList } from '../hooks/useReportList'
import { useV4Palette } from '@/components/v4/theme'
import { shortAddr } from '@/features/shared'
import { FileText, AlertTriangle, ShieldCheck, Loader2, ExternalLink } from 'lucide-react'

interface ReportListProps {
  target?: `0x${string}`
}

function ReportCard({ reportId, index }: { reportId: bigint; index: number }) {
  const p = useV4Palette()
  const { report, isLoading } = useReport({ reportId })

  if (isLoading || !report) {
    return (
      <div className={`p-3 rounded-xl border ${p.cardBorder} flex items-center gap-3`} style={{ background: p.cardBgSolid }}>
        <Loader2 className={`w-4 h-4 ${p.textMuted} animate-spin shrink-0`} />
        <div className={`text-sm ${p.textMuted}`}>Loading report #{reportId.toString()}...</div>
      </div>
    )
  }

  const date = new Date(Number(report.timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const statusColor = report.resolved
    ? report.valid
      ? 'bg-[#EF4444]/10 text-[#EF4444]'
      : 'bg-gray-100 text-gray-500'
    : 'bg-[#F59E0B]/10 text-[#F59E0B]'

  const statusLabel = report.resolved
    ? report.valid
      ? 'Confirmed'
      : 'Rejected'
    : `${report.confirmations}/${report.confirmations + 1} Confirms`

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-3 rounded-xl border ${p.cardBorder}`}
      style={{ background: p.cardBgSolid }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${p.textMuted} shrink-0`} />
          <span className={`text-sm font-medium ${p.textMain}`}>Report #{reportId.toString()}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className={`text-xs ${p.textMuted} space-y-1`}>
        <div className="flex items-center gap-2">
          <span>Reporter:</span>
          <span className={`font-mono ${p.textMain}`}>{shortAddr(report.reporter)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Date:</span>
          <span className={p.textMain}>{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Stake:</span>
          <span className={p.textMain}>{(Number(report.stake) / 1e18).toFixed(4)} ETH</span>
        </div>
      </div>

      {report.evidenceHash && (
        <a
          href={`https://gateway.pinata.cloud/ipfs/${report.evidenceHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-[#0EA5E9] hover:text-[#0284C7] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Evidence
        </a>
      )}
    </motion.div>
  )
}

export function ReportList({ target }: ReportListProps) {
  const p = useV4Palette()
  const { reportIds, isLoading, count } = useReportList({ target })

  if (isLoading) {
    return (
      <div className="rounded-3xl p-5 relative backdrop-blur-20" style={{ background: p.glass.bg, border: p.glass.border }}>
        <div className="flex items-center gap-3">
          <Loader2 className={`w-5 h-5 ${p.textMuted} animate-spin shrink-0`} />
          <div className={`text-sm ${p.textMuted}`}>Loading reports...</div>
        </div>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="rounded-3xl p-5 relative backdrop-blur-20" style={{ background: p.glass.bg, border: p.glass.border }}>
        <div className="flex items-center gap-3">
          <ShieldCheck className={`w-5 h-5 text-[#00D084] shrink-0`} />
          <div>
            <div className={`font-medium ${p.textMain}`}>No Reports Found</div>
            <div className={`text-xs ${p.textMuted}`}>This address has no community reports against it.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl p-5 relative backdrop-blur-20" style={{ background: p.glass.bg, border: p.glass.border }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className={`w-5 h-5 text-[#F59E0B]`} />
        <h3 className={`font-semibold ${p.textMain}`}>Community Reports</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] font-medium`}>
          {count}
        </span>
      </div>

      <div className="space-y-3">
        {reportIds.map((id, index) => (
          <ReportCard key={id.toString()} reportId={id} index={index} />
        ))}
      </div>
    </div>
  )
}
