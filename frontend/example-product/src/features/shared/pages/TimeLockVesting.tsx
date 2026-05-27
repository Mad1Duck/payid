import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react'
import { formatUnits, parseUnits, isAddress } from 'viem'
import { toast } from 'sonner'
import { useTimeLockVesting, type VestingSchedule } from '../hooks/useTimeLockVesting'
import { useV4Palette } from '@/components/v4/theme'
import { useAccount, useBalance, useChainId, useChains, usePublicClient } from 'wagmi'
import { TimeLockVestingAbi } from '@/constants/contracts'

export function TimeLockVesting() {
  const p = useV4Palette()
  const { address } = useAccount()
  const chainId = useChainId()
  const chains = useChains()
  const currentChain = chains.find((c) => c.id === chainId)
  const nativeSymbol = currentChain?.nativeCurrency.symbol ?? 'ETH'
  const { data: balance } = useBalance({ address })
  const publicClient = usePublicClient()

  const vesting = useTimeLockVesting()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [beneficiary, setBeneficiary] = useState('')
  const [amount, setAmount] = useState('')
  const [cliffMonths, setCliffMonths] = useState('6')
  const [durationMonths, setDurationMonths] = useState('12')
  const [revocable, setRevocable] = useState(true)
  const [userSchedules, setUserSchedules] = useState<Array<{ id: bigint; schedule: VestingSchedule }>>([])
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)

  const fetchUserSchedules = async () => {
    if (!address || !publicClient) return

    setIsLoadingSchedules(true)
    try {
      const currentNextId = await publicClient.readContract({
        address: vesting.address,
        abi: TimeLockVestingAbi,
        functionName: 'nextScheduleId',
      }) as bigint

      const schedules: Array<{ id: bigint; schedule: VestingSchedule }> = []

      for (let i = 0n; i < currentNextId; i++) {
        try {
          const scheduleData = await publicClient.readContract({
            address: vesting.address,
            abi: TimeLockVestingAbi,
            functionName: 'schedules',
            args: [i],
          }) as readonly [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, boolean, boolean, `0x${string}`]

          const schedule: VestingSchedule = {
            beneficiary: scheduleData[0],
            asset: scheduleData[1],
            totalAmount: scheduleData[2],
            startTime: scheduleData[3],
            cliff: scheduleData[4],
            duration: scheduleData[5],
            released: scheduleData[6],
            revocable: scheduleData[7],
            revoked: scheduleData[8],
            revoker: scheduleData[9],
          }

          // Include if user is beneficiary or revoker
          if (
            schedule.beneficiary.toLowerCase() === address.toLowerCase() ||
            schedule.revoker.toLowerCase() === address.toLowerCase()
          ) {
            schedules.push({ id: i, schedule })
          }
        } catch (e) {
          continue
        }
      }

      setUserSchedules(schedules)
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
      toast.error('Failed to fetch vesting schedules')
    } finally {
      setIsLoadingSchedules(false)
    }
  }

  const createSchedule = async () => {
    if (!address || !isAddress(beneficiary)) {
      toast.error('Invalid beneficiary address')
      return
    }

    const cliffSeconds = BigInt(parseInt(cliffMonths) * 30 * 24 * 60 * 60)
    const durationSeconds = BigInt(parseInt(durationMonths) * 30 * 24 * 60 * 60)
    const amountWei = parseUnits(amount, 18)
    const startTime = BigInt(Math.floor(Date.now() / 1000))

    try {
      await vesting.createSchedule(
        beneficiary as `0x${string}`,
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
        amountWei,
        startTime,
        cliffSeconds,
        durationSeconds,
        revocable,
        address as `0x${string}`,
        amountWei
      )

      setShowCreateForm(false)
      setBeneficiary('')
      setAmount('')
      setTimeout(() => fetchUserSchedules(), 2000)
    } catch (error) {
      console.error('Failed to create schedule:', error)
    }
  }

  const handleRelease = async (scheduleId: bigint) => {
    try {
      await vesting.release(scheduleId)
      setTimeout(() => fetchUserSchedules(), 2000)
    } catch (error) {
      console.error('Failed to release:', error)
    }
  }

  const handleRevoke = async (scheduleId: bigint) => {
    try {
      await vesting.revoke(scheduleId)
      setTimeout(() => fetchUserSchedules(), 2000)
    } catch (error) {
      console.error('Failed to revoke:', error)
    }
  }

  const calculateVestingProgress = (schedule: VestingSchedule) => {
    const now = Math.floor(Date.now() / 1000)
    const elapsed = now - Number(schedule.startTime)
    const cliffEnd = Number(schedule.startTime) + Number(schedule.cliff)
    const totalDuration = Number(schedule.duration)

    if (now < cliffEnd) {
      return { progress: 0, status: 'cliff', vested: 0n, releasable: 0n }
    }

    if (elapsed >= totalDuration) {
      return {
        progress: 100,
        status: 'fully_vested',
        vested: schedule.totalAmount - schedule.released,
        releasable: schedule.totalAmount - schedule.released,
      }
    }

    const vested = (schedule.totalAmount * BigInt(elapsed)) / schedule.duration
    const releasable = vested - schedule.released
    const progress = Number((vested * 100n) / schedule.totalAmount)

    return { progress, status: 'vesting', vested, releasable }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${p.textMain}`}>Time-Lock Vesting</h1>
            <p className={`text-sm ${p.textMuted}`}>Token vesting with cliff and linear release</p>
          </div>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-2xl p-5 border ${p.cardBorder}`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs ${p.textMuted}`}>Available Balance</p>
            <p className={`text-2xl font-bold ${p.textMain}`}>
              {balance ? formatUnits(balance.value, balance.decimals) : '0'} {nativeSymbol}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold hover:bg-[#8B5CF6]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        </div>
      </motion.div>

      {/* Create Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-5 border ${p.cardBorder}`}
          style={{ backgroundColor: p.cardBg }}
        >
          <h2 className={`text-sm font-semibold ${p.textMain} mb-4`}>Create Vesting Schedule</h2>
          <div className="space-y-4">
            <div>
              <label className={`text-xs ${p.textMuted} block mb-1`}>Beneficiary Address</label>
              <input
                type="text"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB]/30 bg-transparent text-sm focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className={`text-xs ${p.textMuted} block mb-1`}>Amount ({nativeSymbol})</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB]/30 bg-transparent text-sm focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs ${p.textMuted} block mb-1`}>Cliff (months)</label>
                <input
                  type="number"
                  value={cliffMonths}
                  onChange={(e) => setCliffMonths(e.target.value)}
                  placeholder="6"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB]/30 bg-transparent text-sm focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
              <div>
                <label className={`text-xs ${p.textMuted} block mb-1`}>Duration (months)</label>
                <input
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="12"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB]/30 bg-transparent text-sm focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="revocable"
                checked={revocable}
                onChange={(e) => setRevocable(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="revocable" className={`text-sm ${p.textMain}`}>Revocable by you</label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createSchedule}
                disabled={vesting.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
              >
                {vesting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Create Schedule
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB]/30 text-sm font-semibold hover:bg-[#E5E7EB]/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Vesting Schedules */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl border ${p.cardBorder} overflow-hidden`}
        style={{ backgroundColor: p.cardBg }}
      >
        <div className="p-5 border-b border-dashed border-[#E5E7EB]/30 flex items-center justify-between">
          <h2 className={`text-sm font-semibold ${p.textMain}`}>Vesting Schedules</h2>
          <button
            onClick={fetchUserSchedules}
            disabled={isLoadingSchedules}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isLoadingSchedules
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20'
            }`}
          >
            {isLoadingSchedules ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="divide-y divide-dashed divide-[#E5E7EB]/30">
          {userSchedules.length === 0 ? (
            <div className="p-8 text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-[#E5E7EB]" />
              <p className={`text-sm ${p.textMuted}`}>No vesting schedules</p>
              <p className={`text-xs ${p.textMuted} mt-1`}>Create a schedule to get started</p>
            </div>
          ) : (
            userSchedules.map(({ id, schedule }) => {
              const { progress, status, releasable } = calculateVestingProgress(schedule)
              const isBeneficiary = schedule.beneficiary.toLowerCase() === address?.toLowerCase()
              const isRevoker = schedule.revoker.toLowerCase() === address?.toLowerCase()

              return (
                <div key={id.toString()} className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                        {status === 'cliff' ? <Lock className="w-5 h-5 text-[#8B5CF6]" /> : <Unlock className="w-5 h-5 text-[#8B5CF6]" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${p.textMain}`}>
                          {isBeneficiary ? 'Your Vesting' : schedule.beneficiary.slice(0, 6)}...{schedule.beneficiary.slice(-4)}
                        </p>
                        <p className={`text-xs ${p.textMuted}`}>
                          {formatUnits(schedule.totalAmount, 18)} {nativeSymbol} · {schedule.revocable ? 'Revocable' : 'Non-revocable'}
                        </p>
                      </div>
                    </div>
                    {schedule.revoked && (
                      <span className="px-2 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-medium">Revoked</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${p.textMuted}`}>Vesting Progress</span>
                      <span className={`text-xs font-medium ${p.textMain}`}>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-[#E5E7EB]/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8B5CF6] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] ${p.textMuted}`}>
                        Cliff: {new Date(Number(schedule.startTime + schedule.cliff) * 1000).toLocaleDateString()}
                      </span>
                      <span className={`text-[10px] ${p.textMuted}`}>
                        End: {new Date(Number(schedule.startTime + schedule.duration) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className={`p-3 rounded-lg bg-[#E5E7EB]/5`}>
                      <p className={`text-[10px] ${p.textMuted}`}>Total</p>
                      <p className={`text-sm font-medium ${p.textMain}`}>
                        {formatUnits(schedule.totalAmount, 18)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-[#E5E7EB]/5`}>
                      <p className={`text-[10px] ${p.textMuted}`}>Released</p>
                      <p className={`text-sm font-medium ${p.textMain}`}>
                        {formatUnits(schedule.released, 18)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-[#00D084]/10`}>
                      <p className={`text-[10px] ${p.textMuted}`}>Releasable</p>
                      <p className={`text-sm font-medium text-[#00D084]`}>
                        {formatUnits(releasable, 18)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isBeneficiary && !schedule.revoked && releasable > 0n && (
                      <button
                        onClick={() => handleRelease(id)}
                        disabled={vesting.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#00D084] text-[#0B0F1A] text-xs font-semibold hover:bg-[#00D084]/90 transition-colors disabled:opacity-50"
                      >
                        {vesting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Release
                      </button>
                    )}
                    {isRevoker && schedule.revocable && !schedule.revoked && (
                      <button
                        onClick={() => handleRevoke(id)}
                        disabled={vesting.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#EF4444] text-white text-xs font-semibold hover:bg-[#EF4444]/90 transition-colors disabled:opacity-50"
                      >
                        {vesting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}
