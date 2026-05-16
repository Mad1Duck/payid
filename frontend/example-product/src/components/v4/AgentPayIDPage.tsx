import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi'
import { keccak256, toBytes, zeroHash } from 'viem'
import { useV4Palette } from './theme'
import { addresses } from '@/constants/contracts/addresses'
import { agentPayIDAbi } from '@/constants/contracts/AgentPayID'
import { mockAgentRegistryAbi } from '@/constants/contracts/MockAgentRegistry'
import { combinedRuleStorageAbi } from '@/constants/contracts/CombinedRuleStorage'
import { ruleItemErc721Abi } from '@/constants/contracts/RuleItemERC721'

// ─── Constants ───────────────────────────────────────────────────────────────
const CHAIN_ID = 16601
const EXPLORER = 'https://chainscan-newton.0g.ai'
const AI_BASE = import.meta.env.VITE_0G_AI_BASE_URL ?? 'https://compute-network-6.integratenetwork.work/v1/proxy'
const AI_KEY  = import.meta.env.VITE_0G_AI_API_KEY ?? ''
const AI_MODEL = import.meta.env.VITE_0G_AI_MODEL ?? 'qwen/qwen-2.5-7b-instruct'

const PRESET_RULES = [
  {
    label: 'Spending Limit ≤ 500 USDC',
    hash: keccak256(toBytes('spending_limit_500')),
  },
  { label: 'KYC Required Level 1', hash: keccak256(toBytes('kyc_level_1')) },
  { label: 'No Restrictions', hash: keccak256(toBytes('no_restrictions')) },
]

const SYSTEM_PROMPT = `You are an AI payment agent integrated with PAY.ID — a programmable payment policy system on 0G Newton blockchain.

Your capabilities:
- Analyze payment requests from users
- Evaluate if the request complies with the agent's linked policy
- Respond with a decision: APPROVE or REJECT, with a reason
- Output structured JSON when making a decision

When a user asks you to make a payment, respond with:
{
  "decision": "APPROVE" | "REJECT",
  "reason": "brief explanation",
  "amount": number,
  "receiver": "address or name",
  "policy": "which policy applies"
}

Be concise, decisive, and always reference the PAY.ID policy context. You operate on 0G Newton Testnet.`

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
}
interface AiDecision {
  decision: 'APPROVE' | 'REJECT'
  reason: string
  amount?: number
  receiver?: string
}
interface OnChainRule {
  ruleId: bigint
  hash: string
  uri: string
  name?: string
  description?: string
  active: boolean
}
type OnChainPhase = 'idle' | 'register' | 'link' | 'done' | 'error'

