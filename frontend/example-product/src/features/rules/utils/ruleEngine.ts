import type { Cond } from '../types'

const NO_VAL = new Set([
  'exists',
  'not_exists',
  'empty',
  'not_empty',
  'true',
  'false',
])
const ARR_OPS = new Set([
  'in',
  'not_in',
  'between',
  'not_between',
  'mod_eq',
  'mod_ne',
])

export function makeBlank(): Cond {
  return {
    field: 'tx.amount',
    transform: '',
    transformArg: '',
    op: '<=',
    value: '',
  }
}

export function buildFieldExpr(c: Cond) {
  if (!c.transform) return c.field
  return `${c.field}|${c.transform}${c.transformArg ? ':' + c.transformArg : ''}`
}

export function parseVal(op: string, v: string): unknown {
  if (NO_VAL.has(op)) return undefined
  if (ARR_OPS.has(op)) {
    try {
      return JSON.parse(v)
    } catch {
      return v
    }
  }
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  if (!Number.isNaN(n) && v !== '') return n
  return v
}

export function buildJson(
  conds: Array<Cond>,
  format: 'simple' | 'multi' | 'nested',
  logic: 'AND' | 'OR',
  id: string,
  comment: string,
  message: string,
) {
  const base: Record<string, unknown> = { id: id || 'rule_001' }
  if (comment) base._comment = comment
  if (format === 'simple') {
    const c = conds[0]
    if (!c) return base
    return {
      ...base,
      if: {
        field: buildFieldExpr(c),
        op: c.op,
        value: parseVal(c.op, c.value),
      },
      message,
    }
  }
  if (format === 'multi') {
    return {
      ...base,
      logic,
      conditions: conds
        .filter((c) => c.field && c.op)
        .map((c) => ({
          field: buildFieldExpr(c),
          op: c.op,
          value: parseVal(c.op, c.value),
        })),
      message,
    }
  }
  return { ...base, logic, rules: [], message }
}

export function canonicalize(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(canonicalize)
  if (o && typeof o === 'object')
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize((o as Record<string, unknown>)[k])
        return acc
      }, {})
  return o
}

export function plain(c: Cond): string {
  const expr = buildFieldExpr(c)
  if (NO_VAL.has(c.op)) return `${expr} ${c.op}`
  return `${expr} ${c.op} ${c.value}`
}
