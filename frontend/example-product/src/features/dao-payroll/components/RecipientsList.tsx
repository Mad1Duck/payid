import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, FileSpreadsheet, Repeat, Clock, Send } from 'lucide-react'

interface Recipient {
  id: string
  address: string
  amount: string
  role: string
  schedule: string
}

interface Props {
  p: any
  recipients: Recipient[]
  newAddress: string
  setNewAddress: (val: string) => void
  newAmount: string
  setNewAmount: (val: string) => void
  newRole: string
  setNewRole: (val: string) => void
  newSchedule: string
  setNewSchedule: (val: string) => void
  showAddForm: boolean
  setShowAddForm: (val: boolean) => void
  addRecipient: () => void
  removeRecipient: (id: string) => void
}

export function RecipientsList({
  p, recipients, newAddress, setNewAddress, newAmount, setNewAmount,
  newRole, setNewRole, newSchedule, setNewSchedule, showAddForm, setShowAddForm,
  addRecipient, removeRecipient
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
      style={{ backgroundColor: p.cardBg }}
    >
      <div className="p-5 border-b border-dashed border-[#E5E7EB]/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#64748B]" />
          <h2 className={`text-sm font-semibold ${p.textMain}`}>Contributor List</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D084]/10 text-[#00D084] text-xs font-medium hover:bg-[#00D084]/15 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-dashed border-[#E5E7EB]/30 overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x..."
                className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
              />
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00 ETH"
                className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40 font-mono`}
              />
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role"
                className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} placeholder-[#64748B] focus:outline-none focus:border-[#00D084]/40`}
              />
              <select
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                className={`px-3 py-2 rounded-lg text-xs ${p.inputBg} border ${p.inputBorder} ${p.textMain} focus:outline-none focus:border-[#00D084]/40`}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="one-time">One-time</option>
              </select>
              <button
                onClick={addRecipient}
                className="px-3 py-2 rounded-lg bg-[#00D084] text-[#0B0F1A] text-xs font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
        {recipients.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="p-4 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#8B5CF6]">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
              <div>
                <p className={`text-xs font-mono ${p.textMain} truncate`}>{r.address}</p>
                <p className={`text-[10px] ${p.textMuted}`}>{r.role}</p>
              </div>
              <div className={`text-sm font-bold font-mono ${p.textMain}`}>{r.amount} ETH</div>
              <div className="flex items-center gap-1">
                {r.schedule === 'monthly' ? (
                  <Repeat className="w-3 h-3 text-[#64748B]" />
                ) : r.schedule === 'weekly' ? (
                  <Clock className="w-3 h-3 text-[#64748B]" />
                ) : (
                  <Send className="w-3 h-3 text-[#64748B]" />
                )}
                <span className={`text-[10px] ${p.textMuted} capitalize`}>{r.schedule}</span>
              </div>
            </div>
            <button
              onClick={() => removeRecipient(r.id)}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
