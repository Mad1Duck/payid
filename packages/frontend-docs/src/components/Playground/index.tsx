import { useState, useCallback, useEffect } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  PlayIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  WalletIcon,
  ShieldCheckIcon,
  CoinsIcon,
  TrendingUpIcon,
  ListIcon,
  ZapIcon,
  RefreshCwIcon,
  CopyIcon,
  InfoIcon,
} from 'lucide-react';
import { cn } from '@site/src/lib/utils';
import { createPayID } from 'payid/client';
import type { RuleContext, RuleConfig, RuleResultDebug, RuleTraceEntry } from 'payid-types';

let payidClient: ReturnType<typeof createPayID> | null = null;

async function getClient(): Promise<ReturnType<typeof createPayID>> {
  if (payidClient) return payidClient;
  try {
    const res = await fetch('/rule_engine.wasm');
    if (!res.ok) throw new Error(`fetch /rule_engine.wasm: ${res.status}`);

    const wasm = new Uint8Array(await res.arrayBuffer());
    payidClient = createPayID({ wasm, debugTrace: true });
    console.info('[PAY.ID] WASM loaded', wasm.byteLength, 'bytes');
  } catch (err) {
    console.warn('[PAY.ID] WASM load failed, using TS fallback:', err);
    payidClient = createPayID({ debugTrace: true });
  }
  return payidClient;
}

// ─── Presets ──────────────────────────────────────────────────────────────────
// env.timestamp = Unix timestamp (seconds)
// state.spentToday = cumulative spent today (raw, 6 decimals)
// state.period = YYYY-MM-DD
// No proof needed in playground (no trustedIssuers = V1 mode, no attestation check)

const TODAY = new Date().toISOString().slice(0, 10);

function makeEnv(hour: number) {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  return { timestamp: Math.floor(d.getTime() / 1000) };
}

const PRESETS: { id: string; label: string; icon: string; ctx: any }[] = [
  {
    id: 'basic',
    label: 'Basic Payment',
    icon: '💳',
    ctx: {
      tx: {
        sender: '0xAlice',
        receiver: '0xBob',
        asset: 'USDC',
        amount: '150000000',
        chainId: 4202,
      },
      payId: { id: 'pay.id/bob', owner: '0xBob' },
      env: makeEnv(14),
      state: { spentToday: '50000000', period: TODAY },
    },
  },
  {
    id: 'overlimit',
    label: 'Over Daily Limit',
    icon: '🚫',
    ctx: {
      tx: {
        sender: '0xAlice',
        receiver: '0xBob',
        asset: 'USDC',
        amount: '600000000',
        chainId: 4202,
      },
      payId: { id: 'pay.id/bob', owner: '0xBob' },
      env: makeEnv(14),
      state: { spentToday: '480000000', period: TODAY },
    },
  },
  {
    id: 'offhours',
    label: 'Off Hours',
    icon: '📅',
    ctx: {
      tx: {
        sender: '0xAlice',
        receiver: '0xBob',
        asset: 'USDC',
        amount: '50000000',
        chainId: 4202,
      },
      payId: { id: 'pay.id/bob', owner: '0xBob' },
      env: makeEnv(3),
      state: { spentToday: '0', period: TODAY },
    },
  },
  {
    id: 'wrongtoken',
    label: 'Wrong Token',
    icon: '🪙',
    ctx: {
      tx: {
        sender: '0xAlice',
        receiver: '0xBob',
        asset: 'ETH',
        amount: '100000000',
        chainId: 4202,
      },
      payId: { id: 'pay.id/bob', owner: '0xBob' },
      env: makeEnv(12),
      state: { spentToday: '0', period: TODAY },
    },
  },
  {
    id: 'vip',
    label: 'VIP Sender',
    icon: '⭐',
    ctx: {
      tx: {
        sender: '0xVIP1',
        receiver: '0xBob',
        asset: 'USDC',
        amount: '999000000',
        chainId: 4202,
      },
      payId: { id: 'pay.id/bob', owner: '0xBob' },
      env: makeEnv(20),
      state: { spentToday: '0', period: TODAY },
    },
  },
  {
    id: 'blacklisted',
    label: 'Blacklisted',
    icon: '🔴',
    ctx: {
      tx: {
        sender: '0xScammer',
        receiver: '0xBob',
        asset: 'USDC',
        amount: '10000000',
        chainId: 4202,
      },
      payId: { id: 'pay.id/bob', owner: '0xBob' },
      env: makeEnv(10),
      state: { spentToday: '0', period: TODAY },
    },
  },
];

