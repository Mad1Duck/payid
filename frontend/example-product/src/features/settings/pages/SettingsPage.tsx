import { motion } from 'framer-motion'
import {
  Globe,
  Bell,
  Shield,
  Wallet,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Crown,
  Zap,
  Database,
  Cloud,
} from 'lucide-react'
import PremiumButton from '@/components/v4/PremiumButton'
import { shortAddr } from '@/features/shared/utils/address'
import { Avatar } from '@/features/shared/components/Avatar'
import { useSettingsPage } from '../hooks/useSettingsPage'

export default function SettingsPage() {
  const {
    p, toggle, address, isConnected, payId,
    storageProvider, setStorageProvider,
    sub, subscribe, subPending, price, daysLeft,
    notifyState, subNotify, unsubNotify,
  } = useSettingsPage()

  const settings = [
    { icon: Globe, label: 'Currency', value: 'USD', color: '#0EA5E9' },
    {
      icon: Bell,
      label: 'Notifications',
      value: notifyState.subscribed
        ? 'On'
        : notifyState.permission === 'denied'
          ? 'Blocked'
          : 'Off',
      color: '#F59E0B',
      onClick: notifyState.subscribed ? unsubNotify : subNotify,
    },
    { icon: Shield, label: 'Security', value: 'Biometric', color: '#00D084' },
    {
      icon: Wallet,
      label: 'Network',
      value: 'Hardhat · 31337',
      color: '#8B5CF6',
    },
  ]

  const storageOptions = [
    {
      value: '0g' as const,
      label: '0G Storage',
      icon: Database,
      description: 'Persistent on-chain storage via 0G network',
      color: '#8B5CF6',
    },
    {
      value: 'ipfs' as const,
      icon: Cloud,
      label: 'IPFS',
      description: 'Decentralized file storage via IPFS',
      color: '#0EA5E9',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="text-center md:text-left">
        <h1 className={`text-2xl font-bold ${p.textMain}`}>Settings</h1>
        <p className={`text-sm ${p.textMuted} mt-1`}>
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <Avatar name={isConnected && address ? address : 'demo'} size={56} />
            <div className="flex-1">
              <div className="text-white text-lg font-semibold">{payId}</div>
              <div className="text-white/70 text-xs font-mono mt-0.5">
                {isConnected && address ? shortAddr(address) : 'Not connected'}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
      </motion.div>

      {/* Subscription Card */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          whileHover={{ scale: 1.01 }}
          className="rounded-2xl p-5 relative backdrop-blur-20 overflow-hidden"
          style={{
            background: sub?.isActive
              ? 'rgba(0,208,132,0.08)'
              : p.glass.bg,
            border: p.glass.border,
          }}
        >
          <div className="relative flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sub?.isActive ? 'bg-[#00D084]/10' : 'bg-[#F59E0B]/10'}`}
            >
              {sub?.isActive ? (
                <Crown className="w-6 h-6 text-[#00D084]" />
              ) : (
                <Zap className="w-6 h-6 text-[#F59E0B]" />
              )}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-semibold ${p.textMain}`}>
                {sub?.isActive ? 'Pro Subscription' : 'Free Tier'}
              </div>
              <div className={`text-xs ${p.textMuted}`}>
                {sub?.isActive
                  ? `${daysLeft} days remaining · ${sub.logicalRuleCount} / ${sub.maxSlots} slots`
                  : `${sub?.logicalRuleCount ?? 0} / 1 slot · upgrade for 3 slots`}
              </div>
            </div>
            {!sub?.isActive ? (
              <PremiumButton
                onClick={() => subscribe(price)}
                disabled={subPending}
                isLoading={subPending}
                size="sm"
              >
                Upgrade
              </PremiumButton>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00D084]/10 text-[#00D084]">
                Active
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Theme Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.dark ? 'bg-white/4' : 'bg-black/4'}`}
            >
              {p.dark ? (
                <Moon className="w-5 h-5 text-[#64748B]" />
              ) : (
                <Sun className="w-5 h-5 text-[#F59E0B]" />
              )}
            </div>
            <div>
              <div className={`text-sm font-medium ${p.textMain}`}>
                Appearance
              </div>
              <div className={`text-xs ${p.textMuted}`}>
                {p.dark ? 'Dark' : 'Light'} mode
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${p.dark ? 'bg-[#00D084]/30' : 'bg-[#00D084]/20'}`}
          >
            <motion.div
              animate={{ x: p.dark ? 0 : 20 }}
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform`}
            />
          </motion.button>
        </div>
      </motion.div>

      {/* Storage Preference */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className={`text-sm font-medium ${p.textMain} mb-3`}>
          Storage Preference
        </div>
        <div className="space-y-2">
          {storageOptions.map((option) => {
            const Icon = option.icon
            const isSelected = storageProvider === option.value
            return (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setStorageProvider(option.value)}
                className={`relative flex items-center gap-3 p-3 rounded-xl w-full text-left transition-colors ${
                  isSelected
                    ? 'bg-[#00D084]/10 border border-[#00D084]/30'
                    : p.cardHover
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${option.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: option.color }} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${p.textMain}`}>
                    {option.label}
                  </div>
                  <div className={`text-xs ${p.textMuted}`}>
                    {option.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#00D084] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Settings List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl p-2 relative backdrop-blur-20"
        style={{ background: p.glass.bg, border: p.glass.border }}
      >
        <div className="relative space-y-1">
          {settings.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.label}
                onClick={item.onClick}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl w-full text-left transition-colors ${p.cardHover} cursor-pointer`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${p.textMain}`}>{item.label}</div>
                </div>
                <div className={`text-xs ${p.textMuted}`}>{item.value}</div>
                <ChevronRight className={`w-4 h-4 ${p.textMuted}`} />
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Disconnect */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl p-5 relative backdrop-blur-20"
        style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}
      >
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#EF4444]/10">
            <LogOut className="w-5 h-5 text-[#EF4444]" />
          </div>
          <div className="flex-1">
            <div className={`text-sm font-medium ${p.textMain}`}>Disconnect Wallet</div>
            <div className={`text-xs ${p.textMuted}`}>Sign out of your account</div>
          </div>
          <PremiumButton
            variant="ghost"
            size="sm"
            className="text-[#EF4444] hover:bg-[#EF4444]/10"
          >
            Disconnect
          </PremiumButton>
        </div>
      </motion.div>
    </div>
  )
}
