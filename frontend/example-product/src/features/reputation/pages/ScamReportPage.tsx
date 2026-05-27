import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSubmitReport, useConfirmReport, useCanReport, useVranConfig, useReport } from 'payid-react'
import { useIPFSUpload } from '../hooks/useIPFSUpload'
import { useV4Palette } from '@/components/v4/theme'
import {
  ShieldAlert, Upload, FileText, Check, AlertCircle, Loader2,
  ArrowLeft, ChevronRight, Search, ExternalLink, Info
} from 'lucide-react'

// ─── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const p = useV4Palette()
  const labels = ['Evidence', 'Details', 'Submit']
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const step = i + 1
        const done = current > step
        const active = current === step
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-[#00D084] text-[#0B0F1A]' : active ? 'bg-[#00D084]/20 text-[#00D084] border border-[#00D084]' : `border ${p.cardBorder} ${p.textMuted}`
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : step}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-[#00D084]' : p.textMuted}`}>{label}</span>
            </div>
            {i < labels.length - 1 && <ChevronRight className={`w-3 h-3 ${p.textMuted} opacity-40`} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Confirm lookup component ──────────────────────────────────────────────────

function ConfirmSection() {
  const p = useV4Palette()
  const [reportIdInput, setReportIdInput] = useState('')
  const [lookupId, setLookupId] = useState<bigint | null>(null)
  const { canReport, score } = useCanReport({})
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

      {/* Report ID lookup */}
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

      {/* Report details */}
      <AnimatePresence>
        {lookupId !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border ${p.cardBorder}`}
            style={{ background: p.cardBgSolid }}
          >
            {loadingReport ? (
              <div className="flex items-center gap-2">
                <Loader2 className={`w-4 h-4 ${p.textMuted} animate-spin`} />
                <span className={`text-sm ${p.textMuted}`}>Loading report #{lookupId.toString()}...</span>
              </div>
            ) : report ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${p.textMain}`}>Report #{lookupId.toString()}</span>
                  <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                </div>
                <div className={`text-xs ${p.textMuted} space-y-1`}>
                  <div>Target: <span className={`font-mono ${p.textMain}`}>{report.target}</span></div>
                  <div>Stake: <span className={p.textMain}>{(Number(report.stake) / 1e18).toFixed(4)} ETH</span></div>
                  <div>Confirmations: <span className={p.textMain}>{report.confirmations}</span></div>
                </div>
                {report.evidenceHash && (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${report.evidenceHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#0EA5E9] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> View Evidence
                  </a>
                )}
              </div>
            ) : (
              <div className={`text-sm ${p.textMuted}`}>No report found for ID #{lookupId.toString()}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleConfirm}
        disabled={!canConfirm || !lookupId || !report || report.resolved || isPending}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0EA5E9] text-white text-sm font-bold hover:bg-[#0284C7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Confirming on-chain...</>
        ) : (
          <><Check className="w-4 h-4" /> Confirm This Report</>
        )}
      </button>

      {error && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error.message}
        </div>
      )}

      {isSuccess && (
        <div className="p-3 rounded-xl bg-[#00D084]/10 text-[#00D084] text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> Confirmation recorded on-chain.
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function ScamReportPage() {
  const [step, setStep] = useState(1)
  const [targetAddress, setTargetAddress] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidenceHash, setEvidenceHash] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [activeTab, setActiveTab] = useState<'submit' | 'confirm'>('submit')
  const p = useV4Palette()

  const { canReport, score } = useCanReport({})
  const { minStake, minReporterReputation } = useVranConfig({})
  const { submitReport, isPending, isSuccess, error } = useSubmitReport({})

  const isValidAddress = targetAddress.startsWith('0x') && targetAddress.length === 42
  const isValidStake = stakeAmount !== '' && parseFloat(stakeAmount) >= Number(minStake) / 1e18

  const handleSubmit = () => {
    if (!isValidAddress || !evidenceHash || !isValidStake) return
    const stake = BigInt(Math.floor(parseFloat(stakeAmount) * 1e18))
    submitReport(targetAddress as `0x${string}`, evidenceHash, stake)
  }

  const canSubmit = isValidAddress && evidenceHash !== '' && isValidStake && canReport && !isPending

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className={`p-2 rounded-xl ${p.cardBgSolid} border ${p.cardBorder} hover:opacity-80 transition-opacity`}
        >
          <ArrowLeft className={`w-5 h-5 ${p.textMain}`} />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${p.textMain}`}>VRAN Reports</h1>
          <p className={`text-sm ${p.textMuted}`}>Submit or confirm staked community reports</p>
        </div>
      </div>

      {/* Tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'submit' ? 'bg-[#EF4444] text-white' : `${p.textMuted} hover:${p.textMain}`
          }`}
        >
          Report Bad Actor
        </button>
        <button
          onClick={() => setActiveTab('confirm')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'confirm' ? 'bg-[#0EA5E9] text-white' : `${p.textMuted} hover:${p.textMain}`
          }`}
        >
          Confirm Report
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'submit' ? (
          <motion.div
            key="submit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Eligibility check */}
            {!canReport && (
              <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[#EF4444]">Not eligible to report</div>
                  <div className="text-xs text-[#EF4444]/80 mt-0.5">
                    You need {Number(minReporterReputation)}+ reputation to submit reports. Your score: {score}.
                    Complete transactions to build reputation.
                  </div>
                </div>
              </div>
            )}

            {/* Form card */}
            <div className="rounded-3xl p-6" style={{ background: p.glass.bg, border: p.glass.border }}>
              {/* Step indicator */}
              <div className="mb-6">
                <Steps current={step} />
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1 — Upload Evidence */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="space-y-4"
                  >
                    <div>
                      <div className={`text-base font-semibold ${p.textMain} mb-1`}>Upload Evidence</div>
                      <div className={`text-sm ${p.textMuted}`}>
                        Upload proof of the scam. Files are stored permanently on IPFS.
                      </div>
                    </div>

                    {!evidenceFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-[#00D084] transition-colors ${p.cardBorder}`}
                      >
                        <Upload className={`w-8 h-8 mx-auto mb-3 ${p.textMuted}`} />
                        <div className={`text-sm font-medium ${p.textMain}`}>Click to select file</div>
                        <div className={`text-xs ${p.textMuted} mt-1`}>PDF, images, or text documents</div>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl border ${p.cardBorder}`} style={{ background: p.cardBgSolid }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className={`w-5 h-5 ${p.textMain}`} />
                            <div>
                              <div className={`text-sm font-medium ${p.textMain}`}>{evidenceFile.name}</div>
                              <div className={`text-xs ${p.textMuted}`}>{(evidenceFile.size / 1024).toFixed(1)} KB</div>
                            </div>
                          </div>
                          {!evidenceHash && (
                            <button onClick={() => setEvidenceFile(null)} className={`text-xs ${p.textMuted} hover:text-[#EF4444]`}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.txt" />

                    {evidenceFile && !evidenceHash && (
                      <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084]/10 text-[#00D084] text-sm font-bold hover:bg-[#00D084]/20 disabled:opacity-50 transition-colors"
                      >
                        {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading to IPFS...</> : <><Upload className="w-4 h-4" /> Upload to IPFS</>}
                      </button>
                    )}

                    {uploadError && (
                      <div className="p-3 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-sm">{uploadError}</div>
                    )}

                    {evidenceHash && (
                      <div className="p-4 rounded-xl bg-[#00D084]/10 border border-[#00D084]/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Check className="w-4 h-4 text-[#00D084]" />
                          <span className="text-sm font-semibold text-[#00D084]">Uploaded to IPFS</span>
                        </div>
                        <div className={`text-xs ${p.textMuted} break-all font-mono`}>{evidenceHash}</div>
                      </div>
                    )}

                    <button
                      onClick={() => setStep(2)}
                      disabled={!canGoToStep2}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next: Enter Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {/* Step 2 — Target Address */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="space-y-4"
                  >
                    <div>
                      <div className={`text-base font-semibold ${p.textMain} mb-1`}>Target Address</div>
                      <div className={`text-sm ${p.textMuted}`}>
                        The address you're reporting as a bad actor.
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl bg-transparent ${p.textMain} placeholder-gray-500 focus:outline-none border ${p.cardBorder} text-sm font-mono`}
                      />
                      {targetAddress && !isValidAddress && (
                        <p className="text-[#EF4444] text-xs mt-1">Must be a valid 42-character 0x address</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className={`flex-1 px-5 py-3 rounded-xl border ${p.cardBorder} ${p.textMuted} text-sm font-bold hover:opacity-80 transition-opacity`}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        disabled={!canGoToStep3}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Next: Set Stake <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 — Stake & Submit */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="space-y-4"
                  >
                    <div>
                      <div className={`text-base font-semibold ${p.textMain} mb-1`}>Stake ETH</div>
                      <div className={`text-sm ${p.textMuted}`}>
                        Your stake is held until the report is resolved. False reports forfeit it.
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder={(Number(minStake) / 1e18).toFixed(4)}
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className={`w-full px-4 py-3 pr-14 rounded-xl bg-transparent ${p.textMain} placeholder-gray-500 focus:outline-none border ${p.cardBorder} text-sm`}
                        />
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${p.textMuted}`}>ETH</span>
                      </div>
                      <div className={`text-xs ${p.textMuted} mt-1`}>
                        Minimum: {(Number(minStake) / 1e18).toFixed(4)} ETH
                      </div>
                      {stakeAmount && !isValidStake && (
                        <p className="text-[#EF4444] text-xs mt-1">
                          Stake must be at least {(Number(minStake) / 1e18).toFixed(4)} ETH
                        </p>
                      )}
                    </div>

                    {/* Summary */}
                    {isValidStake && isValidAddress && (
                      <div className={`p-4 rounded-xl border ${p.cardBorder} space-y-2`} style={{ background: p.cardBgSolid }}>
                        <div className={`text-xs font-semibold ${p.textMuted} uppercase tracking-wide`}>Report Summary</div>
                        <div className={`text-xs ${p.textMuted}`}>
                          Target: <span className={`font-mono ${p.textMain}`}>{targetAddress}</span>
                        </div>
                        <div className={`text-xs ${p.textMuted}`}>
                          Stake: <span className={p.textMain}>{parseFloat(stakeAmount).toFixed(4)} ETH</span>
                        </div>
                        <div className={`text-xs ${p.textMuted}`}>
                          Evidence: <span className={`font-mono ${p.textMain}`}>{evidenceHash.slice(0, 20)}…</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className={`flex-1 px-5 py-3 rounded-xl border ${p.cardBorder} ${p.textMuted} text-sm font-bold hover:opacity-80 transition-opacity`}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#EF4444] text-white text-sm font-bold hover:bg-[#DC2626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {isPending ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : isConfirming ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                        ) : (
                          <><ShieldAlert className="w-4 h-4" /> Submit Report</>
                        )}
                      </button>
                    </div>

                    {error && (
                      <div className="p-4 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error.message}
                      </div>
                    )}

                    {isSuccess && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-xl bg-[#00D084]/10 border border-[#00D084]/20 text-[#00D084] text-sm flex items-start gap-2"
                      >
                        <Check className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-semibold">Report Submitted</div>
                          <div className="text-xs mt-0.5 text-[#00D084]/80">
                            Community sentinels (rep {Number(minReporterReputation)}+) can now confirm your report.
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Guidelines */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl p-5"
              style={{ background: p.glass.bg, border: p.glass.border }}
            >
              <div className="flex items-start gap-3">
                <Info className={`w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5`} />
                <div>
                  <div className={`text-sm font-semibold ${p.textMain} mb-2`}>Reporting Guidelines</div>
                  <div className={`text-xs ${p.textMuted} space-y-1.5`}>
                    <p>• Only report with verifiable, on-chain or documented evidence</p>
                    <p>• False reports will slash your stake and reduce your reputation</p>
                    <p>• Evidence is stored permanently on IPFS and cannot be removed</p>
                    <p>• Reports need {Number(minReporterReputation)}+ rep sentinels to confirm</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-3xl p-6"
            style={{ background: p.glass.bg, border: p.glass.border }}
          >
            <div className="mb-5">
              <div className={`text-base font-semibold ${p.textMain} mb-1`}>Confirm Existing Report</div>
              <div className={`text-sm ${p.textMuted}`}>
                Sentinels with {Number(minReporterReputation)}+ reputation can add confirmations to pending reports.
              </div>
            </div>
            <ConfirmSection />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
