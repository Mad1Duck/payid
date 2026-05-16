export function reputationBadge(score: number) {
  if (score >= 800) return { label: 'Trusted', color: '#00D084' }
  if (score >= 500) return { label: 'Established', color: '#0EA5E9' }
  return { label: 'New', color: '#64748B' }
}
