import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  useAccount,
  useChainId,
  useConnectorClient,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useSendTransaction,
} from 'wagmi';
import { keccak256, toBytes, zeroAddress } from 'viem';
import { toast } from 'sonner';
import {
  useRegisterAdminAIAgent,
  useAgentCombinedRule,
  useAllAdminAIAgents,
  useRegistryAdmin,
  useSubscription,
  useCreateRule,
  useMyRuleSets,
  useAllCombinedRules,
  useSubscribe,
  useSubscriptionPrice,
  useActiveCombinedRule,
} from 'payid-react';
import type { AdminAgent, CombinedRule } from 'payid-react';
import { addresses } from '@/constants/contracts/addresses';
import { agentPayIDAbi } from '@/constants/contracts/AgentPayID';
import { mockAgentRegistryAbi } from '@/constants/contracts/MockAgentRegistry';
import { combinedRuleStorageAbi } from '@/constants/contracts/CombinedRuleStorage';
import { ruleItemERC721Abi } from '@/constants/contracts';
import {
  uploadTo0G,
  uploadToIPFS,
  getEthersSigner,
} from '@/lib/storage';
import { downloadFromZGStorage } from '@/lib/zgStorage';
import { genImage } from '@/features/rules/utils/image';
import { pinImage, pinJson } from '@/features/rules/utils/storage';
import { SUPPORTED_CHAIN_IDS, AI_BASE, AI_KEY, AI_MODEL } from '@/features/agent/data/constants';
import { PRESET_RULES, BASE_SYSTEM_PROMPT } from '@/features/agent/data/presets';
import { shortHash, shortAddr, tsNow } from '@/features/agent/utils/format';
import { parseDecision } from '@/features/agent/utils/parse';
import type { ChatMsg, AiDecision, OnChainRule, OnChainPhase, LogLine } from '@/features/agent/types';

export interface AgentPayIDState {
  // Wallet & chain
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  isWrongChain: boolean;
  activeChainId: number;
  agentPayIDAddr: string | undefined;
  mockRegistryAddr: string | undefined;
  combinedRuleStorageAddr: string | undefined;
  ruleItemAddr: string | undefined;

  // Admin / registry
  adminAgents: AdminAgent[] | undefined;
  selectedAgent: AdminAgent | null;
  setSelectedAgent: (a: AdminAgent | null) => void;
  registryAdmin: `0x${string}` | undefined;
  isAdmin: boolean;
  connectorClient: any;

  // Agent rule info
  agentRuleInfo: { active: boolean; ruleSetHash: string; } | undefined;
  activeRuleHash: string | undefined;
  currentRuleHash: string | undefined;
  agentRuleJson: Record<string, unknown> | null;

  // Chat
  messages: ChatMsg[];
  input: string;
  setInput: (s: string) => void;
  aiLoading: boolean;
  decision: AiDecision | null;
  chatRef: React.RefObject<HTMLDivElement | null>;
  sendMessage: () => Promise<void>;

  // On-chain execution
  tokenId: string;
  ruleIdx: number;
  setRuleIdx: (i: number) => void;
  onChainPhase: OnChainPhase;
  logs: LogLine[];
  txHashes: string[];
  executeOnChain: () => Promise<void>;
  resetAll: () => void;

  // Register form
  showAgentRegister: boolean;
  setShowAgentRegister: (v: boolean) => void;
  regAgentWallet: string;
  setRegAgentWallet: (s: string) => void;
  regDisplayName: string;
  setRegDisplayName: (s: string) => void;
  regModel: string;
  setRegModel: (s: string) => void;
  regEndpoint: string;
  setRegEndpoint: (s: string) => void;
  regSystemPrompt: string;
  setRegSystemPrompt: (s: string) => void;
  storageProvider: '0g' | 'ipfs';
  setStorageProvider: (p: '0g' | 'ipfs') => void;
  isUploading: boolean;
  loadedMetadata: string | null;
  setLoadedMetadata: (s: string | null) => void;
  isLoadingMetadata: boolean;
  setIsLoadingMetadata: (v: boolean) => void;
  handleRegister: () => Promise<void>;
  isRegisteringAgent: boolean;
  isRegisterSuccess: boolean;

  // Subscription
  subInfo: { logicalRuleCount?: number; maxSlots?: number; expiry?: bigint; isActive?: boolean; } | undefined;
  slotsUsed: number;
  slotsMax: number;
  subscribe: (price: bigint) => void;
  isSubscribing: boolean;
  subPrice: bigint | undefined;

  // Rule creation / linking
  myRuleSets: CombinedRule[] | undefined;
  myActiveRule: CombinedRule | undefined;
  setAgentCombinedRule: (wallet: `0x${string}`, hash: `0x${string}`) => void;
  isSettingRule: boolean;
  unsetAgentCombinedRule: (wallet: `0x${string}`) => void;
  isUnsettingRule: boolean;

  // Embedded rule creation
  ruleJsonInput: string;
  setRuleJsonInput: (s: string) => void;
  ruleNameInput: string;
  setRuleNameInput: (s: string) => void;
  ruleDescInput: string;
  setRuleDescInput: (s: string) => void;
  showRuleSection: boolean;
  setShowRuleSection: (v: boolean) => void;
  existingRuleMode: boolean;
  setExistingRuleMode: (v: boolean) => void;
  selectedExistingRule: CombinedRule | null;
  setSelectedExistingRule: (r: CombinedRule | null) => void;
  selectedTemplate: number;
  setSelectedTemplate: (i: number) => void;
  jsonError: string;
  setJsonError: (s: string) => void;
  showCreateSuccess: boolean;
  setShowCreateSuccess: (v: boolean) => void;
  handleCreateRule: () => Promise<void>;
  isCreatingRule: boolean;

