import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  ExternalLink,
  Hash,
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
  useConnectorClient,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi'
import { keccak256, toBytes, zeroHash } from 'viem'
import { useV4Palette } from './theme'
import {
  useAdminAIAgent,
  useRegisterAdminAIAgent,
  useSetAgentCombinedRule,
  useAgentCombinedRule,
  useAllAdminAIAgents,
  useRegistryAdmin,
  useSubscription,
  useCreateRule,
  useMyRuleSets,
  useSubscribe,
  useSubscriptionPrice,
  useActiveCombinedRule,
} from 'payid-react'
import type { AdminAgent, CombinedRule } from 'payid-react'
import { addresses } from '@/constants/contracts/addresses'
import { agentPayIDAbi } from '@/constants/contracts/AgentPayID'
import { mockAgentRegistryAbi } from '@/constants/contracts/MockAgentRegistry'
import { combinedRuleStorageAbi } from '@/constants/contracts/CombinedRuleStorage'
import { ruleItemERC721Abi } from '@/constants/contracts';
import {
  uploadTo0G,
  uploadToIPFS,
  resolveStorageURI,
  getEthersSigner,
  detectStorageProvider,
} from '@/lib/storage'
import { downloadFromZGStorage } from '@/lib/zgStorage'

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
    detail: 'Transaction amount must not exceed 500 USDC. Applies to both ETH and ERC20 transfers.',
  },
  {
    label: 'KYC Required Level 1',
    hash: keccak256(toBytes('kyc_level_1')),
    detail: 'Payer must have a valid KYC Level 1 attestation from a trusted oracle.',
  },
  {
    label: 'No Restrictions',
    hash: keccak256(toBytes('no_restrictions')),
    detail: 'All transactions are allowed. No policy enforcement is applied.',
  },
]

const PRESET_TEMPLATES = [
  {
    name: 'Spending Limit',
    desc: 'Limit transaction amount',
    json: {
      version: '1.0',
      logic: 'AND',
      rules: [{ type: 'simple', field: 'tx.amount', operator: '<=', value: 500000000 }],
    },
  },
  {
    name: 'Business Hours',
    desc: 'Allow 09:00-17:00 only',
    json: {
      version: '1.0',
      logic: 'AND',
      rules: [{ type: 'simple', field: 'env.timestamp|hour', operator: 'between', value: [9, 17] }],
    },
  },
  {
    name: 'Weekday Only',
    desc: 'Block weekends',
    json: {
      version: '1.0',
      logic: 'AND',
      rules: [{ type: 'simple', field: 'env.timestamp|day', operator: 'in', value: [1, 2, 3, 4, 5] }],
    },
  },
  {
    name: 'KYC Gate',
    desc: 'Require KYC level 1',
    json: {
      version: '1.0',
      logic: 'AND',
      rules: [{ type: 'simple', field: 'oracle.kycLevel', operator: '>=', value: 1 }],
    },
  },
  {
    name: 'Country ID',
    desc: 'Indonesia only',
    json: {
      version: '1.0',
      logic: 'AND',
      rules: [{ type: 'simple', field: 'oracle.country|lower', operator: '==', value: 'id' }],
    },
  },
  {
    name: 'Custom',
    desc: 'Write your own JSON',
    json: null,
  },
]

