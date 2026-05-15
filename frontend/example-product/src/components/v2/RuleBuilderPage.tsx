import { useState, useCallback, useMemo, useEffect } from 'react'
import { Plus, Trash2, Terminal, Hash } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { useMyRules, useActiveCombinedRule, useCreateRule } from 'payid-react'
import { keccak256, stringToBytes } from 'viem'

// Rule Engine Constants
const CONTEXT_NAMESPACES = [
  'tx.amount',
  'tx.token',
  'tx.sender',
  'tx.receiver',
  'tx.data',
  'payId.owner',
  'payId.ruleHash',
  'intent.amount',
  'intent.currency',
  'intent.recipient',
  'env.chainId',
  'env.timestamp',
  'oracle.ethUsd',
  'risk.score',
  'risk.category',
  'state.spentToday',
  'state.dailyLimit',
]

const OPERATORS = [
  { label: '>=', value: '>=' },
  { label: '<=', value: '<=' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '==', value: '==' },
  { label: '!=', value: '!=' },
  { label: 'in (set)', value: 'in' },
  { label: 'not_in (set)', value: 'not_in' },
  { label: 'between (range)', value: 'between' },
  { label: 'not_between (range)', value: 'not_between' },
  { label: 'mod_eq', value: 'mod_eq' },
  { label: 'mod_ne', value: 'mod_ne' },
  { label: 'contains', value: 'contains' },
  { label: 'not_contains', value: 'not_contains' },
  { label: 'starts_with', value: 'starts_with' },
  { label: 'ends_with', value: 'ends_with' },
  { label: 'exists', value: 'exists' },
  { label: 'not_exists', value: 'not_exists' },
  { label: 'regex', value: 'regex' },
  { label: 'not_regex', value: 'not_regex' },
]

const ARRAY_OPS = new Set(['in', 'not_in', 'between', 'not_between', 'mod_eq', 'mod_ne'])
const NO_VALUE_OPS = new Set(['exists', 'not_exists'])

type RuleFormat = 'simple' | 'multi' | 'nested'

interface Condition {
  field: string
  transform: string
  transformArg: string
  op: string
  value: string
}

interface RuleDraft {
  id: string
  comment: string
  format: RuleFormat
  logic: 'AND' | 'OR'
  conditions: Condition[]
  message: string
}

function buildFieldExpr(field: string, transform: string, transformArg: string): string {
  if (!transform) return field
  return `${field}|${transform}${transformArg ? ':' + transformArg : ''}`
}

function parseValue(value: string, op: string): any {
  if (NO_VALUE_OPS.has(op)) return undefined
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (ARRAY_OPS.has(op)) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed.split(',').map((s) => s.trim())
    }
  }
  if (trimmed.startsWith('$')) return trimmed
  if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed)
  return trimmed
}

function draftToJson(draft: RuleDraft): any {
  const base: any = { id: draft.id }
  if (draft.comment) base._comment = draft.comment

  if (draft.format === 'simple') {
    const c = draft.conditions[0]
    if (!c) return base
    return {
      ...base,
      if: {
        field: buildFieldExpr(c.field, c.transform, c.transformArg),
        op: c.op,
        value: parseValue(c.value, c.op),
      },
      message: draft.message,
    }
  }

  if (draft.format === 'multi') {
    return {
      ...base,
      logic: draft.logic,
      conditions: draft.conditions
        .filter((c) => c.field && c.op)
        .map((c) => ({
          field: buildFieldExpr(c.field, c.transform, c.transformArg),
          op: c.op,
          value: parseValue(c.value, c.op),
        })),
      message: draft.message,
    }
  }

  return {
    ...base,
    logic: draft.logic,
    rules: [],
    message: draft.message,
  }
}

function canonicalizeKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(canonicalizeKeys)
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = canonicalizeKeys(obj[k])
        return acc
      }, {} as any)
  }
  return obj
}

function makeCondition(): Condition {
  return { field: 'tx.amount', transform: '', transformArg: '', op: '>=', value: '' }
}

function makeDraft(): RuleDraft {
  return {
    id: 'rule_001',
    comment: '',
    format: 'simple',
    logic: 'AND',
    conditions: [makeCondition()],
    message: 'Transaction rejected by policy',
  }
}

