import type { AiDecision } from '../types'

export function parseDecision(text: string): AiDecision | null {
  try {
    const m = text.match(/\{[\s\S]*?"decision"[\s\S]*?\}/)
    if (!m) return null
    return JSON.parse(m[0])
  } catch {
    return null
  }
}