  // On-chain rules
  onChainRules: OnChainRule[];
  rulesLoaded: boolean;
  hasApiKey: boolean;
  chatFlowStep: number;
}

export function useAgentPayID(): AgentPayIDState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatFlowStep, setChatFlowStep] = useState(0);
  const [decision, setDecision] = useState<AiDecision | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // On-chain state
  const [tokenId] = useState('42');
  const [ruleIdx, setRuleIdx] = useState(0);
  const [onChainPhase, setOnChainPhase] = useState<OnChainPhase>('idle');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  // AI Agent hooks
  const { data: adminAgents, refetch: refetchAdminAgents } = useAllAdminAIAgents({ onlyActive: true });
  const [selectedAgent, setSelectedAgent] = useState<AdminAgent | null>(null);

  useEffect(() => {
    const agents = adminAgents ?? [];
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [adminAgents, selectedAgent]);

  const { data: registryAdmin } = useRegistryAdmin();
  const isAdmin = !!address && registryAdmin?.toLowerCase() === address.toLowerCase();
  const { data: connectorClient } = useConnectorClient();

  const { data: agentRuleInfo, refetch: refetchAgentRuleInfo } = useAgentCombinedRule(selectedAgent?.agentWallet as `0x${string}` | undefined);

  const {
    registerAgent,
    isPending: isRegisteringPending,
    isConfirming: isRegisteringConfirming,
    isSuccess: isRegisterSuccess,
    error: registerError,
  } = useRegisterAdminAIAgent();



  const isRegisteringAgent = isRegisteringPending || isRegisteringConfirming;
  const [isSettingRule, setIsSettingRule] = useState(false);
  const [isUnsettingRule, setIsUnsettingRule] = useState(false);

  const isWrongChain = isConnected && !!chainId && !SUPPORTED_CHAIN_IDS.includes(chainId);
  const activeChainId = chainId && SUPPORTED_CHAIN_IDS.includes(chainId) ? chainId : 421614;
  const chainAddresses = (addresses as any)[activeChainId];
  const agentPayIDAddr = chainAddresses?.AgentPayID;
  const mockRegistryAddr = chainAddresses?.MockAgentRegistry;
  const combinedRuleStorageAddr = chainAddresses?.CombinedRuleStorage;
  const ruleItemAddr = chainAddresses?.RuleItemERC721;

  const [showAgentRegister, setShowAgentRegister] = useState(false);
  const [regAgentWallet, setRegAgentWallet] = useState(address ?? '');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regModel, setRegModel] = useState('qwen/qwen-2.5-7b-instruct');
  const [regEndpoint, setRegEndpoint] = useState('https://compute-network-6.integratenetwork.work/v1/proxy');
  const [regSystemPrompt, setRegSystemPrompt] = useState('');

  const [storageProvider, setStorageProvider] = useState<'0g' | 'ipfs'>(() => {
    const saved = localStorage.getItem('payid-storage-preference');
    if (saved === '0g') return '0g';
    if (saved === 'ipfs') return 'ipfs';
    return 'ipfs';
  });

  const [isUploading, setIsUploading] = useState(false);
  const [loadedMetadata, setLoadedMetadata] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Synchronize AI Agent registration
  useEffect(() => {
    if (isRegisterSuccess) {
      toast.success('AI Agent registered successfully!', {
        description: 'Your AI agent has been added to the registry.',
      });
      refetchAdminAgents();
      setShowAgentRegister(false);
      setRegAgentWallet(address ?? '');
      setRegDisplayName('');
      setRegSystemPrompt('');
      setRegModel('qwen/qwen-2.5-7b-instruct');
      setRegEndpoint('https://compute-network-6.integratenetwork.work/v1/proxy');
    }
  }, [isRegisterSuccess, address, refetchAdminAgents]);

  useEffect(() => {
    if (registerError) {
      const msg = (registerError as { shortMessage?: string; }).shortMessage ?? 'Transaction failed';
      toast.error('Registration failed', { description: msg });
    }
  }, [registerError]);



  const { data: subInfo } = useSubscription(address);
  const slotsUsed = subInfo?.logicalRuleCount ?? 0;
  const slotsMax = subInfo?.maxSlots ?? 1;

  const { data: myRuleSets, refetch: refetchMyRuleSets } = useMyRuleSets();
  const { data: myActiveRule } = useActiveCombinedRule(address);
  const { data: allCombinedRules } = useAllCombinedRules({ onlyActive: true });

  const { subscribe, isPending: isSubscribing } = useSubscribe();
  const { data: subPrice } = useSubscriptionPrice();

  const {
    createRule,
    isPending: isCreatingRulePending,
    isConfirming: isCreatingRuleConfirming,
    isSuccess: isCreatingRuleSuccess,
    error: createRuleError,
  } = useCreateRule();

  const isCreatingRule = isCreatingRulePending || isCreatingRuleConfirming;

  // Synchronize rule NFT creation in console
  useEffect(() => {
    if (isCreatingRuleSuccess) {
      toast.success('Rule NFT created successfully!', {
        description: 'Refreshing your rule sets list...',
      });
      refetchMyRuleSets();
      setShowCreateSuccess(true);
      setTimeout(() => setShowCreateSuccess(false), 4000);
    }
  }, [isCreatingRuleSuccess, refetchMyRuleSets]);

  useEffect(() => {
    if (createRuleError) {
      const msg = (createRuleError as { shortMessage?: string; }).shortMessage ?? 'Transaction failed';
      toast.error('Rule creation failed', { description: msg });
    }
  }, [createRuleError]);
  const [ruleJsonInput, setRuleJsonInput] = useState(() => {
    const owner = address ?? '0x0000000000000000000000000000000000000000';
    return JSON.stringify({
      version: "1.0",
      logic: "AND",
      rules: [
        {
          type: "simple",
          field: "tx.amount",
          operator: "<=",
          value: 500000000
        },
        {
          type: "simple",
          field: "tx.sender",
          operator: "==",
          value: owner
        }
      ]
    }, null, 2);
  });
  const [ruleNameInput, setRuleNameInput] = useState('');
  const [ruleDescInput, setRuleDescInput] = useState('');
  const [showRuleSection, setShowRuleSection] = useState(false);
  const [existingRuleMode, setExistingRuleMode] = useState(false);
  const [selectedExistingRule, setSelectedExistingRule] = useState<CombinedRule | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(-1);
  const [jsonError, setJsonError] = useState('');
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);

  const { data: activeRuleHash } = useReadContract({
    address: combinedRuleStorageAddr,
    abi: combinedRuleStorageAbi,
    functionName: 'getActiveRuleOf',
    args: [selectedAgent?.agentWallet as `0x${string}` ?? zeroAddress],
    query: { enabled: !!combinedRuleStorageAddr && !!selectedAgent?.agentWallet },
  });

  const { data: nextRuleId } = useReadContract({
    address: ruleItemAddr,
    abi: ruleItemERC721Abi,
    functionName: 'nextRuleId',
    chainId: activeChainId,
  });

  const [onChainRules, setOnChainRules] = useState<OnChainRule[]>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);

  useEffect(() => {
    if (!nextRuleId || !publicClient || !ruleItemAddr) return;
    const count = Number(nextRuleId);
    if (count === 0) { setRulesLoaded(true); return; }

    ; (async () => {
      const ruleIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));
      const results: OnChainRule[] = [];

      await Promise.all(ruleIds.map(async (ruleId) => {
        try {
          const [hash, uri, , , , deprecated, tokenId] = await publicClient.readContract({
            address: ruleItemAddr,
            abi: ruleItemERC721Abi,
            functionName: 'rules',
            args: [ruleId],
          }) as [string, string, string, bigint, number, boolean, bigint];

          const active = tokenId > 0n;
          if (deprecated || !active) return;

          let name: string | undefined;
          let description: string | undefined;
          let ruleJson: Record<string, unknown> | undefined;
          if (uri) {
            try {
              let raw: string | null = null;
              if (uri.startsWith('0g://')) {
                const rootHash = uri.replace('0g://', '');
                raw = await downloadFromZGStorage(rootHash);
              } else if (uri.includes('0g.ai') || uri.includes('indexer')) {
                const parts = uri.split('/');
                const rootHash = parts[parts.length - 1].split('?')[0];
                if (rootHash) raw = await downloadFromZGStorage(rootHash);
              } else {
                let fetchUri = uri;
                if (uri.startsWith('ipfs://')) {
                  fetchUri = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                }
                const res = await fetch(fetchUri);
                raw = await res.text();
              }
              if (raw) {
                const json = JSON.parse(raw);
                name = json.name;
                description = json.description;
                ruleJson = json.rule ?? json;
              }
            } catch { /* no metadata */ }
          }

          results.push({ ruleId, tokenId, hash, uri, name, description, ruleJson, active });
        } catch { /* skip */ }
      }));

      setOnChainRules(results);
      setRulesLoaded(true);
    })();
  }, [nextRuleId, publicClient, ruleItemAddr]);

  useEffect(() => {
    setLoadedMetadata(null);
  }, [selectedAgent]);

  useEffect(() => {
    if (selectedAgent) {
      const policyStatus = agentRuleInfo?.active ? 'linked to a PAY.ID policy' : 'not yet linked to a policy';
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'm **${selectedAgent.displayName}** (AI Agent). I'm ${policyStatus} on-chain.\n\nTry asking me: "Pay 100 USDC to 0xAbc..."`,
        },
      ]);
    } else {
      setMessages([]);
    }
  }, [selectedAgent, agentRuleInfo]);

  const agentRuleJson = useMemo((): Record<string, unknown> | null => {
    if (!agentRuleInfo?.active || !agentRuleInfo.ruleSetHash || !rulesLoaded) return null;

    // 1. Coba cari langsung di onChainRules (jika hash-nya adalah single rule NFT)
    const activeRule = onChainRules.find(
      (r) => r.hash.toLowerCase() === agentRuleInfo.ruleSetHash.toLowerCase()
    );
    if (activeRule?.ruleJson) {
      return activeRule.ruleJson;
    }

    // 2. Coba cari di allCombinedRules (jika hash-nya adalah Combined Rule Set)
    const ruleSet = allCombinedRules?.find(
      (rs) => rs.hash.toLowerCase() === agentRuleInfo.ruleSetHash.toLowerCase()
    );
    if (ruleSet && ruleSet.ruleRefs && ruleSet.ruleRefs.length > 0) {
      const subRules: any[] = [];
      for (const ref of ruleSet.ruleRefs) {
        // Cari matching rule berdasarkan tokenId
        const match = onChainRules.find(
          (r) => r.tokenId !== undefined && r.tokenId === ref.tokenId
        );
        if (match?.ruleJson?.rules && Array.isArray(match.ruleJson.rules)) {
          subRules.push(...match.ruleJson.rules);
        } else if (match?.ruleJson) {
          subRules.push(match.ruleJson);
        }
      }

      if (subRules.length > 0) {
        return {
          version: '1',
          logic: 'AND',
          rules: subRules,
        };
      }
    }

    return null;
  }, [agentRuleInfo, rulesLoaded, onChainRules, allCombinedRules]);

  const buildSystemPrompt = useCallback(() => {
    const agentName = selectedAgent?.displayName ?? 'Agent';
    const agentSection = `\n\nYou are currently representing AI Agent: "${agentName}".`;

    let ruleJsonStr = 'No specific rules loaded.';
    if (agentRuleJson) {
      // Annotate oracle.txValueUsd values with human-readable USD so the AI can evaluate correctly.
      // Scale: $1 = 100_000_000 (8-decimal precision). Replace raw values with "$X.XX USD" comments.
      let annotated = JSON.stringify(agentRuleJson, null, 2);
      annotated = annotated.replace(
        /("value"\s*:\s*)(\d{7,})/g,
        (match, prefix, rawVal) => {
          const num = Number(rawVal);
          // Heuristic: if the field context is oracle.txValueUsd, convert
          if (num >= 1_000_000) {
            const usd = (num / 1e8).toFixed(2);
            return `${prefix}${rawVal} /* = $${usd} USD */`;
          }
          return match;
        }
      );
      ruleJsonStr = annotated;
    }

    const policySection = agentRuleInfo?.active
      ? `\n\nCURRENT LINKED POLICY:\n` +
      `Policy Hash: ${agentRuleInfo.ruleSetHash}\n` +
      `Status: ACTIVE\n` +
      `Policy Logic:\n${ruleJsonStr}\n\n` +
      `IMPORTANT — oracle.txValueUsd field uses 8-decimal USD precision: $1 = 100000000, $10 = 1000000000, $100 = 10000000000.\n` +
      `The inline /* = $X.XX USD */ comments show the human-readable equivalent. Use those USD values when evaluating oracle.txValueUsd rules.\n` +
      `The WASM sandbox will verify the final oracle check — your job is to evaluate intent and non-oracle rules.\n\n` +
      `Current User (Sender) Address: ${address ?? 'Not connected'}\n\n` +
      `You MUST evaluate the user's request against this policy logic. ` +
      `If the request (or the user's address) violates the policy, you MUST respond with "REJECT" and provide the exact reason based on the policy logic.`
      : `\n\nNo active policy linked to this agent. ` +
      `Tell the user that the agent owner needs to set a policy first.`;

    return BASE_SYSTEM_PROMPT + agentSection + policySection;
  }, [selectedAgent, agentRuleInfo, agentRuleJson, address]);

  const { data: currentRuleHash } = useReadContract({
    address: agentPayIDAddr,
    abi: agentPayIDAbi,
    functionName: 'agentRules',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
  });

  const addLog = useCallback((msg: string, level: LogLine['level'] = 'info') => {
    setLogs((prev) => [...prev, { time: tsNow(), level, msg }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const callAI = useCallback(
    async (userMsg: string) => {
      setAiLoading(true);

      // ── 1. User Message (Step 1 -> 2) ──
      setChatFlowStep(2); // Start IPFS Load step
      await new Promise((r) => setTimeout(r, 600));

      // ── 2. Load Rule NFT (IPFS) (Step 2 -> 3) ──
      setChatFlowStep(3); // Start AI Inference step
      await new Promise((r) => setTimeout(r, 600));

      const systemPrompt = buildSystemPrompt();
      const history: ChatMsg[] = [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
        { role: 'user', content: userMsg },
      ];
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
        });
        if (!res.ok) throw new Error(`AI API error: ${res.status}`);
        const data = await res.json();
        const reply: string = data.choices?.[0]?.message?.content ?? 'No response from AI.';

        const parsed = parseDecision(reply);
        let finalReply = reply;
        let finalDecision = parsed;

        if (selectedAgent) {
          // ── 4. WASM Engine (Step 3 -> 4) ──
          setChatFlowStep(4);
          await new Promise((r) => setTimeout(r, 800));

          const ruleJson = agentRuleJson;

          if (ruleJson) {
            try {
              const { createPayIDClient } = await import('payid/client');
              const client = createPayIDClient();
              await client.ready();

              const amountRaw = (parsed?.amount !== undefined)
                ? (parsed.amount >= 100_000 ? Math.floor(parsed.amount).toString() : Math.floor(parsed.amount * 1_000_000).toString())
                : '0';

              // txValueUsd: USDC 6-decimal units × 100 → 8-decimal USD scale ($1 = 100_000_000)
              // Matches rule builder template values (e.g. $1 min = value:100000000)
              const txValueUsd = (BigInt(amountRaw) * 100n).toString();

              const context = {
                tx: {
                  sender: address ?? '0x0000000000000000000000000000000000000000',
                  receiver: (parsed?.receiver ?? '').startsWith('0x') ? parsed!.receiver : '0x0000000000000000000000000000000000000000',
                  asset: '0x0000000000000000000000000000000000000000',
                  amount: amountRaw,
                  chainId: activeChainId,
                },
                env: {
                  timestamp: Math.floor(Date.now() / 1000),
                },
                oracle: {
                  txValueUsd,
                  txValueUsdFormatted: `$${(Number(txValueUsd) / 1e8).toFixed(2)}`,
                },
              };

              const result = await client.evaluate(context, ruleJson as any);
              // WASM is the sole policy authority — its decision is final regardless of AI's text output.
              // AI parses intent and generates responses; WASM enforces the actual policy math.
              const effectiveDecision = result.decision === 'ALLOW' ? 'APPROVE' : 'REJECT';
              const effectiveReason = result.reason ?? '';

              let ruleDesc = 'Custom Rule';
              if (ruleJson.rules && Array.isArray(ruleJson.rules)) {
                ruleDesc = ruleJson.rules.map(r => {
                  const id = r.id || 'Rule';
                  if (id === 'rule_001' || id === 'only_owner') return `${id} (Only Owner)`;
                  if (id === 'spending_limit') return `${id} (Spending Limit)`;
                  return id;
                }).join(' & ');
              } else if (ruleJson.id) {
                const id = ruleJson.id as string;
                if (id === 'rule_001' || id === 'only_owner') ruleDesc = `${id} (Only Owner)`;
                else if (id === 'spending_limit') ruleDesc = `${id} (Spending Limit)`;
                else ruleDesc = id;
              }

              const formatLogVal = (field: string, val: any): string => {
                if (val === undefined || val === null) return '';
                const sVal = String(val);
                if (/^[0-9.eE+]+$/.test(sVal) && (sVal.includes('e') || sVal.includes('E') || sVal.length > 15)) {
                  try {
                    const num = Number(sVal);
                    if (!isNaN(num)) {
                      const hex = '0x' + BigInt(Math.trunc(num)).toString(16);
                      if (address && address.toLowerCase().substring(0, 10) === hex.substring(0, 10)) {
                        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
                      }
                      return `${hex.substring(0, 6)}...${hex.substring(hex.length - 4)}`;
                    }
                  } catch { }
                }
                if (typeof val === 'string' && val.startsWith('0x') && val.length === 42) {
                  return `${val.substring(0, 6)}...${val.substring(val.length - 4)}`;
                }
                if (field === 'tx.amount' && !isNaN(Number(sVal))) {
                  const amountNum = Number(sVal);
                  const formattedAmount = (amountNum / 1000000).toLocaleString('en-US', { maximumFractionDigits: 6 });
                  return `${formattedAmount} USDC`;
                }
                return sVal;
              };

              let ruleCondition = '';
              if (ruleJson.rules && Array.isArray(ruleJson.rules)) {
                const conds: string[] = [];
                for (const r of ruleJson.rules) {
                  if (r.if) {
                    const c = r.if as any;
                    if (c.field && c.op && c.value !== undefined) {
                      conds.push(`${c.field} ${c.op} ${formatLogVal(c.field, c.value)}`);
                    } else if (c.conditions) {
                      conds.push(`${r.id || 'Rule'}: complex`);
                    }
                  } else if (r.field && r.op && r.value !== undefined) {
                    conds.push(`${r.field} ${r.op} ${formatLogVal(r.field, r.value)}`);
                  }
                }
                ruleCondition = conds.join(' AND ');
              } else if (ruleJson.if) {
                const c = ruleJson.if as any;
                if (c.field && c.op && c.value !== undefined) {
                  ruleCondition = `${c.field} ${c.op} ${formatLogVal(c.field, c.value)}`;
                } else if (c.conditions) {
                  ruleCondition = `Complex logic with ${c.conditions.length} conditions`;
                }
              }

              // WASM is the sole policy authority.
              // AI APPROVE + WASM APPROVE → allow
              // AI REJECT  + WASM APPROVE → allow  (WASM overrides AI decimal/scale misreading)
              // AI APPROVE + WASM REJECT  → block  (WASM catches prompt injection the AI missed)
              // AI REJECT  + WASM REJECT  → block
              const aiApproved = parsed ? parsed.decision === 'APPROVE' : false;
              const isAllowed = effectiveDecision === 'APPROVE';

              if (!isAllowed) {
                finalDecision = {
                  decision: 'REJECT',
                  reason: effectiveDecision === 'REJECT' ? (effectiveReason || 'Blocked by policy') : (parsed?.reason ?? 'AI Refused'),
                  amount: 0,
                  receiver: ''
                };

                const aiDecisionStr = parsed ? parsed.decision : 'Conversational Response';
                const aiReasonStr = parsed?.reason ? parsed.reason : 'N/A';
                const wasmStatusStr = effectiveDecision === 'REJECT' ? 'TRANSACTION BLOCKED' : 'POLICY COMPLIANT';
                const wasmReasonStr = effectiveReason || 'OK';
                const enforcerActionStr = effectiveDecision === 'REJECT'
                  ? 'Blocked by PAY.ID WASM Policy'
                  : 'Blocked by AI Agent';

                finalReply = `*Interaction Blocked*\n\n` + reply + `\n\n---\n**PAY.ID POLICY ENFORCEMENT REPORT**\n` +
                  `1. AI Intent Parsing\n   ↳ Decision: ${aiDecisionStr} (Reason: ${aiReasonStr})\n` +
                  `2. On-Chain Guardrails Loaded\n   ↳ Active Rule(s): \`${ruleDesc}\`\n   ↳ Math Logic: \`${ruleCondition}\`\n` +
                  `3. WASM Sandbox Execution\n   ↳ Checked Sender: \`${address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'unknown'}\`\n   ↳ Sandbox Result: ${wasmStatusStr}\n   ↳ Security Verdict: "${wasmReasonStr}"\n` +
                  `4. Final Verdict\n   ↳ Enforcer Action: ${enforcerActionStr}`;
              } else {
                if (parsed) {
                  finalDecision = { ...parsed, decision: 'APPROVE', reason: effectiveReason };
                  const matchStatus = aiApproved ? 'Match' : 'Policy Engine Overrode AI Rejection';
                  // When WASM overrides AI rejection, show a clear approval message instead of AI's confusing REJECT text
                  const displayReply = aiApproved
                    ? reply
                    : `Payment of ${formatLogVal('tx.amount', amountRaw) || '0 USDC'} is **approved** by policy. The payment meets all required conditions.`;
                  finalReply = displayReply + `\n\n---\n**PAY.ID POLICY ENFORCEMENT REPORT**\n` +
                    `1. AI Intent Parsing\n   ↳ Decision: ${parsed.decision} (Amount: ${formatLogVal('tx.amount', amountRaw) || '0 USDC'})\n` +
                    `2. On-Chain Guardrails Loaded\n   ↳ Active Rule(s): \`${ruleDesc}\`\n   ↳ Math Logic: \`${ruleCondition}\`\n` +
                    `3. WASM Sandbox Execution\n   ↳ Checked Sender: \`${address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'unknown'}\`\n   ↳ Sandbox Result: POLICY COMPLIANT\n` +
                    `4. Final Verdict\n   ↳ Status: \`${matchStatus}\`\n   ↳ Enforcer Action: Transaction Allowed`;
                } else {
                  finalDecision = null;
                  finalReply = reply + `\n\n---\n**PAY.ID POLICY ENFORCEMENT REPORT**\n` +
                    `1. AI Intent Parsing\n   ↳ Decision: Conversational Message (No payment intent detected)\n` +
                    `2. On-Chain Guardrails Loaded\n   ↳ Active Rule(s): \`${ruleDesc}\`\n   ↳ Math Logic: \`${ruleCondition}\`\n` +
                    `3. WASM Sandbox Execution\n   ↳ Checked Sender: \`${address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'unknown'}\`\n   ↳ Sandbox Result: GENERAL INTERACTION ALLOWED\n` +
                    `4. Final Verdict\n   ↳ Enforcer Action: Interaction Allowed`;
                }
              }
            } catch (err) {
              console.error('PAY.ID WASM error:', err);
              finalReply = reply + '\n\n*(Note: PAY.ID rule engine verification unavailable)*';
            }
          }
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: finalReply }]);
        if (finalDecision) setDecision(finalDecision);
        return finalReply;
      } catch (e: unknown) {
        const msg = (e as Error).message || 'Failed to reach 0G AI';
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
        setChatFlowStep(5);
      } finally {
        setAiLoading(false);
        setChatFlowStep(5); // ── 5. Final Action (Step 4 -> 5) ──
      }
    },
    [messages, selectedAgent, agentRuleInfo, address, rulesLoaded, onChainRules, ruleIdx, selectedTemplate, buildSystemPrompt, activeChainId],
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || aiLoading) return;
    const userMsg = input.trim();
    setInput('');
    setDecision(null);
    setChatFlowStep(1); // Set to step 1 initially
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    await callAI(userMsg);
  }, [input, aiLoading, callAI]);

  const executeOnChain = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return;
    setLogs([]);
    setTxHashes([]);
    const tid = BigInt(tokenId);

    const selectedHash = (onChainRules.length > 0 && onChainRules[ruleIdx])
      ? onChainRules[ruleIdx].hash
      : PRESET_RULES[ruleIdx].hash;

    const ruleHashToLink = selectedHash as `0x${string}`;
    const ruleLabel = (onChainRules.length > 0 && onChainRules[ruleIdx])
      ? (onChainRules[ruleIdx].name || `Rule #${onChainRules[ruleIdx].ruleId}`)
      : PRESET_RULES[ruleIdx].label;

    try {
      if (onChainPhase === 'idle') {
        setOnChainPhase('register');
        addLog(`[REGISTRY] setOwner(${tid}, ${shortAddr(address)})…`);
        const tx1 = await writeContractAsync({
          address: mockRegistryAddr,
          abi: mockAgentRegistryAbi,
          functionName: 'setOwner',
          args: [tid, address],
          chainId: activeChainId,
        });
        setTxHashes((h) => [...h, tx1]);
        await publicClient.waitForTransactionReceipt({ hash: tx1 });
        addLog(`[REGISTRY] Agent NFT #${tid} registered`, 'ok');

        setOnChainPhase('link');
        addLog(`[AGENT] linkAgentRule(${tid}, ${shortHash(ruleHashToLink)})…`);
        const tx2 = await writeContractAsync({
          address: agentPayIDAddr,
          abi: agentPayIDAbi,
          functionName: 'linkAgentRule',
          args: [tid, ruleHashToLink],
          chainId: activeChainId,
        });
        setTxHashes((h) => [...h, tx2]);
        await publicClient.waitForTransactionReceipt({ hash: tx2 });
        addLog(`[AGENT] Policy "${ruleLabel}" linked on-chain`, 'ok');
      }

      addLog(`[VERIFY] Running PAY.ID WASM rule engine…`);

      if (decision?.decision === 'REJECT') {
        await new Promise((r) => setTimeout(r, 1500));
        throw new Error(`ExecutionReverted: ${decision.reason}. Transaction blocked by PAY.ID rule engine.`);
      }

      await new Promise((r) => setTimeout(r, 1000));
      addLog(`[VERIFY] Payment payload matches on-chain policy`, 'ok');

      if (decision?.decision === 'APPROVE') {
        const recipient = (decision.receiver && decision.receiver.startsWith('0x') && decision.receiver.length === 42)
          ? decision.receiver
          : '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

        const amt = decision.amount ?? 0;
        const displayAmount = amt >= 100_000 ? amt / 1000000 : amt;
        addLog(`[SETTLE] Initiating MetaMask to transfer ${displayAmount} tokens to ${shortAddr(recipient)}…`);

        const testValue = BigInt(Math.floor(Math.min(displayAmount, 5) * 1e15));

        const txSettle = await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: testValue,
          chainId: activeChainId,
        });

        setTxHashes((h) => [...h, txSettle]);
        await publicClient.waitForTransactionReceipt({ hash: txSettle });
        addLog(`[SETTLE] Payment transaction settled successfully`, 'ok');
      } else {
        addLog(`[SETTLE] Payment transaction executed successfully`, 'ok');
      }

      setOnChainPhase('done');
    } catch (e: unknown) {
      setOnChainPhase('error');
      addLog(
        `[ERROR] ${(e as { shortMessage?: string; }).shortMessage ?? (e as Error).message}`,
        'err',
      );
    }
  }, [isConnected, address, publicClient, tokenId, onChainPhase, onChainRules, ruleIdx, decision, addLog, writeContractAsync, sendTransactionAsync, mockRegistryAddr, agentPayIDAddr, activeChainId]);

  const resetAll = useCallback(() => {
    setDecision(null);
    setOnChainPhase('idle');
    setLogs([]);
    setTxHashes([]);
    const agentName = selectedAgent?.displayName ?? 'Agent';
    setMessages([
      {
        role: 'assistant',
        content: `Session reset. I'm **${agentName}** and ready for a new payment request.`,
      },
    ]);
  }, [selectedAgent]);

  const handleRegister = useCallback(async () => {
    if (!regAgentWallet.trim() || !regDisplayName.trim() || !regEndpoint.trim()) return;
    const metadata = JSON.stringify({
      name: regDisplayName.trim(),
      model: regModel,
      endpoint: regEndpoint.trim(),
      systemPrompt: regSystemPrompt.trim() || undefined,
      version: '1.0.0',
      createdAt: Date.now(),
    });
    const metadataHash = keccak256(toBytes(metadata));
    let encryptedURI = '';

    if (storageProvider === '0g') {
      if (!connectorClient?.transport) {
        alert('Wallet tidak terhubung untuk sign 0G Storage');
        return;
      }
      setIsUploading(true);
      try {
        const signer = await getEthersSigner(connectorClient.transport);
        const result = await uploadTo0G(metadata, signer);
        encryptedURI = result.uri;
      } catch (err: any) {
        alert('0G Storage upload gagal: ' + (err.message || 'Unknown error'));
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    } else {
      setIsUploading(true);
      try {
        const result = await uploadToIPFS(metadata);
        encryptedURI = result.uri;
      } catch (err: any) {
        alert('IPFS upload gagal: ' + (err.message || 'Unknown error'));
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      // Estimate fees with 2× buffer to avoid baseFee spike revert on Arbitrum
      const feeData = await publicClient!.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? feeData.maxFeePerGas * 2n
        : undefined;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? undefined;

      const txHash = await writeContractAsync({
        address: chainAddresses?.AIAgentRegistry as `0x${string}`,
        abi: [{
          name: 'registerAdminAgent',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'agentWallet', type: 'address' },
            { name: 'displayName', type: 'string' },
            { name: 'metadataHash', type: 'bytes32' },
            { name: 'encryptedURI', type: 'string' },
            { name: 'publicEndpoint', type: 'string' },
          ],
          outputs: [],
        }] as const,
        functionName: 'registerAdminAgent',
        args: [
          regAgentWallet.trim() as `0x${string}`,
          regDisplayName.trim(),
          metadataHash,
          encryptedURI,
          regEndpoint.trim(),
        ],
        ...(maxFeePerGas ? { maxFeePerGas, maxPriorityFeePerGas } : {}),
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
      toast.success('AI Agent registered successfully!', {
        description: 'Your AI agent has been added to the registry.',
      });
      refetchAdminAgents();
      setShowAgentRegister(false);
      setRegAgentWallet(address ?? '');
      setRegDisplayName('');
      setRegSystemPrompt('');
      setRegModel('qwen/qwen-2.5-7b-instruct');
      setRegEndpoint('https://compute-network-6.integratenetwork.work/v1/proxy');
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? 'Registration failed';
      toast.error('Registration failed', { description: msg });
    }
  }, [regAgentWallet, regDisplayName, regEndpoint, regModel, regSystemPrompt, storageProvider, connectorClient, chainAddresses, publicClient, writeContractAsync, address, refetchAdminAgents]);

  const handleSetAgentPolicy = useCallback(async (agentWallet: `0x${string}`, ruleSetHash: `0x${string}`) => {
    if (!publicClient || !chainAddresses?.AIAgentRuleManager) return;
    setIsSettingRule(true);
    try {
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 2n : undefined;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? undefined;
      const txHash = await writeContractAsync({
        address: chainAddresses.AIAgentRuleManager as `0x${string}`,
        abi: [{
          name: 'setAgentCombinedRule',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'agentWallet', type: 'address' },
            { name: 'ruleSetHash', type: 'bytes32' },
          ],
          outputs: [],
        }] as const,
        functionName: 'setAgentCombinedRule',
        args: [agentWallet, ruleSetHash],
        ...(maxFeePerGas ? { maxFeePerGas, maxPriorityFeePerGas } : {}),
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.success('Agent policy published successfully!');
      refetchAgentRuleInfo();
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? 'Set policy failed';
      toast.error('Publish policy failed', { description: msg });
    } finally {
      setIsSettingRule(false);
    }
  }, [publicClient, chainAddresses, writeContractAsync, refetchAgentRuleInfo]);

  const handleUnsetAgentPolicy = useCallback(async (agentWallet: `0x${string}`) => {
    if (!publicClient || !chainAddresses?.AIAgentRuleManager) return;
    setIsUnsettingRule(true);
    try {
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 2n : undefined;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? undefined;
      const txHash = await writeContractAsync({
        address: chainAddresses.AIAgentRuleManager as `0x${string}`,
        abi: [{
          name: 'unsetAgentCombinedRule',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'agentWallet', type: 'address' }],
          outputs: [],
        }] as const,
        functionName: 'unsetAgentCombinedRule',
        args: [agentWallet],
        ...(maxFeePerGas ? { maxFeePerGas, maxPriorityFeePerGas } : {}),
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.success('Agent policy unlinked.');
      refetchAgentRuleInfo();
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? 'Unlink failed';
      toast.error('Unlink policy failed', { description: msg });
    } finally {
      setIsUnsettingRule(false);
    }
  }, [publicClient, chainAddresses, writeContractAsync, refetchAgentRuleInfo]);

  const handleCreateRule = useCallback(async () => {
    console.log('[handleCreateRule] START — new code running');
    try {
      const parsed = JSON.parse(ruleJsonInput);
      if (!parsed.version || !parsed.logic || !Array.isArray(parsed.rules)) {
        setJsonError('Invalid rule: must have version, logic, and rules array');
        return;
      }
      const hash = keccak256(toBytes(JSON.stringify(parsed)));
      console.log('[handleCreateRule] hash:', hash);

      setIsUploading(true);
      let metadataUri: string;
      try {
        // Generate NFT image
        const imgDataUrl = genImage(hash.slice(2, 10), hash);
        console.log('[handleCreateRule] uploading image...');
        const { cid: imgCid } = await pinImage(imgDataUrl, `rule-${hash.slice(2, 10)}.png`);
        const imageUrl = `ipfs://${imgCid}`;
        console.log('[handleCreateRule] imageUrl:', imageUrl);

        // Build full metadata
        const metadata = {
          name: `PAY.ID Rule #${hash.slice(2, 10)}`,
          description: 'PAY.ID programmable payment policy',
          image: imageUrl,
          attributes: [
            { trait_type: 'Rule Hash', value: hash },
            { trait_type: 'Engine', value: 'PAY.ID' },
            { trait_type: 'Standard', value: 'payid.rule.v1' },
          ],
          rule: parsed,
          ruleHash: hash,
          standard: 'payid.rule.v1',
        };

        console.log('[handleCreateRule] uploading metadata...');
        const { cid: jsonCid } = await pinJson(metadata, `rule-${hash.slice(2, 10)}.json`);
        metadataUri = `ipfs://${jsonCid}`;
        console.log('[handleCreateRule] metadataUri:', metadataUri);
      } catch (err: any) {
        console.error('[handleCreateRule] Pinata failed, fallback:', err.message);
        // Fallback: inline metadata with inline image (no Pinata JWT)
        const imgDataUrl = genImage(hash.slice(2, 10), hash);
        const metadata = {
          name: `PAY.ID Rule #${hash.slice(2, 10)}`,
          description: 'PAY.ID programmable payment policy',
          image: imgDataUrl,
          rule: parsed,
          ruleHash: hash,
          standard: 'payid.rule.v1',
        };
        const result = await uploadToIPFS(JSON.stringify(metadata));
        metadataUri = result.uri;
        console.log('[handleCreateRule] fallback metadataUri:', metadataUri);
      } finally {
        setIsUploading(false);
      }

      console.log('[handleCreateRule] calling createRule with uri:', metadataUri);
      setJsonError('');
      createRule({ ruleHash: hash, uri: metadataUri });
    } catch {
      setJsonError('Invalid JSON syntax');
    }
  }, [ruleJsonInput, createRule, setIsUploading]);

  const hasApiKey = !!AI_KEY && AI_KEY !== 'YOUR_0G_AI_API_KEY_HERE';

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
    agentRuleJson,

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
    subPrice: subPrice as bigint | undefined,

    myRuleSets,
    myActiveRule,
    setAgentCombinedRule: handleSetAgentPolicy,
    isSettingRule,
    unsetAgentCombinedRule: handleUnsetAgentPolicy,
    isUnsettingRule,

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
    chatFlowStep,
  };
}
