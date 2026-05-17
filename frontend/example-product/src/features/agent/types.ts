export interface ChatMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiDecision {
  decision: 'APPROVE' | 'REJECT'
  reason: string
  amount?: number
  receiver?: string
}

export interface OnChainRule {
  ruleId: bigint
  tokenId?: bigint
  hash: string
  uri: string
  name?: string
  description?: string
  ruleJson?: Record<string, unknown>
  active: boolean
}

export type OnChainPhase = 'idle' | 'register' | 'link' | 'done' | 'error'

export interface LogLine {
  time: string
  level: 'info' | 'ok' | 'err'
  msg: string
}