export function RuleBuilderPage() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const { data: myRules = [], refetch } = useMyRules()
  const { data: activeCombined } = useActiveCombinedRule(address)
  const { createRule, isPending: isCreating, isSuccess: createSuccess, error: createError } = useCreateRule()

  const [draft, setDraft] = useState<RuleDraft>(makeDraft)
  const [showJson, setShowJson] = useState(true)

  const activeCount = myRules.filter((r) => r.active).length

  const ruleJson = useMemo(() => {
    const root = draftToJson(draft)
    const canonical = canonicalizeKeys(root)
    return JSON.stringify(canonical, null, 2)
  }, [draft])

  const ruleHash = useMemo(() => {
    return keccak256(stringToBytes(ruleJson))
  }, [ruleJson])

  const updateCondition = useCallback((i: number, patch: Partial<Condition>) => {
    setDraft((prev) => {
      const next = { ...prev, conditions: [...prev.conditions] }
      next.conditions[i] = { ...next.conditions[i], ...patch }
      return next
    })
  }, [])

  const addCondition = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      conditions: [...prev.conditions, makeCondition()],
    }))
  }, [])

  const removeCondition = useCallback((i: number) => {
    setDraft((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, idx) => idx !== i),
    }))
  }, [])

  const handleMint = async () => {
    if (!isConnected) return
    try {
      const tokenURI = `ipfs://mock-${ruleHash.slice(0, 10)}`
      createRule({ ruleHash: ruleHash as `0x${string}`, uri: tokenURI })
    } catch (e: unknown) {
      console.error('Mint failed:', e)
    }
  }

  useEffect(() => {
    if (createSuccess) {
      queryClient.invalidateQueries({ queryKey: [{ entity: 'rule' }] })
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      void refetch()
    }
  }, [createSuccess, refetch, queryClient])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Rule Builder
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Create programmable payment policies
          </p>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {myRules.length}
          </p>
          <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Total
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--accent-blue)' }}>
            {activeCount}
          </p>
          <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Active
          </p>
        </div>
        <div
          className="card p-4 text-center"
          style={{
            background: activeCombined ? 'var(--accent-blue-alpha)' : 'var(--bg-elevated)',
            border: activeCombined ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: activeCombined ? 'var(--accent-blue)' : 'var(--text-muted)' }}
          >
            {activeCombined ? 'On' : 'Off'}
          </p>
          <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Policy
          </p>
        </div>
      </div>

      {/* Rule Editor */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal style={{ width: 16, height: 16 ,color: 'var(--text-secondary)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Edit Rule
            </h3>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {draft.format.toUpperCase()}
          </span>
        </div>

        {/* ID + Comment */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              ID
            </label>
            <input
              value={draft.id}
              onChange={(e) => setDraft((p) => ({ ...p, id: e.target.value }))}
              className="input"
              placeholder="rule_001"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              Comment
            </label>
            <input
              value={draft.comment}
              onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))}
              className="input"
              placeholder="What this rule does"
            />
          </div>
        </div>

        {/* Format tabs */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {(['simple', 'multi', 'nested'] as const).map((format) => (
            <button
              key={format}
              onClick={() =>
                setDraft((p) => ({
                  ...p,
                  format,
                  conditions: format === 'nested' ? [] : p.conditions.length === 0 ? [makeCondition()] : p.conditions,
                }))
              }
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                background: draft.format === format ? 'var(--accent-blue)' : 'var(--bg-surface)',
                color: draft.format === format ? 'var(--bg-base)' : 'var(--text-secondary)',
              }}
            >
              {format === 'simple' ? 'Simple (IF)' : format === 'multi' ? 'Multi (AND/OR)' : 'Nested'}
            </button>
          ))}
        </div>

        {/* Conditions */}
        {draft.format !== 'nested' && (
          <div className="space-y-3">
            {draft.format === 'multi' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Logic
                </span>
                <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  {(['AND', 'OR'] as const).map((logic) => (
                    <button
                      key={logic}
                      onClick={() => setDraft((p) => ({ ...p, logic }))}
                      className="px-3 py-1 text-xs font-semibold transition-colors"
                      style={{
                        background: draft.logic === logic ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                        color: draft.logic === logic ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {logic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draft.conditions.map((c, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Field
                    </label>
                    <input
                      list="ctx-fields"
                      value={c.field}
                      onChange={(e) => updateCondition(i, { field: e.target.value })}
                      className="input text-xs font-mono"
                    />
                    <datalist id="ctx-fields">
                      {CONTEXT_NAMESPACES.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                      OP
                    </label>
                    <select
                      value={c.op}
                      onChange={(e) => updateCondition(i, { op: e.target.value })}
                      className="input text-xs font-mono"
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    {draft.conditions.length > 1 && (
                      <button
                        onClick={() => removeCondition(i)}
                        className="btn btn-ghost"
                        style={{ padding: '6px' }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>

                {!NO_VALUE_OPS.has(c.op) && (
                  <div className="mt-2">
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Value
                    </label>
                    <input
                      type="text"
                      value={c.value}
                      onChange={(e) => updateCondition(i, { value: e.target.value })}
                      placeholder={ARRAY_OPS.has(c.op) ? '[10, 100] or a, b' : '0'}
                      className="input text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            ))}

            <button onClick={addCondition} className="btn btn-secondary w-full" style={{ padding: '8px' }}>
              <Plus style={{ width: 16, height: 16 }} />
              Add Condition
            </button>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
            Rejection Message
          </label>
          <input
            value={draft.message}
            onChange={(e) => setDraft((p) => ({ ...p, message: e.target.value }))}
            className="input"
            placeholder="Transaction rejected by policy"
          />
        </div>

        {/* JSON Preview */}
        <div>
          <button
            onClick={() => setShowJson(!showJson)}
            className="text-xs font-medium flex items-center gap-2"
            style={{ color: 'var(--accent-blue)' }}
          >
            <Hash style={{ width: 14, height: 14 }} />
            {showJson ? 'Hide' : 'Show'} JSON
          </button>
          {showJson && (
            <pre
              className="mt-2 p-3 rounded-lg text-xs font-mono overflow-x-auto"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {ruleJson}
            </pre>
          )}
        </div>

        {/* Rule Hash */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Rule Hash
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
            {ruleHash}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleMint}
          disabled={!isConnected || isCreating}
          className="btn btn-primary w-full"
        >
          {isCreating ? 'Creating...' : 'Create Rule NFT'}
        </button>

        {createError && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--error-alpha)', border: '1px solid var(--error)', color: 'var(--error)' }}>
            Error: {(createError as { shortMessage?: string }).shortMessage || 'Failed to create rule'}
          </div>
        )}
      </div>
    </div>
  )
}