function shortHash(h: string) {
  return h.slice(0, 10) + '…' + h.slice(-6)
}
function shortAddr(a: string) {
  return a.slice(0, 8) + '…' + a.slice(-6)
}
const tsNow = () =>
  new Date().toLocaleTimeString('id', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

// ─── Extract JSON decision from AI reply ─────────────────────────────────────
function parseDecision(text: string): AiDecision | null {
  try {
    const m = text.match(/\{[\s\S]*?"decision"[\s\S]*?\}/)
    if (!m) return null
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────
function Bubble({
  msg,
  p,
}: {
  msg: ChatMsg
  p: ReturnType<typeof useV4Palette>
}) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-[#8B5CF6]" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-[#8B5CF6] text-white rounded-br-sm'
            : `${p.dark ? 'bg-white/8' : 'bg-black/6'} ${p.textMain} rounded-bl-sm`
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

// ─── Log Line ─────────────────────────────────────────────────────────────────
interface LogLine {
  id: number
  ts: string
  level: 'info' | 'ok' | 'err'
  msg: string
}
function Console({ logs }: { logs: Array<LogLine> }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [logs])
  const cls = {
    info: 'text-slate-400',
    ok: 'text-[#00D084]',
    err: 'text-red-400',
  }
  return (
    <div
      ref={ref}
      className="h-36 overflow-y-auto font-mono text-xs space-y-0.5"
      style={{ scrollbarWidth: 'thin' }}
    >
      {!logs.length && (
        <p className="text-slate-500 italic text-center pt-4">
          On-chain logs appear here after AI approves…
        </p>
      )}
      {logs.map((l) => (
        <div key={l.id} className="flex gap-2">
          <span className="text-slate-600 shrink-0">{l.ts}</span>
          <span className={cls[l.level]}>{l.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentPayIDPage() {
  const p = useV4Palette()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  // Chat state
  const [messages, setMessages] = useState<Array<ChatMsg>>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI payment agent powered by **Qwen** via 0G TeeML. I'm linked to a PAY.ID policy on-chain.\n\nTry asking me: "Pay 100 USDC to 0xAbc..." or "Send 600 USDC to the merchant"`,
    },
  ])
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [decision, setDecision] = useState<AiDecision | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // On-chain state
  const [tokenId] = useState('42')
  const [ruleIdx, setRuleIdx] = useState(0)
  const [onChainPhase, setOnChainPhase] = useState<OnChainPhase>('idle')
  const [logs, setLogs] = useState<Array<LogLine>>([])
  const [txHashes, setTxHashes] = useState<Array<string>>([])
  const logId = useRef(0)

  const isWrongChain = isConnected && chainId !== CHAIN_ID
  const agentPayIDAddr = addresses[CHAIN_ID]?.AgentPayID
  const mockRegistryAddr = addresses[CHAIN_ID]?.MockAgentRegistry
  const combinedRuleStorageAddr = addresses[CHAIN_ID]?.CombinedRuleStorage
  const ruleItemAddr = addresses[CHAIN_ID]?.RuleItemERC721

  // ── Fetch active rule hash from CombinedRuleStorage ──────────────────────
  const { data: activeRuleHash } = useReadContract({
    address: combinedRuleStorageAddr,
    abi: combinedRuleStorageAbi,
    functionName: 'getActiveRuleOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  // ── Fetch nextRuleId to know how many individual rules exist ─────────────
  const { data: nextRuleId } = useReadContract({
    address: ruleItemAddr,
    abi: ruleItemErc721Abi,
    functionName: 'nextRuleId',
    chainId: CHAIN_ID,
  })

  // ── Fetch & cache on-chain rules metadata ─────────────────────────────────
  const [onChainRules, setOnChainRules] = useState<OnChainRule[]>([])
  const [rulesLoaded, setRulesLoaded] = useState(false)

  useEffect(() => {
    if (!nextRuleId || !publicClient || !ruleItemAddr) return
    const count = Number(nextRuleId)
    if (count === 0) { setRulesLoaded(true); return }

    ;(async () => {
      const ruleIds = Array.from({ length: count }, (_, i) => BigInt(i + 1))
      const results: OnChainRule[] = []

      await Promise.all(ruleIds.map(async (ruleId) => {
        try {
          const [hash, uri, , , , deprecated, active] = await publicClient.readContract({
            address: ruleItemAddr,
            abi: ruleItemErc721Abi,
            functionName: 'getRule',
            args: [ruleId],
          }) as [string, string, string, bigint, number, boolean, boolean]

          if (deprecated || !active) return

          // Try fetch metadata JSON from URI (0G Storage)
          let name: string | undefined
          let description: string | undefined
          if (uri) {
            try {
              const res = await fetch(uri)
              const json = await res.json()
              name = json.name
              description = json.description
            } catch { /* no metadata */ }
          }

          results.push({ ruleId, hash, uri, name, description, active })
        } catch { /* skip */ }
      }))

      setOnChainRules(results)
      setRulesLoaded(true)
    })()
  }, [nextRuleId, publicClient, ruleItemAddr])

  // ── Build dynamic system prompt with real rules ───────────────────────────
  const buildSystemPrompt = () => {
    const rulesSection = onChainRules.length > 0
      ? `\n\nACTIVE ON-CHAIN RULES (fetched from 0G Newton - CombinedRuleStorage):\n` +
        onChainRules.map((r, i) =>
          `${i + 1}. ${r.name ?? `Rule #${r.ruleId}`}: ${r.description ?? 'No description'} (hash: ${r.hash.slice(0, 10)}…)`
        ).join('\n') +
        `\n\nActive rule for current user: ${activeRuleHash && activeRuleHash !== zeroHash ? activeRuleHash.slice(0, 10) + '…' : 'None set'}\n\nEnforce these rules strictly when evaluating payment requests.`
      : '\n\nNo rules found on-chain yet. Ask user to create rules in the Policy page first.'

    return SYSTEM_PROMPT + rulesSection
  }

  const { data: currentRuleHash } = useReadContract({
    address: agentPayIDAddr,
    abi: agentPayIDAbi,
    functionName: 'agentRules',
    args: [BigInt(tokenId)],
    chainId: CHAIN_ID,
  })

  const addLog = (msg: string, level: LogLine['level'] = 'info') =>
    setLogs((prev) => [
      ...prev,
      { id: logId.current++, ts: tsNow(), level, msg },
    ])

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // ── Call 0G AI with real on-chain rules in system prompt ─────────────────
  const callAI = useCallback(
    async (userMsg: string) => {
      setAiLoading(true)
      const systemPrompt = buildSystemPrompt()
      const history: Array<ChatMsg> = [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
        { role: 'user', content: userMsg },
      ]
      try {
        const res = await fetch(`${AI_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AI_KEY}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: history.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: 0.3,
            max_tokens: 512,
          }),
        })
        if (!res.ok) throw new Error(`AI API error: ${res.status}`)
        const data = await res.json()
        const reply: string =
          data.choices?.[0]?.message?.content ?? 'No response from AI.'
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        const parsed = parseDecision(reply)
        if (parsed) setDecision(parsed)
        return reply
      } catch (e: unknown) {
        const msg = (e as Error).message || 'Failed to reach 0G AI'
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error: ${msg}` },
        ])
      } finally {
        setAiLoading(false)
      }
    },
    [messages],
  )

  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    await callAI(userMsg)
  }

  // ── Link on-chain: use actual active rule hash if available ───────────────
  const executeOnChain = async () => {
    if (!isConnected || !address || !publicClient) return
    setLogs([])
    setTxHashes([])
    logId.current = 0
    const tid = BigInt(tokenId)

    // Use selected on-chain rule if available, else preset
    const selectedHash = (onChainRules.length > 0 && onChainRules[ruleIdx])
      ? onChainRules[ruleIdx].hash
      : PRESET_RULES[ruleIdx].hash

    const ruleHashToLink = selectedHash as `0x${string}`
    
    const ruleLabel = (onChainRules.length > 0 && onChainRules[ruleIdx])
      ? (onChainRules[ruleIdx].name || `Rule #${onChainRules[ruleIdx].ruleId}`)
      : PRESET_RULES[ruleIdx].label

    try {
      setOnChainPhase('register')
      addLog(`[REGISTRY] setOwner(${tid}, ${shortAddr(address)})…`)
      const tx1 = await writeContractAsync({
        address: mockRegistryAddr,
        abi: mockAgentRegistryAbi,
        functionName: 'setOwner',
        args: [tid, address],
        chainId: CHAIN_ID,
      })
      setTxHashes((h) => [...h, tx1])
      await publicClient.waitForTransactionReceipt({ hash: tx1 })
      addLog(`[REGISTRY] ✅ Agent NFT #${tid} registered`, 'ok')

      setOnChainPhase('link')
      addLog(`[AGENT] linkAgentRule(${tid}, ${shortHash(ruleHashToLink)})…`)
      const tx2 = await writeContractAsync({
        address: agentPayIDAddr,
        abi: agentPayIDAbi,
        functionName: 'linkAgentRule',
        args: [tid, ruleHashToLink],
        chainId: CHAIN_ID,
      })
      setTxHashes((h) => [...h, tx2])
      await publicClient.waitForTransactionReceipt({ hash: tx2 })
      addLog(`[AGENT] ✅ Policy "${ruleLabel}" linked on-chain`, 'ok')
      addLog(`[VERIFY] ruleSetHash: ${shortHash(ruleHashToLink)}`, 'ok')
      setOnChainPhase('done')
    } catch (e: unknown) {
      setOnChainPhase('error')
      addLog(
        `[ERROR] ${(e as { shortMessage?: string }).shortMessage ?? (e as Error).message}`,
        'err',
      )
    }
  }

  const resetAll = () => {
    setDecision(null)
    setOnChainPhase('idle')
    setLogs([])
    setTxHashes([])
    setMessages([
      {
        role: 'assistant',
        content: `Session reset. I'm ready for a new payment request. Try: "Pay 200 USDC to merchant"`,
      },
    ])
  }

  const hasApiKey = !!AI_KEY && AI_KEY !== 'YOUR_0G_AI_API_KEY_HERE'

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: '#8B5CF620' }}
          >
            <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <h1 className={`text-2xl font-bold ${p.textMain}`}>
            AI Agent Payments
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D084]/10 text-[#00D084] font-medium">
            0G TeeML
          </span>
        </div>
        <p className={`text-sm ${p.textMuted} ml-10`}>
          Qwen via 0G AI decides payment approval → AgentPayID enforces policy
          on-chain
        </p>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-medium">
              0G AI API Key not configured
            </p>
            <p className="text-xs text-amber-400 mt-0.5">
              Set{' '}
              <code className="bg-amber-500/20 px-1 rounded">
                VITE_0G_AI_API_KEY
              </code>{' '}
              in your <code>.env</code> file. Get your key at{' '}
              <a
                href="https://pc.0g.ai"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                pc.0g.ai
              </a>
            </p>
          </div>
        </div>
      )}
      {!isConnected && (
        <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            Connect wallet for on-chain execution after AI approval.
          </p>
        </div>
      )}
      {isWrongChain && (
        <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Switch to <strong>0G Newton Testnet (16601)</strong>
          </p>
        </div>
      )}

      {/* Agent Info Bar */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}`,
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: '#8B5CF620' }}
        >
          <Bot className="w-5 h-5 text-[#8B5CF6]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${p.textMain}`}>
            Qwen-2.5-7B-Instruct
          </div>
          <div className={`text-xs ${p.textMuted}`}>
            by 0G Foundation · TeeML · Agent NFT #{tokenId}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[10px] font-mono ${p.textMuted}`}>
            On-chain policy
          </div>
          <div className="text-xs text-[#00D084] font-mono">
            {currentRuleHash && currentRuleHash !== zeroHash
              ? shortHash(currentRuleHash as string)
              : 'Not linked'}
          </div>
        </div>
      </div>

      {/* Policy Selector */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}`,
        }}
      >
        <p className={`text-xs font-semibold ${p.textMuted} mb-2`}>
          POLICY TO ENFORCE (linked on-chain after approval)
        </p>
        <div className="flex gap-2 flex-wrap">
          {(!rulesLoaded && nextRuleId) && (
            <div className="text-xs text-[#0EA5E9] flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading on-chain rules...
            </div>
          )}
          
          {rulesLoaded && onChainRules.length > 0 ? (
            onChainRules.map((r, i) => (
              <button
                key={`onchain-${i}`}
                onClick={() => setRuleIdx(i)}
                disabled={onChainPhase !== 'idle'}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  ruleIdx === i
                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/40'
                    : `${p.dark ? 'bg-white/6 text-slate-400 hover:bg-white/10' : 'bg-black/6 text-slate-500 hover:bg-black/10'}`
                }`}
              >
                {r.name || `Rule #${r.ruleId}`}
              </button>
            ))
          ) : rulesLoaded ? (
            PRESET_RULES.map((r, i) => (
              <button
                key={`preset-${i}`}
                onClick={() => setRuleIdx(i)}
                disabled={onChainPhase !== 'idle'}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  ruleIdx === i
                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/40'
                    : `${p.dark ? 'bg-white/6 text-slate-400 hover:bg-white/10' : 'bg-black/6 text-slate-500 hover:bg-black/10'}`
                }`}
              >
                {r.label}
              </button>
            ))
          ) : null}
        </div>
      </div>

      {/* Chat Interface */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}`,
        }}
      >
        {/* Chat header */}
        <div
          className={`px-4 py-3 flex items-center gap-2 border-b ${p.dark ? 'border-white/8' : 'border-black/8'}`}
        >
          <Brain className="w-4 h-4 text-[#8B5CF6]" />
          <span className={`text-sm font-semibold ${p.textMain}`}>
            Chat with Qwen Agent
          </span>
          <span className={`text-[10px] ml-auto font-mono ${p.textMuted}`}>
            {AI_MODEL}
          </span>
          {aiLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
          )}
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          className="h-72 overflow-y-auto p-4 space-y-3"
          style={{ scrollbarWidth: 'thin' }}
        >
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} p={p} />
          ))}
          {aiLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-[#8B5CF6]" />
              </div>
              <div
                className={`px-3 py-2 rounded-2xl rounded-bl-sm ${p.dark ? 'bg-white/8' : 'bg-black/6'} flex items-center gap-1.5`}
              >
                {[0, 0.15, 0.3].map((d, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, delay: d, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className={`px-4 pb-4 flex gap-2 border-t ${p.dark ? 'border-white/8' : 'border-black/8'} pt-3`}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={aiLoading || !hasApiKey}
            placeholder={
              hasApiKey
                ? 'Ask the agent to make a payment… (e.g. "Pay 100 USDC to 0xAbc")'
                : 'Set VITE_0G_AI_API_KEY in .env first'
            }
            className={`flex-1 px-3 py-2 rounded-xl text-sm border ${
              p.dark
                ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600'
                : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'
            } focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40 disabled:opacity-50`}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={aiLoading || !input.trim() || !hasApiKey}
            className="w-9 h-9 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Decision Card */}
      <AnimatePresence>
        {decision && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl p-5 ${decision.decision === 'APPROVE' ? 'bg-[#00D084]/10 border border-[#00D084]/25' : 'bg-red-500/10 border border-red-500/25'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              {decision.decision === 'APPROVE' ? (
                <CheckCircle2 className="w-6 h-6 text-[#00D084]" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <div
                  className={`font-bold text-sm ${decision.decision === 'APPROVE' ? 'text-[#00D084]' : 'text-red-400'}`}
                >
                  AI Decision: {decision.decision}
                </div>
                <div className={`text-xs ${p.textMuted} mt-0.5`}>
                  {decision.reason}
                </div>
              </div>
            </div>

            {decision.decision === 'APPROVE' && onChainPhase === 'idle' && (
              <div className="space-y-2">
                <p className={`text-xs ${p.textMuted}`}>
                  AI approved. Execute on-chain to link policy to Agent NFT #
                  {tokenId}:
                </p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={executeOnChain}
                  disabled={!isConnected || isWrongChain}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #00D084, #0EA5E9)',
                  }}
                >
                  <Link2 className="w-4 h-4" /> Execute On-Chain
                </motion.button>
              </div>
            )}

            {onChainPhase !== 'idle' &&
              onChainPhase !== 'done' &&
              onChainPhase !== 'error' && (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00D084]" />
                  <span className={`text-sm ${p.textMuted}`}>
                    {onChainPhase === 'register'
                      ? 'Registering agent NFT…'
                      : 'Linking policy on-chain…'}
                  </span>
                </div>
              )}

            {onChainPhase === 'done' && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[#00D084] text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Policy linked on-chain ✅
                </div>
                <div className="flex gap-3 flex-wrap">
                  {txHashes.map((h, i) => (
                    <a
                      key={h}
                      href={`${EXPLORER}/tx/${h}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-[#0EA5E9] hover:underline flex items-center gap-1"
                    >
                      Tx {i + 1}: {shortHash(h)}{' '}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* On-chain Log Console */}
      {(logs.length > 0 || onChainPhase !== 'idle') && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: p.dark ? '#080D08' : '#F8FAFC',
            border: `1px solid ${p.dark ? '#ffffff08' : '#00000008'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {['bg-red-400', 'bg-amber-400', 'bg-green-400'].map((c) => (
                <div key={c} className={`w-2 h-2 rounded-full ${c}`} />
              ))}
            </div>
            <span className={`text-[10px] font-mono ${p.textMuted}`}>
              on-chain-execution
            </span>
            {onChainPhase !== 'idle' &&
              onChainPhase !== 'done' &&
              onChainPhase !== 'error' && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-[#00D084]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse" />{' '}
                  LIVE
                </span>
              )}
          </div>
          <Console logs={logs} />
        </div>
      )}

      {/* Reset / Info footer */}
      <div className="flex items-center justify-between">
        <div className={`text-[10px] font-mono ${p.textMuted}`}>
          AgentPayID:{' '}
          <a
            href={`${EXPLORER}/address/${agentPayIDAddr}`}
            target="_blank"
            rel="noreferrer"
            className="text-[#0EA5E9] hover:underline"
          >
            {agentPayIDAddr?.slice(0, 10)}…
          </a>
          {' · '}
          <ShieldCheck className="inline w-3 h-3" /> 0G Newton 16601
        </div>
        {(decision || onChainPhase !== 'idle') && (
          <button
            onClick={resetAll}
            className={`text-xs flex items-center gap-1 ${p.textMuted} hover:text-[#8B5CF6] transition-colors`}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>
    </div>
  )
}
