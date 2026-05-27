import { Globe, Bell, Shield, Wallet } from 'lucide-react'
import { useSettingsPage } from '../hooks/useSettingsPage'
import {
  PageHeader,
  ProfileCard,
  SubscriptionCard,
  ThemeToggle,
  StoragePreference,
  SettingsList,
  DisconnectButton,
} from '../components'

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader p={p} />

      <ProfileCard p={p} isConnected={isConnected} address={address} payId={payId} />

      {isConnected && (
        <SubscriptionCard
          p={p}
          sub={sub}
          daysLeft={daysLeft}
          price={price}
          subscribe={subscribe}
          subPending={subPending}
        />
      )}

      <ThemeToggle p={p} toggle={toggle} />

      <StoragePreference
        p={p}
        storageProvider={storageProvider}
        setStorageProvider={setStorageProvider}
      />

      <SettingsList p={p} settings={settings} />

      <DisconnectButton p={p} />
    </div>
  )
}
