import {
  Shield,
  Clock,
  Zap,
  ShoppingBag,
  Star,
} from 'lucide-react'

export interface RuleTemplate {
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

export const CATEGORIES = ['All', 'Business', 'Family', 'Compliance', 'DAO', 'Security', 'Personal']

export const TEMPLATES: RuleTemplate[] = [
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
