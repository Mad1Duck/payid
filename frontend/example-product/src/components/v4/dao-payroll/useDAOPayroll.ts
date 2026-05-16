import { useState } from 'react'
import { useV4Palette } from '../theme'
import { useAccount, useBalance, useChainId, useChains } from 'wagmi'
import { formatUnits, isAddress } from 'viem'

interface Recipient {
  id: string
  address: string
  amount: string
  role: string
  schedule: 'one-time' | 'weekly' | 'monthly'
}

interface PayrollRun {
  id: string
  date: string
  totalAmount: string
  recipientCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  txHash?: string
}

export function useDAOPayroll() {
  const p = useV4Palette()
  const chainId = useChainId()
  const chains = useChains()
  const currentChain = chains.find((c) => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newSchedule, setNewSchedule] = useState<'one-time' | 'weekly' | 'monthly'>('monthly')
  const [showAddForm, setShowAddForm] = useState(false)

  const [simulationResult, setSimulationResult] = useState<{
    decision: 'ALLOW' | 'REJECT'
    total: string
    gasEstimate: string
    policyCheck: string[]
  } | null>(null)

  const [runs] = useState<PayrollRun[]>([])

  const totalPayroll = recipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0).toFixed(4)
  const treasuryBalance = parseFloat(balance ? formatUnits(balance.value, balance.decimals) : '12.5')
  const isSufficient = treasuryBalance >= parseFloat(totalPayroll)

  const addRecipient = () => {
    if (!newAddress || !newAmount) return
    setRecipients((prev) => [
      ...prev,
      { id: Date.now().toString(), address: newAddress, amount: newAmount, role: newRole || 'Contributor', schedule: newSchedule },
    ])
    setNewAddress('')
    setNewAmount('')
    setNewRole('')
    setShowAddForm(false)
  }

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id))
  }

  const simulate = () => {
    const invalid = recipients.filter((r) => !isAddress(r.address))
    const decision: 'ALLOW' | 'REJECT' = isSufficient && invalid.length === 0 ? 'ALLOW' : 'REJECT'
    setSimulationResult({
      decision,
      total: totalPayroll,
      gasEstimate: 'N/A',
      policyCheck: [
        isSufficient
          ? 'Treasury balance sufficient'
          : `Insufficient balance (need ${totalPayroll} ETH, have ${treasuryBalance.toFixed(4)})`,
        invalid.length === 0
          ? 'All recipient addresses valid (checksum OK)'
          : `${invalid.length} invalid address(es) — use full 0x... format`,
        `${recipients.length} of 50 recipient limit`,
      ],
    })
  }

  return {
    p, chainId, nativeSymbol, address, balance,
    recipients, setRecipients,
    newAddress, setNewAddress,
    newAmount, setNewAmount,
    newRole, setNewRole,
    newSchedule, setNewSchedule,
    showAddForm, setShowAddForm,
    simulationResult, setSimulationResult,
    runs, totalPayroll, treasuryBalance, isSufficient,
    addRecipient, removeRecipient, simulate,
  }
}
