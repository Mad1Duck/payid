import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRegisterUserAIAgent } from 'payid-react'
import { toast } from 'sonner'
import { Bot, Loader2 } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

interface RegisterAgentFormProps {
  onDone: () => void
}

export function RegisterAgentForm({ onDone }: RegisterAgentFormProps) {
  const p = useV4Palette()
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [metadataURI, setMetadataURI] = useState('')
  const [modelType, setModelType] = useState('llama-3')
  const [computeProvider, setComputeProvider] = useState('0g-compute')
  const [computeEndpoint, setComputeEndpoint] = useState('')

  const { registerAgent, isPending, isSuccess } = useRegisterUserAIAgent()

  const handleSubmit = () => {
    if (!handle.trim()) {
      toast.error('Handle is required')
      return
    }
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    registerAgent({
      handle: handle.trim().toLowerCase(),
      name: name.trim(),
      metadataURI: metadataURI.trim() || 'ipfs://placeholder',
      modelType,
      computeProvider,
      computeEndpoint: computeEndpoint.trim() || 'https://compute.0g.ai',
    })
  }

  if (isSuccess) {
    toast.success('Agent registered!')
    onDone()
  }

  const input = `w-full px-3 py-2 rounded-xl text-sm border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${p.cardBorder} border rounded-2xl p-6 space-y-4`}
      style={{ backgroundColor: p.cardBg }}
    >
      <h3 className={`font-semibold ${p.textMain} flex items-center gap-2`}>
        <Bot className="w-5 h-5 text-[#00D084]" />
        Register as AI Agent
      </h3>
      <div className="space-y-3">
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Handle * (unique ID)</label>
          <input className={input} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="e.g. giftbot.0g" maxLength={32} />
        </div>
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Agent Name *</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AlphaTrader" maxLength={64} />
        </div>
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Metadata URI</label>
          <input className={input} value={metadataURI} onChange={(e) => setMetadataURI(e.target.value)} placeholder="ipfs://... or https://..." />
        </div>
        <div>
          <label className={`text-xs ${p.textMuted} mb-1 block`}>Compute Endpoint (0G Compute URL)</label>
          <input className={input} value={computeEndpoint} onChange={(e) => setComputeEndpoint(e.target.value)} placeholder="https://compute.0g.ai/v1/inference" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Model Type</label>
            <select className={input} value={modelType} onChange={(e) => setModelType(e.target.value)}>
              <option value="llama-3">Llama 3</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude">Claude</option>
              <option value="mistral">Mistral</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className={`text-xs ${p.textMuted} mb-1 block`}>Compute Provider</label>
            <select className={input} value={computeProvider} onChange={(e) => setComputeProvider(e.target.value)}>
              <option value="0g-compute">0G Compute</option>
              <option value="replicate">Replicate</option>
              <option value="self-hosted">Self-hosted</option>
              <option value="aws">AWS</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D084] text-white font-medium text-sm hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          Register Agent
        </button>
        <button onClick={onDone} className={`px-4 py-2.5 rounded-xl border ${p.cardBorder} text-sm font-medium ${p.textMuted} hover:${p.textSecondary}`}>
          Cancel
        </button>
      </div>
    </motion.div>
  )
}
