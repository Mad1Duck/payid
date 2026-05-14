import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Star,
  Clock,
  Shield,
  Zap,
  Search,
  Filter,
  Check,
  ArrowLeft,
  Code2,
  Users,
  Calendar,
  Cpu,
  Globe,
  ChevronRight,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { useV4Palette } from './theme'

interface RuleTemplate {
  id: string
  name: string
  description: string
  longDescription: string
  category: string
  price: string
  currency: string
  rating: number
  reviews: number
  creator: string
  creatorReputation: number
  tags: string[]
  icon: typeof Shield
  color: string
  version: string
  createdAt: string
  updatedAt: string
  usageCount: number
  compatibility: string[]
  ruleJson: object
}

const TEMPLATES: RuleTemplate[] = [
  {
    id: 'freelancer-safe',
    name: 'Freelancer Safe Pay',
    description: 'Milestone-based escrow with VRAN arbiter. Release funds only after delivery confirmation.',
    longDescription:
      'Protect both client and freelancer with milestone-based payments. Funds are locked in escrow and released only when the freelancer submits deliverables and the VRAN arbiter confirms quality. Includes dispute resolution and automatic refund if deadlines pass. Ideal for Upwork-style freelance platforms running on-chain.',
    category: 'Business',
    price: '0.005',
    currency: 'ETH',
    rating: 4.8,
    reviews: 124,
    creator: '0x7aB...3F9e',
    creatorReputation: 920,
    tags: ['escrow', 'milestone', 'freelance', 'vran'],
    icon: Shield,
    color: '#00D084',
    version: '1.2.0',
    createdAt: '2025-11-14',
    updatedAt: '2026-03-22',
    usageCount: 2847,
    compatibility: ['PayWithPayID', 'EscrowMilestone', 'VRAN'],
    ruleJson: {
      version: 'v1',
      logic: 'AND',
      rules: [
        {
          id: 'milestone_delivery',
          if: { field: 'intent.type', op: '==', value: 'ESCROW_RELEASE' },
          message: 'Release requires arbiter confirmation',
        },
        {
          id: 'deadline_check',
          if: { field: 'env.timestamp', op: '<=', value: '$escrow.deadline' },
          message: 'Escrow deadline has passed',
        },
      ],
    },
  },
  {
    id: 'parental-control',
    name: 'Parental Control',
    description: 'Daily spending limits, time-based restrictions, and whitelist-only recipients for family wallets.',
    longDescription:
      'Set up guardrails for family wallets with granular controls. Define daily spending caps, restrict transactions to school hours only, and maintain a whitelist of approved recipients. All rules are enforced off-chain via WASM and verified on-chain with Decision Proofs. Perfect for crypto-native families.',
    category: 'Family',
    price: '0.002',
    currency: 'ETH',
    rating: 4.6,
    reviews: 89,
    creator: '0xFam...a1B2',
    creatorReputation: 780,
    tags: ['limits', 'time', 'whitelist', 'family'],
    icon: Clock,
    color: '#0EA5E9',
    version: '2.0.1',
    createdAt: '2025-09-03',
    updatedAt: '2026-01-10',
    usageCount: 1523,
    compatibility: ['PayWithPayID', 'RuleAuthority'],
    ruleJson: {
      version: 'v1',
      logic: 'AND',
      rules: [
        {
          id: 'daily_limit',
          if: { field: 'state.spentToday', op: '<=', value: '$config.dailyLimit' },
          message: 'Daily limit exceeded: {state.spentToday}/{config.dailyLimit}',
        },
        {
          id: 'whitelist_only',
          if: { field: 'tx.receiver', op: 'in', value: '$config.whitelist' },
          message: 'Recipient not in family whitelist',
        },
        {
          id: 'school_hours',
          if: { field: 'env.timestamp|hour', op: 'between', value: [7, 18] },
          message: 'Transactions locked outside 07:00-18:00',
        },
      ],
    },
  },
  {
    id: 'business-hours',
    name: 'Business Hours Only',
    description: 'Restrict transactions to business hours (9-17) and weekdays only with auto-reject outside hours.',
    longDescription:
      'Compliance-first template for corporate treasuries. Ensures all outbound payments occur only during business hours (09:00-17:00 UTC) and on weekdays. Integrates with the env.timestamp context namespace. Supports optional multi-sig threshold for amounts above a configurable limit.',
    category: 'Compliance',
    price: '0.001',
    currency: 'ETH',
    rating: 4.9,
    reviews: 256,
    creator: '0xCom...d4E5',
    creatorReputation: 945,
    tags: ['compliance', 'time', 'auto', 'corporate'],
    icon: Zap,
    color: '#F59E0B',
    version: '1.0.4',
    createdAt: '2025-06-20',
    updatedAt: '2026-02-15',
    usageCount: 5120,
    compatibility: ['PayWithPayID', 'CombinedRuleStorage'],
    ruleJson: {
      version: 'v1',
      logic: 'AND',
      rules: [
        {
          id: 'business_hours',
          if: { field: 'env.timestamp|hour', op: 'between', value: [9, 17] },
          message: 'Outside business hours (09:00-17:00 UTC)',
        },
        {
          id: 'weekdays',
          if: { field: 'env.timestamp|day', op: 'in', value: [1, 2, 3, 4, 5] },
          message: 'Weekend transactions blocked',
        },
      ],
    },
  },
  {
    id: 'dao-payroll',
    name: 'DAO Payroll Batch',
    description: 'Batch payment template for DAO payroll. Distribute to multiple recipients in one transaction.',
    longDescription:
      'Streamline DAO contributor payments with a single batch transaction. Pre-approves a list of recipient addresses and amounts, validates the total against treasury balance, and generates one Decision Proof for the entire batch. Reduces gas costs by up to 70% compared to individual transfers.',
    category: 'DAO',
    price: '0.003',
    currency: 'ETH',
    rating: 4.7,
    reviews: 67,
    creator: '0xDA0...f6G7',
    creatorReputation: 880,
    tags: ['batch', 'payroll', 'dao', 'treasury'],
    icon: ShoppingBag,
    color: '#8B5CF6',
    version: '1.1.0',
    createdAt: '2025-12-01',
    updatedAt: '2026-04-01',
    usageCount: 1890,
    compatibility: ['PayWithPayIDBatch', 'RuleAuthority'],
    ruleJson: {
      version: 'v1',
      logic: 'AND',
      rules: [
        {
          id: 'batch_total',
          if: { field: 'tx.amount', op: '<=', value: '$config.batchLimit' },
          message: 'Batch total exceeds treasury limit',
        },
        {
          id: 'recipient_list',
          if: { field: 'tx.receiver', op: 'in', value: '$config.payrollList' },
          message: 'Receiver not in approved payroll list',
        },
      ],
    },
  },
  {
    id: 'high-value-guard',
    name: 'High Value Guard',
    description: 'Additional attestation requirements for transactions above threshold. KYC + risk check mandatory.',
    longDescription:
      'Adds a second layer of security for high-value transfers. Any transaction above the configured threshold requires a valid EAS attestation proving KYC level and a risk score below the maximum. Integrates with AttestationVerifier and external oracle data. Recommended for exchanges and OTC desks.',
    category: 'Security',
    price: '0.004',
    currency: 'ETH',
    rating: 4.5,
    reviews: 45,
    creator: '0xSec...h8I9',
    creatorReputation: 890,
    tags: ['security', 'kyc', 'high-value', 'attestation'],
    icon: Star,
    color: '#EF4444',
    version: '2.1.0',
    createdAt: '2025-08-12',
    updatedAt: '2026-03-01',
    usageCount: 742,
    compatibility: ['PayWithPayID', 'AttestationVerifier', 'MockEthUsdOracle'],
    ruleJson: {
      version: 'v1',
      logic: 'AND',
      rules: [
        {
          id: 'kyc_level',
          if: { field: 'oracle.kycLevel', op: '>=', value: '$config.minKycLevel' },
          message: 'KYC level insufficient for high-value tx',
        },
        {
          id: 'risk_score',
          if: { field: 'risk.score', op: '<=', value: '$config.maxRiskScore' },
          message: 'Risk score too high: {risk.score}',
        },
        {
          id: 'attestation_exists',
          if: { field: 'oracle.attestationUID', op: 'exists' },
          message: 'EAS attestation required for this amount',
        },
      ],
    },
  },
  {
    id: 'recurring-bills',
    name: 'Recurring Bills',
    description: 'Auto-pay template for subscriptions. Set max amount, frequency, and recipient whitelist.',
    longDescription:
      'Automate recurring payments without giving unlimited approval. Define a maximum amount per charge, a charging period (daily, weekly, monthly), and a whitelist of allowed recipients. The merchant triggers charge() with a valid Decision Proof, but cannot exceed the pre-approved limit. Revocable anytime.',
    category: 'Personal',
    price: '0.0015',
    currency: 'ETH',
    rating: 4.4,
    reviews: 112,
    creator: '0xBil...j0K1',
    creatorReputation: 710,
    tags: ['recurring', 'subscription', 'auto', 'budget'],
    icon: Clock,
    color: '#EC4899',
    version: '1.3.2',
    createdAt: '2025-10-05',
    updatedAt: '2026-04-10',
    usageCount: 3210,
    compatibility: ['RecurringPayments', 'PayWithPayID'],
    ruleJson: {
      version: 'v1',
      logic: 'AND',
      rules: [
        {
          id: 'max_amount',
          if: { field: 'tx.amount', op: '<=', value: '$config.maxAmount' },
          message: 'Charge exceeds approved max amount',
        },
        {
          id: 'period_elapsed',
          if: { field: 'env.timestamp', op: '>=', value: '$config.nextChargeTime' },
          message: 'Too early for next charge',
        },
        {
          id: 'whitelist',
          if: { field: 'tx.receiver', op: 'in', value: '$config.allowedReceivers' },
          message: 'Receiver not in subscription whitelist',
        },
      ],
    },
  },
]

