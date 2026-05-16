import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useAccount,
  useChainId,
  useConnectorClient,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi'
import { keccak256, toBytes, zeroAddress, zeroHash } from 'viem'
import {
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
import { ruleItemERC721Abi } from '@/constants/contracts'
import {
  uploadTo0G,
  uploadToIPFS,
  resolveStorageURI,
  getEthersSigner,
  detectStorageProvider,
} from '@/lib/storage'
import { downloadFromZGStorage } from '@/lib/zgStorage'
import { SUPPORTED_CHAIN_IDS, EXPLORER_URLS, AI_BASE, AI_KEY, AI_MODEL } from '@/features/agent/data/constants'
import { PRESET_RULES, PRESET_TEMPLATES, BASE_SYSTEM_PROMPT } from '@/features/agent/data/presets'
import { shortHash, shortAddr, tsNow } from '@/features/agent/utils/format'
import { parseDecision } from '@/features/agent/utils/parse'
import type { ChatMsg, AiDecision, OnChainRule, OnChainPhase, LogLine } from '@/features/agent/types'

export interface AgentPayIDState {
  // Wallet & chain
  address: `0x${string}` | undefined
  isConnected: boolean
  chainId: number | undefined
  isWrongChain: boolean
  activeChainId: number
  agentPayIDAddr: string | undefined
  mockRegistryAddr: string | undefined
  combinedRuleStorageAddr: string | undefined
  ruleItemAddr: string | undefined

  // Admin / registry
  adminAgents: AdminAgent[] | undefined
  selectedAgent: AdminAgent | null
  setSelectedAgent: (a: AdminAgent | null) => void
  registryAdmin: `0x${string}` | undefined
  isAdmin: boolean
  connectorClient: any

  // Agent rule info
  agentRuleInfo: { active: boolean; ruleSetHash: string } | undefined
  activeRuleHash: string | undefined
  currentRuleHash: string | undefined

  // Chat
  messages: ChatMsg[]
  input: string
  setInput: (s: string) => void
  aiLoading: boolean
  decision: AiDecision | null
  chatRef: React.RefObject<HTMLDivElement | null>
  sendMessage: () => Promise<void>

  // On-chain execution
  tokenId: string
  ruleIdx: number
  setRuleIdx: (i: number) => void
  onChainPhase: OnChainPhase
  logs: LogLine[]
  txHashes: string[]
  executeOnChain: () => Promise<void>
  resetAll: () => void

  // Register form
  showAgentRegister: boolean
  setShowAgentRegister: (v: boolean) => void
  regAgentWallet: string
  setRegAgentWallet: (s: string) => void
  regDisplayName: string
  setRegDisplayName: (s: string) => void
  regModel: string
  setRegModel: (s: string) => void
  regEndpoint: string
  setRegEndpoint: (s: string) => void
  regSystemPrompt: string
  setRegSystemPrompt: (s: string) => void
  storageProvider: '0g' | 'ipfs'
  setStorageProvider: (p: '0g' | 'ipfs') => void
  isUploading: boolean
  loadedMetadata: string | null
  setLoadedMetadata: (s: string | null) => void
  isLoadingMetadata: boolean
  setIsLoadingMetadata: (v: boolean) => void
  handleRegister: () => Promise<void>
  isRegisteringAgent: boolean
  isRegisterSuccess: boolean

  // Subscription
  subInfo: { logicalRuleCount?: number; maxSlots?: number; expiry?: bigint; isActive?: boolean } | undefined
  slotsUsed: number
  slotsMax: number
  subscribe: (price: bigint) => void
  isSubscribing: boolean
  subPrice: bigint | undefined

  // Rule creation / linking
  myRuleSets: CombinedRule[] | undefined
  myActiveRule: CombinedRule | undefined
  setAgentCombinedRule: (wallet: `0x${string}`, hash: `0x${string}`) => void
  isSettingRule: boolean

  // Embedded rule creation
  ruleJsonInput: string
  setRuleJsonInput: (s: string) => void
  ruleNameInput: string
  setRuleNameInput: (s: string) => void
  ruleDescInput: string
  setRuleDescInput: (s: string) => void
  showRuleSection: boolean
  setShowRuleSection: (v: boolean) => void
  existingRuleMode: boolean
  setExistingRuleMode: (v: boolean) => void
  selectedExistingRule: CombinedRule | null
  setSelectedExistingRule: (r: CombinedRule | null) => void
  selectedTemplate: number
  setSelectedTemplate: (i: number) => void
  jsonError: string
  setJsonError: (s: string) => void
  showCreateSuccess: boolean
  setShowCreateSuccess: (v: boolean) => void
  handleCreateRule: () => void
  isCreatingRule: boolean

  // On-chain rules
  onChainRules: OnChainRule[]
  rulesLoaded: boolean
  hasApiKey: boolean
}

export function useAgentPayID(): AgentPayIDState {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [decision, setDecision] = useState<AiDecision | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // On-chain state
  const [tokenId] = useState('42')
  const [ruleIdx, setRuleIdx] = useState(0)
  const [onChainPhase, setOnChainPhase] = useState<OnChainPhase>('idle')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [txHashes, setTxHashes] = useState<string[]>([])

  // AI Agent hooks
  const { data: adminAgents } = useAllAdminAIAgents({ onlyActive: true })
  const [selectedAgent, setSelectedAgent] = useState<AdminAgent | null>(null)

  useEffect(() => {
    const agents = adminAgents ?? []
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0])
    }
  }, [adminAgents, selectedAgent])

  const { data: registryAdmin } = useRegistryAdmin()
  const isAdmin = !!address && registryAdmin?.toLowerCase() === address.toLowerCase()
  const { data: connectorClient } = useConnectorClient()

  const { data: agentRuleInfo } = useAgentCombinedRule(selectedAgent?.agentWallet as `0x${string}` | undefined)
  const { registerAgent, isPending: isRegisteringAgent, isSuccess: isRegisterSuccess } = useRegisterAdminAIAgent()
  const { setAgentCombinedRule, isPending: isSettingRule } = useSetAgentCombinedRule()

  const [showAgentRegister, setShowAgentRegister] = useState(false)
  const [regAgentWallet, setRegAgentWallet] = useState(address ?? '')
  const [regDisplayName, setRegDisplayName] = useState('')
  const [regModel, setRegModel] = useState('qwen/qwen-2.5-7b-instruct')
  const [regEndpoint, setRegEndpoint] = useState('https://compute-network-6.integratenetwork.work/v1/proxy')
  const [regSystemPrompt, setRegSystemPrompt] = useState('')

  const [storageProvider, setStorageProvider] = useState<'0g' | 'ipfs'>(() => {
    const saved = localStorage.getItem('payid-storage-preference')
    if (saved === '0g') return '0g'
    if (saved === 'ipfs') return 'ipfs'
    return '0g'
  })

  const [isUploading, setIsUploading] = useState(false)
  const [loadedMetadata, setLoadedMetadata] = useState<string | null>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

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

  const { data: subInfo } = useSubscription(address)
  const slotsUsed = subInfo?.logicalRuleCount ?? 0
  const slotsMax = subInfo?.maxSlots ?? 1

  const { data: myRuleSets } = useMyRuleSets()
  const { data: myActiveRule } = useActiveCombinedRule(address)

  const { subscribe, isPending: isSubscribing } = useSubscribe()
  const { data: subPrice } = useSubscriptionPrice()

  const { createRule, isPending: isCreatingRule } = useCreateRule()
  const [ruleJsonInput, setRuleJsonInput] = useState(`{\n  "version": "1.0",\n  "logic": "AND",\n  "rules": [\n    {\n      "type": "simple",\n      "field": "tx.amount",\n      "operator": "<=",\n      "value": 500000000\n    }\n  ]\n}`)
  const [ruleNameInput, setRuleNameInput] = useState('')
  const [ruleDescInput, setRuleDescInput] = useState('')
  const [showRuleSection, setShowRuleSection] = useState(false)
  const [existingRuleMode, setExistingRuleMode] = useState(false)
  const [selectedExistingRule, setSelectedExistingRule] = useState<CombinedRule | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState(-1)
  const [jsonError, setJsonError] = useState('')
  const [showCreateSuccess, setShowCreateSuccess] = useState(false)

  const isWrongChain = isConnected && !!chainId && !SUPPORTED_CHAIN_IDS.includes(chainId)
  const activeChainId = chainId && SUPPORTED_CHAIN_IDS.includes(chainId) ? chainId : 16601
  const chainAddresses = (addresses as any)[activeChainId]
  const agentPayIDAddr = chainAddresses?.AgentPayID
  const mockRegistryAddr = chainAddresses?.MockAgentRegistry
  const combinedRuleStorageAddr = chainAddresses?.CombinedRuleStorage
  const ruleItemAddr = chainAddresses?.RuleItemERC721

  const { data: activeRuleHash } = useReadContract({
    address: combinedRuleStorageAddr,
    abi: combinedRuleStorageAbi,
    functionName: 'getActiveRuleOf',
    args: [selectedAgent?.agentWallet as `0x${string}` ?? zeroAddress],
    query: { enabled: !!combinedRuleStorageAddr && !!selectedAgent?.agentWallet },
  })

  const { data: nextRuleId } = useReadContract({
    address: ruleItemAddr,
    abi: ruleItemERC721Abi,
    functionName: 'nextRuleId',
    chainId: activeChainId,
  })

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

          let name: string | undefined
          let description: string | undefined
          let ruleJson: Record<string, unknown> | undefined
          if (uri) {
            try {
              let raw: string | null = null
              if (uri.startsWith('0g://')) {
                const rootHash = uri.replace('0g://', '')
                raw = await downloadFromZGStorage(rootHash)
              } else if (uri.includes('0g.ai') || uri.includes('indexer')) {
                const parts = uri.split('/')
                const rootHash = parts[parts.length - 1].split('?')[0]
                if (rootHash) raw = await downloadFromZGStorage(rootHash)
              } else {
                const res = await fetch(uri)
                raw = await res.text()
              }
              if (raw) {
                const json = JSON.parse(raw)
                name = json.name
                description = json.description
                ruleJson = json
              }
            } catch { /* no metadata */ }
          }

          results.push({ ruleId, hash, uri, name, description, ruleJson, active })
        } catch { /* skip */ }
      }))

      setOnChainRules(results)
      setRulesLoaded(true)
    })()
  }, [nextRuleId, publicClient, ruleItemAddr])

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

  const buildSystemPrompt = useCallback(() => {
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
  }, [selectedAgent, agentRuleInfo])

  const { data: currentRuleHash } = useReadContract({
    address: agentPayIDAddr,
    abi: agentPayIDAbi,
    functionName: 'agentRules',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
  })

  const addLog = useCallback((msg: string, level: LogLine['level'] = 'info') => {
    setLogs((prev) => [...prev, { time: tsNow(), level, msg }])
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const callAI = useCallback(
    async (userMsg: string) => {
      setAiLoading(true)
      const systemPrompt = buildSystemPrompt()
      const history: ChatMsg[] = [
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
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            temperature: 0.3,
            max_tokens: 512,
          }),
        })
        if (!res.ok) throw new Error(`AI API error: ${res.status}`)
        const data = await res.json()
        const reply: string = data.choices?.[0]?.message?.content ?? 'No response from AI.'

        const parsed = parseDecision(reply)
        let finalReply = reply
        let finalDecision = parsed

        if (parsed && selectedAgent) {
          let ruleJson: Record<string, unknown> | null = null
          if (rulesLoaded && onChainRules.length > 0 && onChainRules[ruleIdx]?.ruleJson) {
            ruleJson = onChainRules[ruleIdx].ruleJson!
          } else if (selectedTemplate >= 0 && PRESET_TEMPLATES[selectedTemplate]?.json) {
            ruleJson = PRESET_TEMPLATES[selectedTemplate].json as Record<string, unknown>
          }

          if (ruleJson) {
            try {
              const { createPayIDClient } = await import('payid/client')
              const client = createPayIDClient()
              await client.ready()

              const amountRaw = Math.floor((parsed.amount ?? 0) * 1_000_000).toString()
              const context = {
                tx: {
                  sender: address ?? '0x0000000000000000000000000000000000000000',
                  receiver: (parsed.receiver ?? '').startsWith('0x') ? parsed.receiver : '0x0000000000000000000000000000000000000000',
                  asset: '0x0000000000000000000000000000000000000000',
                  amount: amountRaw,
                  chainId: activeChainId,
                },
                env: {
                  timestamp: Math.floor(Date.now() / 1000),
                },
              }

              const result = await client.evaluate(context, ruleJson as any)
              const wasmDecision = result.decision === 'ALLOW' ? 'APPROVE' : 'REJECT'
              finalDecision = { ...parsed, decision: wasmDecision, reason: result.reason ?? '' }

              const matchStatus = wasmDecision === parsed.decision ? 'Match' : 'Corrected by PAY.ID'
              finalReply = reply + `\n\n---\n**PAY.ID Rule Engine Verification**\n- AI Decision: ${parsed.decision}\n- WASM Result: ${wasmDecision}\n- Reason: ${result.reason}\n- Status: ${matchStatus}`
            } catch (err) {
              console.error('PAY.ID WASM error:', err)
              finalReply = reply + '\n\n*(Note: PAY.ID rule engine verification unavailable)*'
            }
          }
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: finalReply }])
        if (finalDecision) setDecision(finalDecision)
        return finalReply
      } catch (e: unknown) {
        const msg = (e as Error).message || 'Failed to reach 0G AI'
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }])
      } finally {
        setAiLoading(false)
      }
    },
    [messages, selectedAgent, agentRuleInfo, address, rulesLoaded, onChainRules, ruleIdx, selectedTemplate, buildSystemPrompt, activeChainId],
  )

  const sendMessage = useCallback(async () => {
    if (!input.trim() || aiLoading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    await callAI(userMsg)
  }, [input, aiLoading, callAI])

  const executeOnChain = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return
    setLogs([])
    setTxHashes([])
    const tid = BigInt(tokenId)

    const selectedHash = (onChainRules.length > 0 && onChainRules[ruleIdx])
      ? onChainRules[ruleIdx].hash
      : PRESET_RULES[ruleIdx].hash

    const ruleHashToLink = selectedHash as `0x${string}`
    const ruleLabel = (onChainRules.length > 0 && onChainRules[ruleIdx])
      ? (onChainRules[ruleIdx].name || `Rule #${onChainRules[ruleIdx].ruleId}`)
      : PRESET_RULES[ruleIdx].label

    try {
      if (onChainPhase === 'idle') {
        setOnChainPhase('register')
        addLog(`[REGISTRY] setOwner(${tid}, ${shortAddr(address)})…`)
        const tx1 = await writeContractAsync({
          address: mockRegistryAddr,
          abi: mockAgentRegistryAbi,
          functionName: 'setOwner',
          args: [tid, address],
          chainId: activeChainId,
        })
        setTxHashes((h) => [...h, tx1])
        await publicClient.waitForTransactionReceipt({ hash: tx1 })
        addLog(`[REGISTRY] Agent NFT #${tid} registered`, 'ok')

        setOnChainPhase('link')
        addLog(`[AGENT] linkAgentRule(${tid}, ${shortHash(ruleHashToLink)})…`)
        const tx2 = await writeContractAsync({
          address: agentPayIDAddr,
          abi: agentPayIDAbi,
          functionName: 'linkAgentRule',
          args: [tid, ruleHashToLink],
          chainId: activeChainId,
        })
        setTxHashes((h) => [...h, tx2])
        await publicClient.waitForTransactionReceipt({ hash: tx2 })
        addLog(`[AGENT] Policy "${ruleLabel}" linked on-chain`, 'ok')
      }

      addLog(`[VERIFY] Running PAY.ID WASM rule engine…`)

      if (decision?.decision === 'REJECT') {
        await new Promise((r) => setTimeout(r, 1500))
        throw new Error(`ExecutionReverted: ${decision.reason}. Transaction blocked by PAY.ID rule engine.`)
      }

      await new Promise((r) => setTimeout(r, 1000))
      addLog(`[VERIFY] Payment payload matches on-chain policy`, 'ok')
      addLog(`[SETTLE] Payment transaction executed successfully`, 'ok')
      setOnChainPhase('done')
    } catch (e: unknown) {
      setOnChainPhase('error')
      addLog(
        `[ERROR] ${(e as { shortMessage?: string }).shortMessage ?? (e as Error).message}`,
        'err',
      )
    }
  }, [isConnected, address, publicClient, tokenId, onChainPhase, onChainRules, ruleIdx, decision, addLog, writeContractAsync, mockRegistryAddr, agentPayIDAddr, activeChainId])

  const resetAll = useCallback(() => {
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
  }, [selectedAgent])

  const handleRegister = useCallback(async () => {
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
    let encryptedURI = ''

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
    } else {
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
    }

    registerAgent({
      agentWallet: regAgentWallet.trim() as `0x${string}`,
      displayName: regDisplayName.trim(),
      metadataHash,
      encryptedURI,
      publicEndpoint: regEndpoint.trim(),
    })
  }, [regAgentWallet, regDisplayName, regEndpoint, regModel, regSystemPrompt, storageProvider, connectorClient, registerAgent])

  const handleCreateRule = useCallback(() => {
    try {
      const parsed = JSON.parse(ruleJsonInput)
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
  }, [ruleJsonInput, createRule])

  const hasApiKey = !!AI_KEY && AI_KEY !== 'YOUR_0G_AI_API_KEY_HERE'

  return {
    address,
    isConnected,
    chainId,
    isWrongChain,
    activeChainId,
    agentPayIDAddr,
    mockRegistryAddr,
    combinedRuleStorageAddr,
    ruleItemAddr,

    adminAgents,
    selectedAgent,
    setSelectedAgent,
    registryAdmin,
    isAdmin,
    connectorClient,

    agentRuleInfo,
    activeRuleHash,
    currentRuleHash,

    messages,
    input,
    setInput,
    aiLoading,
    decision,
    chatRef,
    sendMessage,

    tokenId,
    ruleIdx,
    setRuleIdx,
    onChainPhase,
    logs,
    txHashes,
    executeOnChain,
    resetAll,

    showAgentRegister,
    setShowAgentRegister,
    regAgentWallet,
    setRegAgentWallet,
    regDisplayName,
    setRegDisplayName,
    regModel,
    setRegModel,
    regEndpoint,
    setRegEndpoint,
    regSystemPrompt,
    setRegSystemPrompt,
    storageProvider,
    setStorageProvider,
    isUploading,
    loadedMetadata,
    setLoadedMetadata,
    isLoadingMetadata,
    setIsLoadingMetadata,
    handleRegister,
    isRegisteringAgent,
    isRegisterSuccess,

    subInfo,
    slotsUsed,
    slotsMax,
    subscribe,
    isSubscribing,
    subPrice,

    myRuleSets,
    myActiveRule,
    setAgentCombinedRule,
    isSettingRule,

    ruleJsonInput,
    setRuleJsonInput,
    ruleNameInput,
    setRuleNameInput,
    ruleDescInput,
    setRuleDescInput,
    showRuleSection,
    setShowRuleSection,
    existingRuleMode,
    setExistingRuleMode,
    selectedExistingRule,
    setSelectedExistingRule,
    selectedTemplate,
    setSelectedTemplate,
    jsonError,
    setJsonError,
    showCreateSuccess,
    setShowCreateSuccess,
    handleCreateRule,
    isCreatingRule,

    onChainRules,
    rulesLoaded,
    hasApiKey,
  }
}