// ─── Rule Templates ───────────────────────────────────────────────────────────
// Fields reference RuleContext structure:
//   tx.sender, tx.receiver, tx.asset, tx.amount, tx.chainId
//   env.timestamp  (unix seconds — use |hour transform for hour-of-day)
//   state.spentToday (raw 6-decimal string)
//   state.period   (YYYY-MM-DD)
const RULE_TEMPLATES = [
  {
    id: 'token',
    label: 'Token Whitelist',
    icon: <CoinsIcon className="size-3.5" />,
    color: 'text-blue-500',
    rule: {
      id: 'token_whitelist',
      logic: 'OR',
      conditions: [
        { field: 'tx.asset', op: '==', value: 'USDC' },
        { field: 'tx.asset', op: '==', value: 'USDT' },
      ],
      message: 'Only USDC or USDT accepted',
    },
  },
  {
    id: 'amount_min',
    label: 'Min Amount',
    icon: <TrendingUpIcon className="size-3.5" />,
    color: 'text-green-500',
    rule: {
      id: 'min_amount',
      if: { field: 'tx.amount', op: '>=', value: '10000000' },
      message: 'Minimum 10 USDC',
    },
  },
  {
    id: 'amount_max',
    label: 'Max Amount',
    icon: <TrendingUpIcon className="size-3.5 rotate-180" />,
    color: 'text-orange-500',
    rule: {
      id: 'max_amount',
      if: { field: 'tx.amount', op: '<=', value: '500000000' },
      message: 'Maximum 500 USDC',
    },
  },
  {
    id: 'daily_limit',
    label: 'Daily Limit',
    icon: <WalletIcon className="size-3.5" />,
    color: 'text-purple-500',
    rule: {
      id: 'daily_limit',
      if: { field: 'state.spentToday', op: '<=', value: '500000000' },
      message: 'Daily spend limit exceeded',
    },
  },
  {
    id: 'business_hours',
    label: 'Business Hours',
    icon: <ClockIcon className="size-3.5" />,
    color: 'text-yellow-500',
    rule: {
      id: 'business_hours',
      if: { field: 'env.timestamp|hour', op: 'between', value: [8, 22] },
      message: 'Only open 08:00–22:00',
    },
  },
  {
    id: 'whitelist',
    label: 'Sender Whitelist',
    icon: <ShieldCheckIcon className="size-3.5" />,
    color: 'text-cyan-500',
    rule: {
      id: 'sender_whitelist',
      if: { field: 'tx.sender', op: 'in', value: ['0xalice', '0xbob', '0xvip1'] },
      message: 'Sender not whitelisted',
    },
  },
  {
    id: 'blacklist',
    label: 'Sender Blacklist',
    icon: <ShieldCheckIcon className="size-3.5" />,
    color: 'text-red-500',
    rule: {
      id: 'sender_blacklist',
      if: { field: 'tx.sender', op: 'not_in', value: ['0xscammer', '0xbadactor'] },
      message: 'Sender is blacklisted',
    },
  },
  {
    id: 'receiver_whitelist',
    label: 'Receiver Whitelist',
    icon: <ShieldCheckIcon className="size-3.5" />,
    color: 'text-lime-500',
    rule: {
      id: 'receiver_whitelist',
      if: { field: 'tx.receiver', op: 'in', value: ['0xbob', '0xmerchant'] },
      message: 'Receiver not allowed',
    },
  },
  {
    id: 'chain',
    label: 'Chain Filter',
    icon: <ZapIcon className="size-3.5" />,
    color: 'text-indigo-500',
    rule: {
      id: 'chain_filter',
      if: { field: 'tx.chainId', op: 'in', value: [4202, 1, 137] },
      message: 'Chain not supported',
    },
  },
  {
    id: 'amount_range',
    label: 'Amount Range',
    icon: <ListIcon className="size-3.5" />,
    color: 'text-teal-500',
    rule: {
      id: 'amount_range',
      logic: 'AND',
      conditions: [
        { field: 'tx.amount', op: '>=', value: '10000000' },
        { field: 'tx.amount', op: '<=', value: '500000000' },
      ],
      message: 'Amount must be 10–500 USDC',
    },
  },
  {
    id: 'intent_type',
    label: 'Intent Type',
    icon: <ZapIcon className="size-3.5" />,
    color: 'text-pink-500',
    rule: {
      id: 'intent_type',
      if: { field: 'intent.type', op: 'in', value: ['QR', 'DIRECT'] },
      message: 'Only QR or DIRECT payments',
    },
  },
  {
    id: 'vip_bypass',
    label: 'VIP Bypass',
    icon: <ZapIcon className="size-3.5" />,
    color: 'text-amber-500',
    rule: {
      id: 'vip_or_small',
      logic: 'OR',
      rules: [
        { id: 'is_vip', if: { field: 'tx.sender', op: 'in', value: ['0xvip1', '0xvip2'] } },
        { id: 'small_amount', if: { field: 'tx.amount', op: '<=', value: '50000000' } },
      ],
      message: 'VIPs bypass limits, others max 50 USDC',
    },
  },
];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/40" />
        <span className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest px-1">
          {label}
        </span>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ColHeader({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-b border-border/30 bg-muted/10 flex items-center justify-between shrink-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
      {extra}
    </div>
  );
}