const CATEGORIES = ['All', 'Business', 'Family', 'Compliance', 'DAO', 'Security', 'Personal']

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function reputationBadge(score: number) {
  if (score >= 800) return { label: 'Trusted', color: '#00D084' }
  if (score >= 500) return { label: 'Established', color: '#0EA5E9' }
  return { label: 'New', color: '#64748B' }
}

export default function PolicyMarketplace() {
  const p = useV4Palette()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [purchased, setPurchased] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<RuleTemplate | null>(null)
  const [copied, setCopied] = useState(false)

  const filtered = TEMPLATES.filter((t) => {
    const q = search.toLowerCase()
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const handlePurchase = (id: string) => {
    setPurchased((prev) => new Set(prev).add(id))
  }

  const copyJson = (json: object) => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Policy Marketplace</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Browse and subscribe to proven rule templates.
        </p>
      </motion.div>

      {/* Search & Filter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 transition-colors text-sm`}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                activeCategory === cat
                  ? 'bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20'
                  : `${p.cardBorder} ${p.textMuted} hover:bg-black/5`
              }`}
              style={activeCategory === cat ? undefined : { backgroundColor: p.cardBg }}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((template, i) => {
            const Icon = template.icon
            const isPurchased = purchased.has(template.id)
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(template)}
                className={`rounded-2xl p-5 border ${p.cardBorder} flex flex-col cursor-pointer hover:border-[#00D084]/30 transition-colors`}
                style={{ backgroundColor: p.cardBg }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${template.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: template.color }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                    <span className={`text-xs ${p.textMain} font-medium`}>{template.rating}</span>
                    <span className={`text-xs ${p.textMuted}`}>({template.reviews})</span>
                  </div>
                </div>

                <h3 className={`text-sm font-semibold ${p.textMain} mb-1`}>{template.name}</h3>
                <p className={`text-xs ${p.textMuted} mb-3 line-clamp-2`}>{template.description}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${p.dark ? 'bg-white/5' : 'bg-black/5'} ${p.textMuted}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-dashed border-[#E5E7EB]/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs ${p.textMuted}`}>Price</span>
                      <div className={`text-sm font-bold font-mono ${p.textMain}`}>
                        {template.price} {template.currency}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePurchase(template.id)
                      }}
                      disabled={isPurchased}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isPurchased
                          ? 'bg-[#00D084]/10 text-[#00D084]'
                          : 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
                      }`}
                    >
                      {isPurchased ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" /> Subscribed
                        </span>
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
          <p className={`text-sm ${p.textMuted}`}>No templates match your search.</p>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
            onClick={() => setSelected(null)}
          >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-2xl rounded-2xl border ${p.cardBorder} shadow-2xl mt-8 mb-8`}
              style={{ backgroundColor: p.cardBg }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-dashed border-[#E5E7EB]/30">
                <div className="flex items-start justify-between mb-4">
                  <button
                    onClick={() => setSelected(null)}
                    className={`flex items-center gap-1 text-xs font-medium ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer`}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div
                    className="text-[10px] px-2 py-1 rounded-full font-medium"
                    style={{
                      background: `${selected.color}15`,
                      color: selected.color,
                    }}
                  >
                    {selected.category}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${selected.color}15` }}
                  >
                    <selected.icon className="w-7 h-7" style={{ color: selected.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className={`text-xl font-bold ${p.textMain}`}>{selected.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                        <span className={`text-sm ${p.textMain} font-medium`}>{selected.rating}</span>
                        <span className={`text-xs ${p.textMuted}`}>({selected.reviews} reviews)</span>
                      </div>
                      <span className={`text-xs ${p.textMuted}`}>v{selected.version}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className={`text-sm font-semibold ${p.textMain} mb-2`}>About</h3>
                  <p className={`text-sm ${p.textMuted} leading-relaxed`}>{selected.longDescription}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Users</span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${p.textMain}`}>{selected.usageCount.toLocaleString()}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Created</span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${p.textMain}`}>{selected.createdAt}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Updated</span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${p.textMain}`}>{selected.updatedAt}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className={`text-[10px] uppercase tracking-wide ${p.textMuted} font-medium`}>Creator</span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${p.textMain}`}>{shortAddr(selected.creator)}</span>
                  </div>
                </div>

                {/* Creator Reputation */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${p.cardBorder} ${p.dark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: `${reputationBadge(selected.creatorReputation).color}15`,
                      color: reputationBadge(selected.creatorReputation).color,
                    }}
                  >
                    {Math.floor(selected.creatorReputation / 100)}
                  </div>
                  <div>
                    <p className={`text-xs ${p.textMuted}`}>
                      Creator reputation:{' '}
                      <span className={`font-medium ${p.textMain}`}>{selected.creatorReputation}</span>
                    </p>
                    <p className="text-[10px]" style={{ color: reputationBadge(selected.creatorReputation).color }}>
                      {reputationBadge(selected.creatorReputation).label}
                    </p>
                  </div>
                </div>

                {/* Compatibility */}
                <div>
                  <h3 className={`text-sm font-semibold ${p.textMain} mb-2`}>Compatibility</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.compatibility.map((c) => (
                      <span
                        key={c}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${p.cardBorder} ${p.textMuted}`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rule JSON */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#64748B]" />
                      <h3 className={`text-sm font-semibold ${p.textMain}`}>Rule Definition</h3>
                    </div>
                    <button
                      onClick={() => copyJson(selected.ruleJson)}
                      className={`flex items-center gap-1 text-xs font-medium ${p.textMuted} hover:${p.textMain} transition-colors cursor-pointer`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                  <pre
                    className={`p-4 rounded-xl text-xs font-mono overflow-x-auto border ${p.cardBorder} ${p.dark ? 'bg-[#0B0F1A]' : 'bg-[#F1F5F9]'}`}
                  >
                    <code className={p.textMain}>{JSON.stringify(selected.ruleJson, null, 2)}</code>
                  </pre>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-3 py-1.5 rounded-full border ${p.cardBorder} ${p.textMuted}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer — CTA */}
              <div className="p-6 border-t border-dashed border-[#E5E7EB]/30">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className={`text-xs ${p.textMuted}`}>One-time purchase</span>
                    <div className={`text-2xl font-bold font-mono ${p.textMain}`}>
                      {selected.price} {selected.currency}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase(selected.id)}
                    disabled={purchased.has(selected.id)}
                    className={`px-8 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                      purchased.has(selected.id)
                        ? 'bg-[#00D084]/10 text-[#00D084]'
                        : 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90'
                    }`}
                  >
                    {purchased.has(selected.id) ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Already Subscribed
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Subscribe Now <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
