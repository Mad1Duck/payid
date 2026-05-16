// ── Storage upload helpers (Pinata + 0G) ──

export function getPinataJWT(): string {
  return (import.meta.env.VITE_PINATA_JWT as string | undefined) ?? ''
}

export function getPinataGW(): string {
  return (
    (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ??
    'https://gateway.pinata.cloud'
  ).replace(/\/$/, '')
}

export async function pinImage(
  dataUrl: string,
  name: string,
): Promise<{ cid: string; url: string }> {
  const jwt = getPinataJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const mime = dataUrl.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: mime }), name)
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok)
    throw new Error(`Pinata image upload failed: ${await res.text()}`)
  const {
    data: { cid },
  } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getPinataGW()}/ipfs/${cid}` }
}

export async function pinJson(
  data: unknown,
  name: string,
): Promise<{ cid: string; url: string }> {
  const jwt = getPinataJWT()
  if (!jwt) throw new Error('VITE_PINATA_JWT not set in .env')
  const fd = new FormData()
  fd.append(
    'file',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
    name,
  )
  fd.append('network', 'public')
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Pinata upload failed: ${await res.text()}`)
  const {
    data: { cid },
  } = (await res.json()) as { data: { cid: string } }
  return { cid, url: `${getPinataGW()}/ipfs/${cid}` }
}

/* ── 0G Storage helpers ── */
export function get0GIndexer(): string {
  return (
    (import.meta.env.VITE_ZGS_INDEXER_URL as string | undefined) ??
    'https://indexer-storage-testnet-turbo.0g.ai'
  ).replace(/\/$/, '')
}

export function get0GRpc(): string {
  return (
    (import.meta.env.VITE_ZGS_RPC_URL as string | undefined) ??
    'https://evmrpc-testnet.0g.ai'
  )
}

export function get0GGateway(): string {
  return (
    (import.meta.env.VITE_ZGS_INDEXER_URL as string | undefined) ??
    'https://indexer-storage-testnet-turbo.0g.ai'
  ).replace(/\/$/, '')
}

export async function upload0G(
  data: Uint8Array,
): Promise<{ rootHash: string; url: string }> {
  const { MemData, Indexer } = await import('@0gfoundation/0g-storage-ts-sdk')
  const { BrowserProvider } = await import('ethers')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum
  if (!eth) throw new Error('No injected wallet found')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(eth)
  const signer = await provider.getSigner()
  const indexer = new Indexer(get0GIndexer())
  const memData = new MemData(data)
  const [tree, treeErr] = await memData.merkleTree()
  if (treeErr) throw new Error(`0G merkle error: ${treeErr}`)
  const rootHash = (tree as { rootHash: () => string }).rootHash()
  const [, uploadErr] = await indexer.upload(memData, get0GRpc(), signer)
  if (uploadErr) throw new Error(`0G upload error: ${uploadErr}`)
  return { rootHash, url: `${get0GGateway()}/file?root=${rootHash}` }
}

/* ── URI → HTTP helper ── */
export function uriToHttp(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return `${getPinataGW()}/ipfs/${uri.slice(7)}`
  if (uri.startsWith('0g://'))
    return `${get0GGateway()}/file?root=${uri.slice(5)}`
  return uri
}

/* ── Unified storage upload (respects localStorage preference) ── */
export async function uploadWithPreference(
  data: string | object,
  preference: '0g' | 'ipfs',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer?: any,
): Promise<{ uri: string; url: string }> {
  if (preference === '0g' && signer) {
    const result = await upload0G(
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : new TextEncoder().encode(JSON.stringify(data)),
    )
    return { uri: `0g://${result.rootHash}`, url: result.url }
  } else if (preference === 'ipfs') {
    const result = await pinJson(data, 'rule.json')
    return { uri: `ipfs://${result.cid}`, url: result.url }
  }
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  const base64 = btoa(str)
  return { uri: `data:application/json;base64,${base64}`, url: '' }
}
