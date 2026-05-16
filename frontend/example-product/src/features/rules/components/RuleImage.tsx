import { useEffect, useState } from 'react'
import { uriToHttp } from '../utils/storage'

export function RuleImage({ uri, className }: { uri: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!uri) return
    const url = uriToHttp(uri)
    let cancelled = false
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        if (r.ok && !cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setSrc('')
      })
    return () => {
      cancelled = true
    }
  }, [uri])
  if (src === null)
    return (
      <div
        className={`animate-pulse rounded-lg ${className || ''}`}
        style={{ background: 'rgba(128,128,128,0.12)' }}
      />
    )
  if (!src)
    return (
      <div
        className={`flex items-center justify-center rounded-lg text-xs text-gray-500 ${className || ''}`}
        style={{ background: 'rgba(128,128,128,0.08)' }}
      >
        No image
      </div>
    )
  return (
    <img
      src={src}
      alt="Rule NFT"
      className={`object-cover rounded-lg ${className || ''}`}
      loading="lazy"
    />
  )
}
