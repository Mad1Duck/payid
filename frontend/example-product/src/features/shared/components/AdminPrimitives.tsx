import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react'
import { useV4Palette } from '@/components/v4/theme'

/* ── Card ── */
export function Card({
  title,
  icon: Icon,
  children,
  delay = 0,
  collapsible = false,
}: {
  title: string
  icon: any
  children: React.ReactNode
  delay?: number
  collapsible?: boolean
}) {
  const p = useV4Palette()
  const [open, setOpen] = useState(true)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl relative overflow-hidden"
      style={{ background: p.cardBg }}
    >
      <div
        className={`absolute inset-0 rounded-2xl border ${p.cardBorder} pointer-events-none`}
      />
      <div className="relative">
        <button
          onClick={() => collapsible && setOpen((o) => !o)}
          className={`w-full flex items-center gap-2.5 p-4 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,208,132,0.12)' }}
          >
            <Icon className="w-3.5 h-3.5 text-[#00D084]" />
          </div>
          <h2 className={`text-sm font-bold ${p.textMain} flex-1 text-left`}>
            {title}
          </h2>
          {collapsible &&
            (open ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ))}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Field ── */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  mono?: boolean
}) {
  const p = useV4Palette()
  return (
    <div className="mb-2.5">
      <label className={`text-[11px] font-medium ${p.textMuted} mb-1 block`}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-xl text-xs border ${p.inputBorder} ${p.inputBg} ${p.textMain} focus:outline-none focus:ring-2 focus:ring-[#00D084]/30 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

/* ── Btn ── */
export function Btn({
  onClick,
  disabled,
  variant = 'green',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'green' | 'red' | 'blue' | 'ghost'
  children: React.ReactNode
}) {
  const colors = {
    green: '#00D084',
    red: '#EF4444',
    blue: '#0EA5E9',
    ghost: 'transparent',
  }
  const textColors = {
    green: 'text-white',
    red: 'text-white',
    blue: 'text-white',
    ghost: 'text-gray-400',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-35 border ${variant === 'ghost' ? 'border-gray-600' : 'border-transparent'} ${textColors[variant]}`}
      style={{
        background: variant === 'ghost' ? 'transparent' : colors[variant],
      }}
    >
      {children}
    </button>
  )
}

/* ── Badge ── */
export function Badge({ ok, label }: { ok: boolean | undefined; label?: string }) {
  if (ok === undefined)
    return <span className="text-[10px] text-gray-500 font-mono">loading…</span>
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
    >
      {ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
      {label ?? (ok ? 'Set' : 'Not set')}
    </span>
  )
}

/* ── Divider ── */
export function Divider() {
  return (
    <div
      className="my-3 h-px"
      style={{ background: 'rgba(128,128,128,0.1)' }}
    />
  )
}

/* ── InitSection ── */
export function InitSection({
  label,
  isInit,
  onInit,
  fields,
  disabled,
}: {
  label: string
  isInit: boolean | undefined
  onInit: () => void
  fields: React.ReactNode
  disabled: boolean
}) {
  const p = useV4Palette()
  return (
    <div
      className="p-3 rounded-xl mb-3"
      style={{
        background: p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        border: '1px solid rgba(128,128,128,0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xs font-bold ${p.textMain}`}>{label}</span>
        <Badge ok={isInit} label={isInit ? 'Initialized' : 'Not initialized'} />
      </div>
      {fields}
      <Btn
        onClick={onInit}
        disabled={disabled || isInit === true}
        variant="green"
      >
        {isInit ? '✓ Already Initialized' : 'Initialize'}
      </Btn>
    </div>
  )
}

/* ── TrustChecker ── */
export function TrustChecker({
  label,
  addr,
  setAddr,
  isTrusted,
  onSet,
  onRevoke,
  disabled,
}: {
  label: string
  addr: string
  setAddr: (v: string) => void
  isTrusted: boolean | undefined
  onSet: () => void
  onRevoke: () => void
  disabled: boolean
}) {
  return (
    <div>
      <Field
        label={label}
        value={addr}
        onChange={setAddr}
        placeholder="0x..."
        mono
      />
      <div className="flex items-center gap-2 mt-1">
        {addr.startsWith('0x') && addr.length === 42 && (
          <Badge
            ok={isTrusted}
            label={isTrusted ? 'Trusted ✓' : 'Not trusted'}
          />
        )}
        <div className="ml-auto flex gap-1.5">
          <Btn onClick={onSet} disabled={disabled || !addr} variant="green">
            Set / Trust
          </Btn>
          <Btn onClick={onRevoke} disabled={disabled || !addr} variant="red">
            Revoke
          </Btn>
        </div>
      </div>
    </div>
  )
}
