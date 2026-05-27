interface Props {
  p: any
}

export function PageHeader({ p }: Props) {
  return (
    <div className="text-center md:text-left">
      <h1 className={`text-2xl font-bold ${p.textMain}`}>Settings</h1>
      <p className={`text-sm ${p.textMuted} mt-1`}>
        Manage your account and preferences
      </p>
    </div>
  )
}
