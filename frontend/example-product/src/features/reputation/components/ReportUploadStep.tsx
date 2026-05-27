import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Check, Loader2, ChevronRight } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'
import { useIPFSUpload } from '../hooks/useIPFSUpload'

interface Props {
  evidenceFile: File | null
  setEvidenceFile: (file: File | null) => void
  evidenceHash: string
  setEvidenceHash: (hash: string) => void
  onNext: () => void
}

export function ReportUploadStep({ evidenceFile, setEvidenceFile, evidenceHash, setEvidenceHash, onNext }: Props) {
  const p = useV4Palette()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadToIPFS, isUploading, error: uploadError } = useIPFSUpload()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setEvidenceFile(file)
  }

  const handleUpload = async () => {
    if (!evidenceFile) return
    try {
      const cid = await uploadToIPFS(evidenceFile)
      setEvidenceHash(cid)
    } catch {}
  }

  const canGoToStep2 = evidenceHash !== ''

  return (
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
        onClick={onNext}
        disabled={!canGoToStep2}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-bold hover:bg-[#00B86E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next: Enter Details <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