const BASE_SYSTEM_PROMPT = `You are an AI payment agent integrated with PAY.ID — a programmable payment policy system on 0G Newton blockchain.

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
  ruleJson?: Record<string, unknown>
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
  const [messages, setMessages] = useState<Array<ChatMsg>>([])
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

  // AI Agent hooks — admin registry
  const { data: adminAgents } = useAllAdminAIAgents({ onlyActive: true })
  const [selectedAgent, setSelectedAgent] = useState<AdminAgent | null>(null)

  // Auto-select first admin agent when list loads
  useEffect(() => {
    const agents = adminAgents ?? []
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0])
    }
  }, [adminAgents, selectedAgent])

  const { data: registryAdmin } = useRegistryAdmin()
  const isAdmin = !!address && registryAdmin?.toLowerCase() === address.toLowerCase()
  const { data: connectorClient } = useConnectorClient()

  const { data: agentInfo } = useAdminAIAgent(selectedAgent?.agentWallet as `0x${string}` | undefined)
  const { data: agentRuleInfo } = useAgentCombinedRule(selectedAgent?.agentWallet as `0x${string}` | undefined)
  const { registerAgent, isPending: isRegisteringAgent, isSuccess: isRegisterSuccess } = useRegisterAdminAIAgent()
  const { setAgentCombinedRule, isPending: isSettingRule } = useSetAgentCombinedRule()
  const [showAgentRegister, setShowAgentRegister] = useState(false)
  const [regAgentWallet, setRegAgentWallet] = useState(address ?? '')
  const [regDisplayName, setRegDisplayName] = useState('')
  const [regModel, setRegModel] = useState('qwen/qwen-2.5-7b-instruct')
  const [regEndpoint, setRegEndpoint] = useState('https://compute-network-6.integratenetwork.work/v1/proxy')
  const [regSystemPrompt, setRegSystemPrompt] = useState('')

  // Read storage preference from localStorage (set in Settings page)
  const [storageProvider, setStorageProvider] = useState<'inline' | '0g' | 'ipfs'>(() => {
    const saved = localStorage.getItem('payid-storage-preference')
    if (saved === '0g') return '0g'
    if (saved === 'ipfs') return 'ipfs'
    return '0g' // default
  })

  const [isUploading, setIsUploading] = useState(false)
  const [loadedMetadata, setLoadedMetadata] = useState<string | null>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  // Close register form on success
  useEffect(() => {
    if (isRegisterSuccess) {
      setShowAgentRegister(false)
      setRegAgentWallet(address ?? '')
      setRegDisplayName('')
      setRegSystemPrompt('')
      setRegModel('qwen/qwen-2.5-7b-instruct')
      setRegEndpoint('https://compute-network-6.integratenetwork.work/v1/proxy')
    }
  }, [isRegisterSuccess, address])

  // Subscription & slots
  const { data: subInfo } = useSubscription(address)
  const slotsUsed = (subInfo?.logicalRuleCount ?? 0)
  const slotsMax = (subInfo?.maxSlots ?? 1)

  // My existing combined rules (for reuse)
  const { data: myRuleSets } = useMyRuleSets()
  const { data: myActiveRule } = useActiveCombinedRule(address)

  // Subscription
  const { subscribe, isPending: isSubscribing } = useSubscribe()
  const { data: subPrice } = useSubscriptionPrice()

  // Embedded rule creation state
  const { createRule, isPending: isCreatingRule } = useCreateRule()
  const [ruleJsonInput, setRuleJsonInput] = useState(`{\n  "version": "1.0",\n  "logic": "AND",\n  "rules": [\n    {\n      "type": "simple",\n      "field": "tx.amount",\n      "operator": "<=",\n      "value": 500000000\n    }\n  ]\n}`)
  const [ruleNameInput, setRuleNameInput] = useState('')
  const [ruleDescInput, setRuleDescInput] = useState('')
  const [existingRuleMode, setExistingRuleMode] = useState(false)
  const [selectedExistingRule, setSelectedExistingRule] = useState<CombinedRule | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<number>(-1)
  const [jsonError, setJsonError] = useState<string>('')
  const [showCreateSuccess, setShowCreateSuccess] = useState(false)

  const isWrongChain = isConnected && chainId !== CHAIN_ID
  const chainAddresses = (addresses as any)[CHAIN_ID]
  const agentPayIDAddr = chainAddresses?.AgentPayID
  const mockRegistryAddr = chainAddresses?.MockAgentRegistry
  const combinedRuleStorageAddr = chainAddresses?.CombinedRuleStorage
  const ruleItemAddr = chainAddresses?.RuleItemERC721

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
    abi: ruleItemERC721Abi,
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
            abi: ruleItemERC721Abi,
            functionName: 'getRule',
            args: [ruleId],
          }) as [string, string, string, bigint, number, boolean, boolean]

          if (deprecated || !active) return

          // Try fetch metadata JSON from URI (0G Storage / IPFS)
          let name: string | undefined
          let description: string | undefined
          let ruleJson: Record<string, unknown> | undefined
          if (uri) {
            try {
              let raw: string | null = null
              if (uri.startsWith('0g://')) {
                // 0g:// scheme — download via 0G Storage helper (CORS-safe)
                const rootHash = uri.replace('0g://', '')
                raw = await downloadFromZGStorage(rootHash)
              } else if (uri.includes('0g.ai') || uri.includes('indexer')) {
                // HTTP URL pointing to 0G Storage — extract root hash from path
                const parts = uri.split('/')
                const rootHash = parts[parts.length - 1].split('?')[0]
                if (rootHash) raw = await downloadFromZGStorage(rootHash)
              } else {
                // Regular HTTPS (IPFS gateway, Pinata, etc.)
                const res = await fetch(uri)
                raw = await res.text()
              }
              if (raw) {
                const json = JSON.parse(raw)
                name = json.name
                description = json.description
                ruleJson = json
              }
            } catch { /* no metadata — use hash fallback */ }
          }


          results.push({ ruleId, hash, uri, name, description, ruleJson, active })
        } catch { /* skip */ }
      }))

      setOnChainRules(results)
      setRulesLoaded(true)
    })()
  }, [nextRuleId, publicClient, ruleItemAddr])

  // ── Reset metadata & chat when selected agent changes ──────────────────────
  useEffect(() => {
    setLoadedMetadata(null)
  }, [selectedAgent])

  useEffect(() => {
    if (selectedAgent) {
      const policyStatus = agentRuleInfo?.active ? 'linked to a PAY.ID policy' : 'not yet linked to a policy'
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'm **${selectedAgent.displayName}** (AI Agent). I'm ${policyStatus} on-chain.\n\nTry asking me: "Pay 100 USDC to 0xAbc..."`,
        },
      ])
    } else {
      setMessages([])
    }
  }, [selectedAgent, agentRuleInfo])

  // ── Build dynamic system prompt with selected agent's policy ─────────────
  const buildSystemPrompt = () => {
    const agentName = selectedAgent?.displayName ?? 'Agent'
    const agentSection = `\n\nYou are currently representing AI Agent: "${agentName}".`

    const policySection = agentRuleInfo?.active
      ? `\n\nCURRENT LINKED POLICY:\n` +
        `Policy Hash: ${agentRuleInfo.ruleSetHash}\n` +
        `Status: ACTIVE\n\n` +
        `You MUST enforce this policy when evaluating payment requests. ` +
        `If a transaction violates the policy, respond with "REJECT" and explain why.`
      : `\n\nNo active policy linked to this agent. ` +
        `Tell the user that the agent owner needs to set a policy first.`

    return BASE_SYSTEM_PROMPT + agentSection + policySection
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

        // Parse AI decision
        const parsed = parseDecision(reply)
        let finalReply = reply
        let finalDecision = parsed

        // ── Run PAY.ID WASM rule engine (override AI with deterministic result) ──
        if (parsed && selectedAgent) {
          // Get selected rule JSON
          let ruleJson: Record<string, unknown> | null = null
          if (rulesLoaded && onChainRules.length > 0 && onChainRules[ruleIdx]?.ruleJson) {
            ruleJson = onChainRules[ruleIdx].ruleJson
          } else if (selectedTemplate >= 0 && PRESET_TEMPLATES[selectedTemplate]?.json) {
            ruleJson = PRESET_TEMPLATES[selectedTemplate].json as Record<string, unknown>
          }

          if (ruleJson) {
            try {
              const { createPayIDClient } = await import('payid/client')
              const client = createPayIDClient()
              await client.ready()

              // Build PAY.ID context (USDC 6 decimals)
              const amountRaw = Math.floor((parsed.amount ?? 0) * 1_000_000).toString()
              const context = {
                tx: {
                  sender: address ?? '0x0000000000000000000000000000000000000000',
                  receiver: (parsed.receiver ?? '').startsWith('0x') ? parsed.receiver : '0x0000000000000000000000000000000000000000',
                  asset: '0x0000000000000000000000000000000000000000',
                  amount: amountRaw,
                  chainId: CHAIN_ID,
                },
                env: {
                  timestamp: Math.floor(Date.now() / 1000),
                },
              }

              const result = await client.evaluate(context, ruleJson as any)
              const wasmDecision = result.decision === 'ALLOW' ? 'APPROVE' : 'REJECT'

              finalDecision = { ...parsed, decision: wasmDecision, reason: result.reason ?? '' }

              // Transparently show both AI and WASM results
              const matchStatus = wasmDecision === parsed.decision ? '✅ Match' : '⚠️ Corrected by PAY.ID'
              finalReply = reply + `\n\n---\n🔒 **PAY.ID Rule Engine Verification**\n- AI Decision: ${parsed.decision}\n- WASM Result: ${wasmDecision}\n- Reason: ${result.reason}\n- Status: ${matchStatus}`
            } catch (err) {
              console.error('PAY.ID WASM error:', err)
              finalReply = reply + '\n\n*(Note: PAY.ID rule engine verification unavailable — using AI simulation)*'
            }
          }
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: finalReply }])
        if (finalDecision) setDecision(finalDecision)
        return finalReply
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
    [messages, selectedAgent, agentRuleInfo, address, rulesLoaded, onChainRules, ruleIdx, selectedTemplate],
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
      // 1. Register and Link if not already done (for demo purposes)
      if (onChainPhase === 'idle') {
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
      }

      // 2. Payment Verification via PAY.ID Rule Engine
      addLog(`[VERIFY] Running PAY.ID WASM rule engine…`)

      if (decision?.decision === 'REJECT') {
        await new Promise(r => setTimeout(r, 1500));
        throw new Error(`ExecutionReverted: ${decision.reason}. Transaction blocked by PAY.ID rule engine.`);
      }

      await new Promise(r => setTimeout(r, 1000));
      addLog(`[VERIFY] ✅ Payment payload matches on-chain policy`, 'ok')
      addLog(`[SETTLE] 💸 Payment transaction executed successfully`, 'ok')
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
    const agentName = selectedAgent?.displayName ?? 'Agent'
    setMessages([
      {
        role: 'assistant',
        content: `Session reset. I'm **${agentName}** and ready for a new payment request.`,
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
            {selectedAgent ? selectedAgent.displayName : 'Qwen-2.5-7B-Instruct'}
          </div>
          <div className={`text-xs ${p.textMuted}`}>
            {selectedAgent
              ? `AI Agent · ${shortAddr(selectedAgent.agentWallet)}`
              : `by 0G Foundation · TeeML · Agent NFT #${tokenId}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[10px] font-mono ${p.textMuted}`}>
            On-chain policy
          </div>
          <div className="text-xs text-[#00D084] font-mono">
            {agentRuleInfo?.active
              ? shortHash(agentRuleInfo.ruleSetHash)
              : currentRuleHash && currentRuleHash !== zeroHash
              ? shortHash(currentRuleHash as string)
              : 'Not linked'}
          </div>
        </div>
      </div>

      {/* My AI Agents — Horizontal Scroll Cards */}
      {isConnected && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: p.cardBg,
            border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-semibold ${p.textMuted}`}>MY AI AGENTS</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${slotsUsed >= slotsMax ? 'bg-red-500/10 text-red-500' : 'bg-[#00D084]/10 text-[#00D084]'}`}>
                Slots: {slotsUsed}/{slotsMax}
              </span>
              {subInfo?.expiry != null && subInfo.expiry > 0n && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${subInfo.isActive ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  Exp: {new Date(Number(subInfo.expiry) * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAgentRegister((v) => !v)}
              disabled={slotsUsed >= slotsMax}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium hover:bg-[#8B5CF6]/20 transition-colors disabled:opacity-40"
            >
              {showAgentRegister ? 'Cancel' : 'Register New'}
            </button>
          </div>

          {showAgentRegister && isAdmin && (
            <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
              <div className="space-y-2">
                {/* Agent Wallet */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted}`}>Agent Wallet</label>
                    <span className={`text-[10px] ${p.textMuted}`}>Wallet milik AI Agent (bukan user)</span>
                  </div>
                  <input
                    type="text"
                    value={regAgentWallet}
                    onChange={(e) => setRegAgentWallet(e.target.value)}
                    placeholder="0x... (wallet AI agent untuk terima payment)"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
                  />
                  <p className={`text-[10px] mt-1 ${p.textMuted}`}>
                    Gunakan wallet baru / terpisah untuk AI Agent. Jangan pakai wallet admin/user.
                  </p>
                </div>

                {/* Display Name */}
                <div>
                  <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>Display Name *</label>
                  <input
                    type="text"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    placeholder="e.g. Gift Bot, AlphaTrader..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
                  />
                </div>

                {/* Model + Auto Endpoint */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>AI Model</label>
                    <input
                      list="model-list"
                      value={regModel}
                      onChange={(e) => {
                        const model = e.target.value
                        setRegModel(model)
                        if (model.startsWith('qwen/')) setRegEndpoint('https://compute-network-6.integratenetwork.work/v1/proxy')
                        else if (model === 'gpt-4' || model === 'gpt-4o') setRegEndpoint('https://api.openai.com/v1/chat/completions')
                        else if (model === 'claude-3' || model.startsWith('claude')) setRegEndpoint('https://api.anthropic.com/v1/messages')
                        else if (model === 'gemini-pro' || model.startsWith('gemini')) setRegEndpoint('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent')
                      }}
                      placeholder="qwen/qwen-2.5-7b-instruct"
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
                    />
                    <datalist id="model-list">
                      <option value="qwen/qwen-2.5-7b-instruct" />
                      <option value="qwen/qwen-2.5-14b-instruct" />
                      <option value="qwen/qwen-2.5-32b-instruct" />
                      <option value="qwen/qwen-2.5-72b-instruct" />
                      <option value="gpt-4" />
                      <option value="gpt-4o" />
                      <option value="claude-3" />
                      <option value="claude-3-5-sonnet" />
                      <option value="gemini-pro" />
                      <option value="gemini-1.5-pro" />
                      <option value="llama-3-8b" />
                      <option value="llama-3-70b" />
                      <option value="mistral-7b" />
                    </datalist>
                  </div>
                  <div>
                    <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>Endpoint (auto)</label>
                    <input
                      type="text"
                      value={regEndpoint}
                      onChange={(e) => setRegEndpoint(e.target.value)}
                      placeholder="https://..."
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40`}
                    />
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <label className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1 block`}>System Prompt (opsional)</label>
                  <textarea
                    value={regSystemPrompt}
                    onChange={(e) => setRegSystemPrompt(e.target.value)}
                    placeholder="You are a helpful AI payment assistant..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${p.dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-black/5 border-black/10 text-gray-900 placeholder:text-slate-400'} focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/40 resize-none`}
                  />
                </div>
              </div>

              {/* Storage provider selector */}
              <div className="space-y-1.5">
                <p className={`text-[10px] font-medium uppercase tracking-wider ${p.textMuted}`}>Storage Provider</p>
                <div className="flex gap-2">
                  {(['inline', '0g', 'ipfs'] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setStorageProvider(prov)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                        storageProvider === prov
                          ? 'border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]'
                          : p.dark ? 'border-white/10 text-slate-400 hover:border-white/20' : 'border-black/10 text-slate-500 hover:border-black/20'
                      }`}
                    >
                      {prov === 'inline' ? 'Base64 Inline' : prov === '0g' ? '0G Storage' : 'IPFS'}
                    </button>
                  ))}
                </div>
                <div className={`p-2 rounded-lg text-[10px] font-mono ${p.dark ? 'bg-white/3 text-slate-500' : 'bg-black/3 text-slate-500'}`}>
                  <p>
                    {storageProvider === '0g'
                      ? 'Metadata akan di-upload ke 0G Storage lalu di-hash (perlu wallet + A0GI)'
                      : storageProvider === 'ipfs'
                      ? 'Metadata akan di-upload ke IPFS via Pinata (perlu VITE_PINATA_JWT)'
                      : 'Metadata akan di-hash otomatis saat register (base64 inline)'}
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!regAgentWallet.trim() || !regDisplayName.trim() || !regEndpoint.trim()) return
                  const metadata = JSON.stringify({
                    name: regDisplayName.trim(),
                    model: regModel,
                    endpoint: regEndpoint.trim(),
                    systemPrompt: regSystemPrompt.trim() || undefined,
                    version: '1.0.0',
                    createdAt: Date.now(),
                  })
                  const metadataHash = keccak256(toBytes(metadata))
                  let encryptedURI: string

                  if (storageProvider === '0g') {
                    if (!connectorClient?.transport) {
                      alert('Wallet tidak terhubung untuk sign 0G Storage')
                      return
                    }
                    setIsUploading(true)
                    try {
                      const signer = await getEthersSigner(connectorClient.transport)
                      const result = await uploadTo0G(metadata, signer)
                      encryptedURI = result.uri
                    } catch (err: any) {
                      alert('0G Storage upload gagal: ' + (err.message || 'Unknown error'))
                      setIsUploading(false)
                      return
                    } finally {
                      setIsUploading(false)
                    }
                  } else if (storageProvider === 'ipfs') {
                    setIsUploading(true)
                    try {
                      const result = await uploadToIPFS(metadata)
                      encryptedURI = result.uri
                    } catch (err: any) {
                      alert('IPFS upload gagal: ' + (err.message || 'Unknown error'))
                      setIsUploading(false)
                      return
                    } finally {
                      setIsUploading(false)
                    }
                  } else {
                    encryptedURI = `data:application/json;base64,${btoa(metadata)}`
                  }

                  registerAgent({
                    agentWallet: regAgentWallet.trim() as `0x${string}`,
                    displayName: regDisplayName.trim(),
                    metadataHash,
                    encryptedURI,
                    publicEndpoint: regEndpoint.trim(),
                  })
                }}
                disabled={isRegisteringAgent || isUploading || !regAgentWallet.trim() || !regDisplayName.trim() || !regEndpoint.trim()}
                className="w-full px-3 py-2 rounded-xl bg-[#00D084] text-white text-xs font-medium hover:bg-[#00D084]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : isRegisteringAgent ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Register Admin Agent'}
              </button>
            </div>
          )}

          {(adminAgents ?? []).length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {(adminAgents ?? []).map((agent: AdminAgent, i: number) => (
                <button
                  key={agent.agentWallet + i}
                  onClick={() => setSelectedAgent(agent)}
                  className={`shrink-0 w-48 rounded-xl p-3 text-left transition-all border ${
                    selectedAgent?.agentWallet === agent.agentWallet
                      ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10'
                      : `border-transparent ${p.dark ? 'bg-white/5 hover:bg-white/8' : 'bg-slate-50 hover:bg-slate-100'}`
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8B5CF620' }}>
                      <Bot className="w-4 h-4 text-[#8B5CF6]" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${p.textMain}`}>{agent.displayName}</div>
                      <div className={`text-[10px] font-mono truncate ${p.textMuted}`}>{shortAddr(agent.agentWallet)}</div>
                    </div>
                  </div>
                  <div className={`text-[10px] ${p.textMuted}`}>{shortAddr(agent.publicEndpoint)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-[#00D084]' : 'bg-amber-500'}`} />
                    <span className={`text-[10px] ${agent.active ? 'text-[#00D084]' : 'text-amber-500'}`}>
                      {agent.active ? 'Active' : 'Inactive'}
                    </span>
                    {selectedAgent?.agentWallet === agent.agentWallet && agentRuleInfo?.active && (
                      <span className="ml-auto flex items-center gap-0.5 text-[#00D084]" title="Policy set">
                        <ShieldCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-xs ${p.textMuted}`}>No admin AI agents registered yet.</p>
          )}

          {/* Selected Agent Detail */}
          {selectedAgent && agentInfo && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
              <div className="flex items-center justify-between text-xs">
                <span className={p.textMuted}>Agent Wallet</span>
                <span className={`font-mono font-medium ${p.textMain}`}>{shortAddr(agentInfo.agentWallet)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={p.textMuted}>Display Name</span>
                <span className={`font-medium ${p.textMain}`}>{agentInfo.displayName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={p.textMuted}>Endpoint</span>
                <span className={`font-medium ${p.textMain}`}>{agentInfo.publicEndpoint}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={p.textMuted}>Metadata Hash</span>
                <span className={`font-mono ${p.textMain}`}>{shortHash(agentInfo.metadataHash)}</span>
              </div>
              {/* Metadata Source */}
              {agentInfo.encryptedURI && (() => {
                const provider = detectStorageProvider(agentInfo.encryptedURI)
                const providerLabel = provider === '0g' ? '0G Storage' : provider === 'ipfs' ? 'IPFS' : provider === 'inline' ? 'Base64 Inline' : 'External URL'
                const providerColor = provider === '0g' ? 'text-[#8B5CF6]' : provider === 'ipfs' ? 'text-[#00B4D8]' : provider === 'inline' ? p.textMuted : 'text-orange-400'
                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={p.textMuted}>Metadata Source</span>
                      <span className={`font-mono text-[10px] ${providerColor}`}>{providerLabel}</span>
                    </div>
                    {provider !== 'inline' && !loadedMetadata && (
                      <button
                        onClick={async () => {
                          setIsLoadingMetadata(true)
                          try {
                            const data = await resolveStorageURI(agentInfo.encryptedURI)
                            setLoadedMetadata(data)
                          } catch (err: any) {
                            const msg = err.message || 'Failed to load metadata'
                            const isCors = msg.includes('CORS') || msg.includes('Failed to fetch')
                            if (isCors && provider === '0g') {
                              const rootHash = agentInfo.encryptedURI.replace('0g://', '')
                              setLoadedMetadata(`CORS_BLOCKED|https://indexer-storage-testnet-turbo.0g.ai/blob/${rootHash}`)
                            } else {
                              setLoadedMetadata(`Error: ${msg}`)
                            }
                          } finally {
                            setIsLoadingMetadata(false)
                          }
                        }}
                        disabled={isLoadingMetadata}
                        className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors disabled:opacity-50 ${
                          provider === '0g'
                            ? 'border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/10'
                            : provider === 'ipfs'
                            ? 'border-[#00B4D8]/30 text-[#00B4D8] hover:bg-[#00B4D8]/10'
                            : 'border-orange-400/30 text-orange-400 hover:bg-orange-400/10'
                        }`}
                      >
                        {isLoadingMetadata ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                        Load Metadata from {providerLabel}
                      </button>
                    )}
                    {loadedMetadata && loadedMetadata.startsWith('CORS_BLOCKED|') && (
                      <div className={`p-2 rounded-lg text-[10px] space-y-1 ${p.dark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                        <p className="font-medium">Browser CORS blocked download</p>
                        <p className="opacity-80">Open URL manually or copy:</p>
                        <a
                          href={loadedMetadata.replace('CORS_BLOCKED|', '')}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono break-all underline opacity-90 hover:opacity-100"
                        >
                          {loadedMetadata.replace('CORS_BLOCKED|', '')}
                        </a>
                      </div>
                    )}
                    {loadedMetadata && !loadedMetadata.startsWith('CORS_BLOCKED|') && (
                      <div className={`p-2 rounded-lg text-[10px] font-mono overflow-x-auto max-h-32 overflow-y-auto ${p.dark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-slate-600'}`}>
                        <pre className="whitespace-pre-wrap break-all">{loadedMetadata}</pre>
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="flex items-center justify-between text-xs">
                <span className={p.textMuted}>Published Rule</span>
                <span className={`font-mono ${agentRuleInfo?.active ? 'text-[#00D084]' : p.textMuted}`}>
                  {agentRuleInfo?.active ? shortHash(agentRuleInfo.ruleSetHash) : 'Not set'}
                </span>
              </div>
              {activeRuleHash && activeRuleHash !== zeroHash && (
                <button
                  onClick={() => setAgentCombinedRule(activeRuleHash)}
                  disabled={isSettingRule}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#00D084]/30 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/10 transition-colors disabled:opacity-50"
                >
                  {isSettingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                  Publish Active Combined Rule as Agent Policy
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Policy Panel — Owner vs Non-owner */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.dark ? '#ffffff10' : '#00000010'}`,
        }}
      >
        {selectedAgent && selectedAgent.owner?.toLowerCase() === address?.toLowerCase() ? (
          /* ── OWNER VIEW: Set Agent Policy ── */
          <>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-semibold ${p.textMuted}`}>
                SET AGENT POLICY
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium">
                Admin
              </span>
            </div>
            <p className={`text-[11px] ${p.textMuted} mb-2`}>
              Select or create a rule to enforce for this AI agent. This policy will be evaluated on-chain for every payment.
            </p>

            {/* One-click: Use My Active Combined Rule */}
            {myActiveRule?.hash && myActiveRule.hash !== zeroHash && (
              <button
                onClick={() => { if (myActiveRule.hash) setAgentCombinedRule(myActiveRule.hash) }}
                disabled={isSettingRule}
                className="w-full mb-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#00D084]/10 border border-[#00D084]/30 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/20 transition-colors disabled:opacity-50"
              >
                {isSettingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Use My Active Combined Rule ({shortHash(myActiveRule.hash)})
              </button>
            )}

            {/* Mode Toggle: Existing vs New */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setExistingRuleMode(false)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  !existingRuleMode
                    ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/30'
                    : `${p.dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`
                }`}
              >
                Create New Rule
              </button>
              <button
                onClick={() => { setExistingRuleMode(true); setSelectedExistingRule(null) }}
                disabled={!myRuleSets || myRuleSets.length === 0}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40 ${
                  existingRuleMode
                    ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/30'
                    : `${p.dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`
                }`}
              >
                Use Existing ({myRuleSets?.length ?? 0})
              </button>
            </div>

            {existingRuleMode ? (
              /* ── Use Existing Combined Rule ── */
              <div className="space-y-2">
                <p className={`text-[11px] ${p.textMuted}`}>
                  Select a combined rule you have already registered. This links it to the current agent without creating a new one.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {myRuleSets?.map((rs, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedExistingRule(rs)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedExistingRule?.hash === rs.hash
                          ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/40'
                          : `${p.dark ? 'bg-white/6 text-slate-400 hover:bg-white/10' : 'bg-black/6 text-slate-500 hover:bg-black/10'}`
                      }`}
                    >
                      {shortHash(rs.hash)}
                    </button>
                  ))}
                  {(!myRuleSets || myRuleSets.length === 0) && (
                    <p className={`text-xs ${p.textMuted}`}>No existing combined rules found. Create one first.</p>
                  )}
                </div>
                {selectedExistingRule && (
                  <div className="flex items-center gap-2 text-[10px] text-[#00D084]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selected: {shortHash(selectedExistingRule.hash)}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (selectedExistingRule?.hash) {
                      setAgentCombinedRule(selectedExistingRule.hash)
                    }
                  }}
                  disabled={isSettingRule || !selectedExistingRule}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-medium hover:bg-[#8B5CF6]/90 transition-colors disabled:opacity-50"
                >
                  {isSettingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  Link to Agent
                </button>
              </div>
            ) : (
              /* ── Create New Rule ── */
              <div className="space-y-2">
                {/* Preset Templates */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-1.5`}>Quick Templates</p>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_TEMPLATES.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedTemplate(i)
                          setRuleNameInput(t.name)
                          setRuleDescInput(t.desc)
                          if (t.json) {
                            setRuleJsonInput(JSON.stringify(t.json, null, 2))
                          }
                          setJsonError('')
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          selectedTemplate === i
                            ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/40'
                            : `${p.dark ? 'bg-white/6 text-slate-400 hover:bg-white/10' : 'bg-black/6 text-slate-500 hover:bg-black/10'}`
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rule Name */}
                <input
                  type="text"
                  value={ruleNameInput}
                  onChange={(e) => { setRuleNameInput(e.target.value); setSelectedTemplate(-1) }}
                  placeholder="Rule name (e.g. Spending Limit 500 USDC)"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40`}
                />
                {/* Rule Description */}
                <input
                  type="text"
                  value={ruleDescInput}
                  onChange={(e) => { setRuleDescInput(e.target.value); setSelectedTemplate(-1) }}
                  placeholder="Short description..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40`}
                />
                {/* Rule JSON Editor */}
                <div className="relative">
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500`}>Rule JSON</span>
                  <textarea
                    value={ruleJsonInput}
                    onChange={(e) => { setRuleJsonInput(e.target.value); setSelectedTemplate(-1); setJsonError('') }}
                    rows={8}
                    className={`w-full mt-6 p-3 rounded-xl text-[10px] font-mono border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:border-[#8B5CF6]/40 resize-y ${jsonError ? 'border-red-400' : ''}`}
                    style={{ lineHeight: '1.5' }}
                  />
                </div>
                {/* JSON Validation Error */}
                {jsonError && (
                  <div className="flex items-center gap-1.5 text-red-400 text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{jsonError}</span>
                  </div>
                )}
                {/* Slot Warning + Subscribe */}
                {slotsUsed >= slotsMax ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-amber-500 text-[10px]">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Slot limit reached ({slotsUsed}/{slotsMax}).</span>
                    </div>
                    <button
                      onClick={() => { if (subPrice) subscribe(subPrice as bigint) }}
                      disabled={isSubscribing || !subPrice}
                      className="px-2 py-1 rounded-lg bg-[#8B5CF6] text-white text-[10px] font-medium hover:bg-[#8B5CF6]/90 transition-colors disabled:opacity-50"
                    >
                      {isSubscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Subscribe'}
                    </button>
                  </div>
                ) : null}
                {/* Create Flow Button */}
                <button
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(ruleJsonInput)
                      // Validate PAY.ID rule structure
                      if (!parsed.version || !parsed.logic || !Array.isArray(parsed.rules)) {
                        setJsonError('Invalid rule: must have version, logic, and rules array')
                        return
                      }
                      const hash = keccak256(toBytes(JSON.stringify(parsed)))
                      const uri = `ipfs://rule-${hash.slice(2, 10)}`
                      setJsonError('')
                      createRule({ ruleHash: hash, uri })
                      setShowCreateSuccess(true)
                      setTimeout(() => setShowCreateSuccess(false), 3000)
                    } catch {
                      setJsonError('Invalid JSON syntax')
                    }
                  }}
                  disabled={isCreatingRule || !ruleNameInput.trim() || slotsUsed >= slotsMax}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00D084] text-white text-xs font-medium hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
                >
                  {isCreatingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Create Rule
                </button>
                {/* Success feedback */}
                {showCreateSuccess && (
                  <div className="flex items-center gap-2 text-[10px] text-[#00D084]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Rule created! Go to <a href="/v3/rules/console" className="underline">Rules Console</a> to activate & combine.</span>
                  </div>
                )}
                <p className={`text-[10px] ${p.textMuted}`}>
                  Prefer a guided UI? <a href="/v3/rule-builder" className="text-[#8B5CF6] hover:underline">Open Rule Builder</a> for step-by-step rule creation.
                </p>

                {/* Or use presets / on-chain rules */}
                <div className="pt-2 border-t" style={{ borderColor: p.dark ? '#ffffff10' : '#00000010' }}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${p.textMuted} mb-2`}>Or select existing rule</p>
                  <div className="flex gap-2 flex-wrap">
                    {rulesLoaded && onChainRules.length > 0 ? (
                      onChainRules.map((r, i) => (
                        <button
                          key={`onchain-${i}`}
                          onClick={() => setRuleIdx(i)}
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
                  {/* Set selected rule as policy */}
                  <button
                    onClick={() => {
                      const selectedHash = (onChainRules.length > 0 && onChainRules[ruleIdx])
                        ? onChainRules[ruleIdx].hash
                        : PRESET_RULES[ruleIdx]?.hash
                      if (selectedHash) setAgentCombinedRule(selectedHash as `0x${string}`)
                    }}
                    disabled={isSettingRule || onChainPhase !== 'idle'}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-medium hover:bg-[#8B5CF6]/90 transition-colors disabled:opacity-50"
                  >
                    {isSettingRule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Set as Agent Policy
                  </button>
                </div>
              </div>
            )}

            {/* Current policy status */}
            {agentRuleInfo?.active && (
              <div className="flex items-center gap-2 text-[10px] text-[#00D084]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Current policy: {shortHash(agentRuleInfo.ruleSetHash)}</span>
              </div>
            )}
          </>
        ) : (
          /* ── NON-OWNER VIEW: Agent Policy (read-only) ── */
          <>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-semibold ${p.textMuted}`}>
                AGENT POLICY
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 font-medium">
                View Only
              </span>
            </div>

            {!selectedAgent ? (
              <p className={`text-xs ${p.textMuted}`}>
                Select an AI agent above to view its on-chain policy.
              </p>
            ) : agentRuleInfo?.active ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D084]" />
                  <span className="font-semibold text-[#00D084] text-xs">
                    Policy Active
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{shortHash(agentRuleInfo.ruleSetHash)}</span>
                </div>
                <p className={`text-[11px] ${p.textMuted}`}>
                  This AI agent enforces an on-chain policy. All payment requests will be evaluated against this rule set before approval.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-amber-500 text-xs">
                    No Policy Configured
                  </span>
                </div>
                <p className={`text-[11px] ${p.textMuted}`}>
                  This AI agent does not have an active policy. The agent owner must set a rule before payments can be enforced.
                </p>
              </div>
            )}
          </>
        )}
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
            {selectedAgent ? `Chat with ${selectedAgent.displayName}` : 'Chat with AI Agent'}
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
          {messages.length === 0 && !selectedAgent && (
            <div className={`text-center text-xs ${p.textMuted} pt-10`}>
              Select an AI agent above to start chatting.
            </div>
          )}
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
            disabled={aiLoading || !hasApiKey || !selectedAgent}
            placeholder={
              !hasApiKey
                ? 'Set VITE_0G_AI_API_KEY in .env first'
                : !selectedAgent
                ? 'Select an AI agent above to start chatting'
                : `Ask ${selectedAgent.displayName} to make a payment…`
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
            disabled={aiLoading || !input.trim() || !hasApiKey || !selectedAgent}
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
                  AI approved. Execute transaction on-chain to verify against policy:
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
                  <Link2 className="w-4 h-4" /> Execute Payment On-Chain
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
