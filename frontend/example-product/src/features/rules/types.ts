export type RuleFormat = 'simple' | 'multi' | 'nested'

export interface Cond {
  field: string
  transform: string
  transformArg: string
  op: string
  value: string
}

export interface Template {
  label: string
  desc: string
  icon: string
  fmt: RuleFormat
  conds: Array<Cond>
  unit: string
  inputType: 'number' | 'range' | 'days' | 'usd' | 'address' | 'chain' | 'none'
}
