import { keccak256, toBytes } from 'viem'

export const PRESET_RULES = [
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

export const PRESET_TEMPLATES = [
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

export const BASE_SYSTEM_PROMPT = `You are an AI payment agent integrated with PAY.ID — a programmable payment policy system on 0G Newton blockchain.

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
