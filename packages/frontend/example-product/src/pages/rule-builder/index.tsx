import { ArrowLeft, Gamepad2, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RuleCard } from '@/components/RuleCard'
import { cn } from '@/lib/utils'
import { MobileLayout } from '@/components/Layouts/MobileLayout'

type RuleType =
  | 'minAmount'
  | 'maxAmount'
  | 'allowedToken'
  | 'allowedSender'
  | 'expiration'

interface Rule {
  id: string
  type: RuleType
  field: string
  operator: string
  value: string
}

const ruleTemplates: Array<{
  type: RuleType
  field: string
  operator: string
  value: string
  description: string
}> = [
  {
    type: 'minAmount',
    field: 'Amount',
    operator: '>=',
    value: '10 USDC',
    description: 'Minimum payment amount',
  },
  {
    type: 'maxAmount',
    field: 'Amount',
    operator: '<=',
    value: '10,000 USDC',
    description: 'Maximum payment amount',
  },
  {
    type: 'allowedToken',
    field: 'Token',
    operator: 'IN',
    value: 'USDC, ETH, SOL',
    description: 'Accepted payment tokens',
  },
  {
    type: 'allowedSender',
    field: 'Sender',
    operator: 'IN',
    value: 'whitelist',
    description: 'Trusted sender addresses',
  },
  {
    type: 'expiration',
    field: 'Timestamp',
    operator: '<',
    value: '2024-12-31',
    description: 'Rule expiration date',
  },
]

const initialRules: Array<Rule> = [
  {
    id: '1',
    type: 'minAmount',
    field: 'Amount',
    operator: '>=',
    value: '50 USDC',
  },
  {
    id: '2',
    type: 'allowedToken',
    field: 'Token',
    operator: 'IN',
    value: 'USDC, USDT',
  },
]

export default function RuleBuilder() {
  const [rules, setRules] = useState<Array<Rule>>(initialRules)
  const [showTemplates, setShowTemplates] = useState(false)

  const handleAddRule = (template: (typeof ruleTemplates)[0]) => {
    const newRule: Rule = {
      id: Date.now().toString(),
      type: template.type,
      field: template.field,
      operator: template.operator,
      value: template.value,
    }
    setRules([...rules, newRule])
    setShowTemplates(false)
  }

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id))
  }

  return (
    <MobileLayout>
      <div className="px-5 safe-area-top">
        {/* Header */}
        <header className="flex items-center gap-4 py-4">
          <button className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Rule Builder</h1>
            <p className="text-sm text-muted-foreground">
              Define payment conditions
            </p>
          </div>
        </header>

        {/* Console Mode Button */}
        <section className="mt-4">
          <button
            // onClick={() => navigate("/rules/console")}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-console-body-top to-console-body-bottom border border-white/10 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-console-text" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-console-text">Rule Console</p>
                <p className="text-xs text-console-label">
                  GBA-style cartridge interface
                </p>
              </div>
              <div className="text-console-label group-hover:translate-x-1 transition-transform">
                →
              </div>
            </div>
          </button>
        </section>

        {/* Active Rules */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Active Rules ({rules.length})
            </h2>
          </div>

          {rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="relative animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <RuleCard
                    type={rule.type}
                    field={rule.field}
                    operator={rule.operator}
                    value={rule.value}
                    isDraggable
                  />
                  <button
                    onClick={() => handleRemoveRule(rule.id)}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-destructive-muted transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No rules defined yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add rules to control who can pay you
              </p>
            </div>
          )}

          {/* Add Rule Button */}
          <Button
            variant="outline"
            className="w-full mt-4 h-12 border-dashed"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Rule
          </Button>
        </section>

        {/* Rule Templates */}
        {showTemplates && (
          <section className="mt-6 animate-slide-up">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Rule Templates
            </h2>
            <div className="space-y-3">
              {ruleTemplates.map((template, index) => (
                <button
                  key={template.type}
                  onClick={() => handleAddRule(template)}
                  className={cn(
                    'w-full p-4 rounded-2xl border border-border/50 bg-card',
                    'hover:border-accent hover:shadow-soft-md transition-all duration-200',
                    'text-left animate-fade-in',
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {template.description}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                        {template.field} {template.operator} {template.value}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Save Button */}
        {rules.length > 0 && (
          <div className="mt-8 mb-6">
            <Button size="lg" className="w-full mt-4 h-12">
              <Save className="w-5 h-5 mr-2" />
              Save as Authority Rule
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Rules will be stored on-chain and enforced automatically
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
