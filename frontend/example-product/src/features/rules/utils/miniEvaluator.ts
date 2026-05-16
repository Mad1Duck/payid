// ── Mini rule evaluator (no WASM, JS-only for demo) ──

export interface MiniCond {
  field: string
  op: string
  value: unknown
}

export interface MiniRule {
  if?: MiniCond
  conditions?: Array<MiniCond>
  logic?: string
  message?: string
}

export interface DemoCtx {
  tx: { sender: string; receiver: string; asset: string; amount: number; chainId: number }
  payId: { id: string; owner: string }
  intent: { type: string; expiresAt: number; nonce: string; issuer: string }
  env: { timestamp: number }
  oracle: { txValueUsd?: number; kycLevel?: string; country?: string }
  risk: { score?: number }
  state: { spentToday?: number; dailyLimit?: number; period?: string }
}

export function resolveField(field: string, ctx: DemoCtx): unknown {
  const [fieldPath, ...transforms] = field.split('|')
  let val: unknown = undefined

  if (fieldPath === 'tx.amount') val = ctx.tx.amount
  else if (fieldPath === 'tx.sender') val = ctx.tx.sender
  else if (fieldPath === 'tx.receiver') val = ctx.tx.receiver
  else if (fieldPath === 'tx.asset') val = ctx.tx.asset
  else if (fieldPath === 'tx.chainId') val = ctx.tx.chainId
  else if (fieldPath === 'payId.id') val = ctx.payId.id
  else if (fieldPath === 'payId.owner') val = ctx.payId.owner
  else if (fieldPath === 'intent.type') val = ctx.intent.type
  else if (fieldPath === 'intent.expiresAt') val = ctx.intent.expiresAt
  else if (fieldPath === 'intent.nonce') val = ctx.intent.nonce
  else if (fieldPath === 'intent.issuer') val = ctx.intent.issuer
  else if (fieldPath === 'env.timestamp') val = ctx.env.timestamp
  else if (fieldPath === 'oracle.txValueUsd') val = ctx.oracle.txValueUsd
  else if (fieldPath === 'oracle.kycLevel') val = ctx.oracle.kycLevel
  else if (fieldPath === 'oracle.country') val = ctx.oracle.country
  else if (fieldPath === 'risk.score') val = ctx.risk.score
  else if (fieldPath === 'state.spentToday') val = ctx.state.spentToday
  else if (fieldPath === 'state.dailyLimit') val = ctx.state.dailyLimit
  else if (fieldPath === 'state.period') val = ctx.state.period

  for (const t of transforms) {
    if (t === 'hour') val = new Date(Number(val) * 1000).getHours()
    else if (t === 'day') {
      const d = new Date(Number(val) * 1000).getDay()
      val = d === 0 ? 7 : d
    } else if (t === 'date') val = new Date(Number(val) * 1000).getDate()
    else if (t === 'month') val = new Date(Number(val) * 1000).getMonth() + 1
    else if (t === 'abs') val = Math.abs(Number(val))
    else if (t.startsWith('div:')) val = Number(val) / Number(t.slice(4))
    else if (t.startsWith('mod:')) val = Number(val) % Number(t.slice(4))
    else if (t === 'lower') val = String(val).toLowerCase()
    else if (t === 'upper') val = String(val).toUpperCase()
    else if (t === 'len') val = String(val).length
  }
  return val
}

export function evalCond(c: MiniCond, ctx: DemoCtx): boolean {
  const lhs = resolveField(c.field, ctx)
  const n = Number(lhs)
  const v = c.value
  switch (c.op) {
    case '>=':
      return n >= Number(v)
    case '<=':
      return n <= Number(v)
    case '>':
      return n > Number(v)
    case '<':
      return n < Number(v)
    case '==':
      return lhs == v
    case '!=':
      return lhs != v
    case 'in':
      return (
        Array.isArray(v) &&
        (v as Array<unknown>).some((x) => Number(x) === n || x === lhs)
      )
    case 'not_in':
      return (
        Array.isArray(v) &&
        !(v as Array<unknown>).some((x) => Number(x) === n || x === lhs)
      )
    case 'between': {
      const [lo, hi] = v as [number, number]
      return n >= lo && n <= hi
    }
    case 'not_between': {
      const [lo, hi] = v as [number, number]
      return !(n >= lo && n <= hi)
    }
    case 'exists':
      return lhs !== undefined && lhs !== null
    case 'not_exists':
      return lhs === undefined || lhs === null
    default:
      return true
  }
}

export function evalRule(rule: MiniRule, ctx: DemoCtx): { pass: boolean; reason: string } {
  if (rule.if) {
    const pass = evalCond(rule.if, ctx)
    return {
      pass,
      reason: pass
        ? `${rule.if.field} ${rule.if.op} ${JSON.stringify(rule.if.value)} ✓`
        : (rule.message ?? `${rule.if.field} ${rule.if.op} ${JSON.stringify(rule.if.value)} ✗`),
    }
  }
  if (rule.conditions?.length) {
    const logic = rule.logic || 'AND'
    const results = rule.conditions.map((c) => evalCond(c, ctx))
    const pass =
      logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
    return {
      pass,
      reason: pass
        ? 'Conditions passed'
        : (rule.message ?? 'Conditions failed'),
    }
  }
  return { pass: true, reason: 'No conditions' }
}
