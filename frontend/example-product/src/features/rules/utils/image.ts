// ── Rule NFT image generator ──

export function genImage(ruleId: string, ruleHash: string): string {
  const c = document.createElement('canvas')
  c.width = 480
  c.height = 480
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 480, 480)
  g.addColorStop(0, '#060a06')
  g.addColorStop(1, '#0a1a0a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 480, 480)
  for (let y = 0; y < 480; y += 4) {
    ctx.fillStyle = 'rgba(0,255,127,0.012)'
    ctx.fillRect(0, y, 480, 2)
  }
  ctx.strokeStyle = '#004d26'
  ctx.lineWidth = 1.5
  ctx.strokeRect(16, 16, 448, 448)
  ;[
    [16, 16],
    [464, 16],
    [16, 464],
    [464, 464],
  ].forEach(([x, y]) => {
    ctx.strokeStyle = '#00ff7f'
    ctx.lineWidth = 1.5
    const dx = x === 16 ? 1 : -1
    const dy = y === 16 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(x, y + dy * 18)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * 18, y)
    ctx.stroke()
  })
  ctx.fillStyle = '#00ff7f'
  ctx.font = 'bold 22px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('PAY.ID', 240, 64)
  ctx.fillStyle = '#2d4d2d'
  ctx.font = '10px monospace'
  ctx.fillText('PROGRAMMABLE PAYMENT RULE', 240, 82)
  ctx.strokeStyle = '#1a2e1a'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, 96)
  ctx.lineTo(440, 96)
  ctx.stroke()
  ctx.fillStyle = '#004d26'
  ctx.font = 'bold 108px monospace'
  ctx.fillText('◈', 240, 242)
  ctx.fillStyle = 'rgba(0,255,127,0.07)'
  ctx.font = 'bold 112px monospace'
  ctx.fillText('◈', 240, 242)
  ctx.fillStyle = '#d4f5d4'
  ctx.font = 'bold 19px monospace'
  ctx.fillText(ruleId.toUpperCase().slice(0, 22), 240, 300)
  ctx.fillStyle = '#6b9b6b'
  ctx.font = '11px monospace'
  ctx.fillText('RULE NFT', 240, 320)
  ctx.strokeStyle = '#1a2e1a'
  ctx.beginPath()
  ctx.moveTo(40, 378)
  ctx.lineTo(440, 378)
  ctx.stroke()
  ctx.fillStyle = '#243824'
  ctx.font = '9px monospace'
  ctx.fillText(ruleHash.slice(0, 24) + '...', 240, 400)
  ctx.fillStyle = '#1a2e1a'
  ctx.font = '9px monospace'
  ctx.fillText('payid.rule.v1', 240, 452)
  return c.toDataURL('image/png')
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
