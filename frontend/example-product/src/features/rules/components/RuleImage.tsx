import { useEffect, useState } from 'react'
import { uriToHttp } from '../utils/storage'

export function RuleImage({ uri, className }: { uri: string; className?: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!uri) {
      setError(true)
      return
    }
    let cancelled = false

    const resolveImage = async () => {
      try {
        const url = uriToHttp(uri)

        // data: URIs are inline — try to parse JSON directly
        if (url.startsWith('data:')) {
          const base64 = url.split(',')[1]
          if (base64) {
            const json = JSON.parse(decodeURIComponent(escape(atob(base64))))
            const imageUri = json.image as string | undefined
            if (imageUri) {
              setImgSrc(uriToHttp(imageUri))
            } else {
              setError(true)
            }
          } else {
            setError(true)
          }
          return
        }

        const res = await fetch(url)
        if (!res.ok) {
          setError(true)
          return
        }
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('image/')) {
          // URI points directly to an image
          if (!cancelled) setImgSrc(url)
          return
        }
        // Likely JSON metadata — parse and extract image
        const json = await res.json()
        const imageUri = json.image as string | undefined
        if (imageUri && !cancelled) {
          setImgSrc(uriToHttp(imageUri))
        } else {
          setError(true)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    resolveImage()
    return () => {
      cancelled = true
    }
  }, [uri])

  if (imgSrc === null && !error)
    return (
      <div
        className={`animate-pulse rounded-lg ${className || ''}`}
        style={{ background: 'rgba(128,128,128,0.12)' }}
      />
    )

  if (error || !imgSrc)
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
      src={imgSrc}
      alt="Rule NFT"
      className={`object-cover rounded-lg ${className || ''}`}
      loading="lazy"
      onError={() => setError(true)}
    />
  )
}
