export function shortHash(h: string): string {
  return h.slice(0, 10) + '…' + h.slice(-6)
}

export function shortAddr(a: string): string {
  return a.slice(0, 8) + '…' + a.slice(-6)
}

export function tsNow(): string {
  return new Date().toLocaleTimeString('id', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