function CtxEditor({ ctx, onChange }: { ctx: any; onChange: (c: any) => void }) {
  const upd = (path: string[], val: any) => {
    const next = JSON.parse(JSON.stringify(ctx));
    let ref: any = next;
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
    ref[path[path.length - 1]] = val;
    onChange(next);
  };
  const get = (path: string[]) => path.reduce((v: any, k) => v?.[k], ctx);
  const F = ({
    label,
    path,
    type = 'text',
    hint,
  }: {
    label: string;
    path: string[];
    type?: string;
    hint?: string;
  }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        {hint && <span className="font-mono text-[9px] text-muted-foreground/50">{hint}</span>}
      </div>
      <input
        type={type}
        value={get(path) ?? ''}
        onChange={(e) => upd(path, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="font-mono text-xs bg-muted/40 border border-border/40 rounded px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/60 transition-colors w-full"
      />
    </div>
  );

  const ts = ctx.env?.timestamp ?? Math.floor(Date.now() / 1000);
  const hour = new Date(ts * 1000).getUTCHours();
  const spentToday = Number(ctx.state?.spentToday || 0);

  const setHour = (h: number) => {
    const d = new Date(ts * 1000);
    d.setUTCHours(h, 0, 0, 0);
    upd(['env', 'timestamp'], Math.floor(d.getTime() / 1000));
  };

  return (
    <div className="space-y-5">
      <Section label="tx">
        <F label="Sender" path={['tx', 'sender']} hint="auto-lowercased" />
        <F label="Receiver" path={['tx', 'receiver']} hint="auto-lowercased" />
        <F label="Asset" path={['tx', 'asset']} hint="auto-uppercased" />
        <F label="Amount (raw)" path={['tx', 'amount']} hint="6 decimals" />
        <div className="text-right font-mono text-[10px] text-muted-foreground/60">
          = {(Number(ctx.tx?.amount || 0) / 1_000_000).toFixed(2)} USDC
        </div>
        <F label="Chain ID" path={['tx', 'chainId']} type="number" hint="4202 = Lisk" />
      </Section>

      <Section label="env">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Hour UTC (0–23)
            </label>
            <span
              className={cn(
                'font-mono text-[10px] font-medium',
                hour < 8 || hour > 22 ? 'text-red-400' : 'text-green-400',
              )}>
              {String(hour).padStart(2, '0')}:00 {hour < 8 || hour > 22 ? '— off hours' : '— open'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between font-mono text-[9px] text-muted-foreground/40">
            {['00', '06', '12', '18', '23'].map((h) => (
              <span key={h}>{h}:00</span>
            ))}
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/50 text-right">unix: {ts}</div>
        </div>
      </Section>

      <Section label="state">
        <F label="Spent Today (raw)" path={['state', 'spentToday']} hint="6 decimals" />
        <div className="text-right font-mono text-[10px] text-muted-foreground/60">
          = {(spentToday / 1_000_000).toFixed(2)} USDC
        </div>
        <F label="Period" path={['state', 'period']} hint="YYYY-MM-DD" />
      </Section>

      <Section label="intent (optional)">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Type
          </label>
          <select
            value={ctx.intent?.type || ''}
            onChange={(e) => {
              if (!e.target.value) {
                const n = JSON.parse(JSON.stringify(ctx));
                delete n.intent;
                onChange(n);
              } else upd(['intent', 'type'], e.target.value);
            }}
            className="font-mono text-xs bg-muted/40 border border-border/40 rounded px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/60 w-full">
            <option value="">— none —</option>
            <option value="QR">QR</option>
            <option value="DIRECT">DIRECT</option>
            <option value="API">API</option>
          </select>
        </div>
      </Section>
    </div>
  );
}

function RuleBuilderPanel({
  rules,
  logic,
  onRules,
  onLogic,
}: {
  rules: any[];
  logic: 'AND' | 'OR';
  onRules: (r: any[]) => void;
  onLogic: (l: 'AND' | 'OR') => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const toggle = (i: number) => {
    const s = new Set(expanded);
    s.has(i) ? s.delete(i) : s.add(i);
    setExpanded(s);
  };
  const add = (t: (typeof RULE_TEMPLATES)[0]) => {
    onRules([...rules, JSON.parse(JSON.stringify(t.rule))]);
    setExpanded((s) => new Set([...s, rules.length]));
  };
  const remove = (i: number) => onRules(rules.filter((_, idx) => idx !== i));
  const update = (i: number, json: string) => {
    try {
      const next = [...rules];
      next[i] = JSON.parse(json);
      onRules(next);
    } catch {}
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">Root logic:</span>
        <button
          onClick={() => onLogic(logic === 'AND' ? 'OR' : 'AND')}
          className={cn(
            'font-mono text-[10px] font-bold px-2 py-0.5 rounded border transition-colors',
            logic === 'AND'
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
              : 'border-orange-500/50 bg-orange-500/10 text-orange-400',
          )}>
          {logic}
        </button>
        <span className="font-mono text-[9px] text-muted-foreground/50">
          {logic === 'AND' ? 'all must pass' : 'any can pass'}
        </span>
      </div>
      <Separator />
      <div>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
          Add Rule
        </div>
        <div className="grid grid-cols-2 gap-1">
          {RULE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => add(t)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-border/40 bg-muted/20 hover:bg-muted/60 hover:border-border transition-all text-left group">
              <span className={cn('shrink-0', t.color)}>{t.icon}</span>
              <span className="font-mono text-[10px] text-foreground/70 group-hover:text-foreground truncate">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          Active ({rules.length})
        </div>
        {rules.length === 0 && (
          <div className="text-center py-6 font-mono text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded">
            No rules — add one above
          </div>
        )}
        {rules.map((rule, i) => (
          <div key={i} className="border border-border/40 rounded overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors text-left">
              {expanded.has(i) ? (
                <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
              )}
              <span className="font-mono text-xs flex-1 truncate text-foreground/80">
                {rule.id || `rule_${i}`}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                className="font-mono text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors px-1">
                ✕
              </button>
            </button>
            {expanded.has(i) && (
              <div className="p-2 bg-background/30">
                <textarea
                  value={JSON.stringify(rule, null, 2)}
                  onChange={(e) => update(i, e.target.value)}
                  rows={Math.min(14, (JSON.stringify(rule, null, 2).match(/\n/g) || []).length + 2)}
                  spellCheck={false}
                  className="w-full font-mono text-[10px] bg-background/60 border border-border/30 rounded px-2 py-1.5 text-foreground/80 focus:outline-none focus:border-primary/40 resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
interface FullResult {
  sdkResult: RuleResultDebug;
  trace: RuleTraceEntry[];
  executionMs: number;
}

function ResultPanel({
  result,
  executing,
  error,
}: {
  result: FullResult | null;
  executing: boolean;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.sdkResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  if (executing)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="size-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="font-mono text-[11px]">Running PAY.ID SDK...</span>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <XCircleIcon className="size-8 text-destructive/60" />
        <div className="text-center font-mono text-xs text-destructive break-all">{error}</div>
      </div>
    );
  if (!result)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40">
        <PlayIcon className="size-8" />
        <span className="font-mono text-[11px]">Run evaluation to see results</span>
      </div>
    );
  const isAllow = result.sdkResult.decision === 'ALLOW';
  return (
    <Tabs defaultValue="summary" className="h-full flex flex-col">
      <TabsList className="grid grid-cols-3 w-full shrink-0">
        <TabsTrigger value="summary" className="font-mono text-xs">
          Summary
        </TabsTrigger>
        <TabsTrigger value="trace" className="font-mono text-xs">
          Trace ({result.trace.length})
        </TabsTrigger>
        <TabsTrigger value="raw" className="font-mono text-xs">
          Raw JSON
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="flex-1 overflow-auto mt-3 space-y-3">
        <div
          className={cn(
            'rounded-lg border-2 p-4 flex items-center gap-3',
            isAllow ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5',
          )}>
          {isAllow ? (
            <CheckCircle2Icon className="size-6 text-green-500 shrink-0" />
          ) : (
            <XCircleIcon className="size-6 text-red-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                'font-mono text-xl font-bold',
                isAllow ? 'text-green-500' : 'text-red-500',
              )}>
              {result.sdkResult.decision}
            </div>
            <div className="font-mono text-xs text-muted-foreground truncate">
              {result.sdkResult.reason || result.sdkResult.code}
            </div>
          </div>
          <div className="font-mono text-[10px] text-right shrink-0">
            <div className="text-blue-400 font-medium">PAY.ID SDK</div>
            <div className="text-muted-foreground">{result.executionMs}ms</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">Code:</span>
          <Badge variant={isAllow ? 'default' : 'destructive'} className="font-mono text-[10px]">
            {result.sdkResult.code}
          </Badge>
        </div>
        {result.trace.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Conditions
            </div>
            {result.trace.map((t, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded border',
                  t.result === 'PASS'
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5',
                )}>
                {t.result === 'PASS' ? (
                  <CheckCircle2Icon className="size-3.5 text-green-500 shrink-0" />
                ) : (
                  <XCircleIcon className="size-3.5 text-red-500 shrink-0" />
                )}
                <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">
                  [{t.ruleId}]
                </span>
                <span className="font-mono text-[10px] flex-1 truncate">
                  {t.field} {t.op} {JSON.stringify(t.expected)}
                </span>
                <Badge
                  variant={t.result === 'PASS' ? 'default' : 'destructive'}
                  className="font-mono text-[9px] shrink-0">
                  {t.result}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="trace" className="flex-1 overflow-auto mt-3">
        <div className="space-y-2">
          {result.trace.map((t, i) => (
            <div
              key={i}
              className={cn(
                'rounded border p-3 space-y-2',
                t.result === 'PASS' ? 'border-green-500/20' : 'border-red-500/20',
              )}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] text-muted-foreground/60">[{t.ruleId}]</span>
                <span className="font-mono text-xs font-semibold">{t.field}</span>
                <span className="font-mono text-[10px] text-primary/70 border border-primary/20 px-1 rounded">
                  {t.op}
                </span>
                <code className="font-mono text-[10px] text-muted-foreground">
                  {JSON.stringify(t.expected)}
                </code>
                <Badge
                  variant={t.result === 'PASS' ? 'default' : 'destructive'}
                  className="font-mono text-[9px] ml-auto">
                  {t.result}
                </Badge>
              </div>
              <div className="font-mono text-[10px] bg-muted/20 rounded p-2 flex gap-3">
                <span className="text-muted-foreground/60 shrink-0">actual →</span>
                <code
                  className={cn(
                    'font-bold break-all',
                    t.result === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}>
                  {JSON.stringify(t.actual)}
                </code>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="raw" className="flex-1 overflow-auto mt-3 space-y-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/40 hover:border-border transition-colors">
          <CopyIcon className="size-3" />
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <pre className="font-mono text-[10px] text-foreground/70 whitespace-pre-wrap break-all leading-relaxed rounded border border-border/40 bg-muted/10 p-3">
          {JSON.stringify(result.sdkResult, null, 2)}
        </pre>
      </TabsContent>
    </Tabs>
  );
}

export default function PayIDPlayground() {
  const [ctx, setCtx] = useState<any>(PRESETS[0].ctx);
  const [rules, setRules] = useState<any[]>(
    [RULE_TEMPLATES[0], RULE_TEMPLATES[1], RULE_TEMPLATES[3], RULE_TEMPLATES[5]].map((t) =>
      JSON.parse(JSON.stringify(t.rule)),
    ),
  );
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [result, setResult] = useState<FullResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasmStatus, setWasmStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    getClient().then((client) => {
      setWasmStatus((client as any).wasm ? 'ready' : 'fallback');
    });
  }, []);

  const run = useCallback(async () => {
    if (rules.length === 0) return;
    setExecuting(true);
    setError(null);
    try {
      const client = await getClient();
      const ruleConfig: RuleConfig = { version: '1', logic, rules };
      const t0 = performance.now();
      const sdkResult = (await client.evaluate(ctx, ruleConfig)) as RuleResultDebug;
      const trace: RuleTraceEntry[] = sdkResult.debug?.trace ?? [];
      setResult({ sdkResult, trace, executionMs: Math.round(performance.now() - t0) });
      setWasmStatus('ready');
    } catch (e: any) {
      setError(e?.message || 'Unknown error');
    } finally {
      setExecuting(false);
    }
  }, [ctx, rules, logic]);

  const applyPreset = (p: (typeof PRESETS)[0]) => {
    setCtx(JSON.parse(JSON.stringify(p.ctx)));
    setResult(null);
    setError(null);
  };
  const decision = result?.sdkResult.decision;

  return (
    <div className="flex flex-col bg-background font-mono" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Preset bar */}
      <div className="border-b border-border/30 px-3 py-1.5 flex items-center gap-2 shrink-0 bg-muted/10 overflow-x-auto">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
          Scenario
        </span>
        <div className="w-px h-3 bg-border/50 shrink-0" />
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border/40 bg-background/60 hover:bg-muted hover:border-border font-mono text-[10px] text-foreground/70 hover:text-foreground transition-all whitespace-nowrap shrink-0">
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              wasmStatus === 'loading'
                ? 'bg-yellow-500 animate-pulse'
                : wasmStatus === 'ready'
                  ? 'bg-blue-500'
                  : 'bg-yellow-500',
            )}
          />
          <span className="font-mono text-[9px] text-muted-foreground/50 hidden sm:block">
            {wasmStatus === 'loading'
              ? 'loading...'
              : wasmStatus === 'ready'
                ? '⚡ WASM'
                : '📜 TS fallback'}
          </span>
          <InfoIcon className="size-3 text-muted-foreground/30" />
        </div>
      </div>

      {/* 3-col layout */}
      <div className="flex flex-1 overflow-hidden divide-x divide-border/30">
        <div className="w-[240px] shrink-0 flex flex-col">
          <ColHeader>Context</ColHeader>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <CtxEditor
                ctx={ctx}
                onChange={(c) => {
                  setCtx(c);
                  setResult(null);
                  setError(null);
                }}
              />
            </div>
          </ScrollArea>
        </div>
        <div className="w-[280px] shrink-0 flex flex-col">
          <ColHeader>Rules</ColHeader>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <RuleBuilderPanel
                rules={rules}
                logic={logic}
                onRules={(r) => {
                  setRules(r);
                  setResult(null);
                  setError(null);
                }}
                onLogic={(l) => {
                  setLogic(l);
                  setResult(null);
                }}
              />
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border/30 shrink-0">
            <Button
              onClick={run}
              disabled={executing || rules.length === 0}
              className="w-full font-mono text-xs gap-2">
              {executing ? (
                <>
                  <RefreshCwIcon className="size-3 animate-spin" />
                  Running SDK...
                </>
              ) : (
                <>
                  <PlayIcon className="size-3" />
                  Run Evaluation
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <ColHeader
            extra={
              decision && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'size-1.5 rounded-full',
                      decision === 'ALLOW' ? 'bg-green-500' : 'bg-red-500',
                    )}
                  />
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold',
                      decision === 'ALLOW' ? 'text-green-500' : 'text-red-500',
                    )}>
                    {decision}
                  </span>
                </div>
              )
            }>
            Result
          </ColHeader>
          <div className="flex-1 overflow-hidden p-3">
            <ResultPanel result={result} executing={executing} error={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
