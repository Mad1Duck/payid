import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

/** Minimal EIP-1193 provider shape that BrowserProvider accepts. */
export interface Eip1193Provider {
  request(args: { method: string; params?: any[]; }): Promise<any>;
}

export interface StorageUploadOptions {
  /** 0G Storage chain RPC (default: https://evmrpc-testnet.0g.ai) */
  rpcUrl?: string;
  /** 0G Storage indexer URL (default: https://indexer-storage-testnet-turbo.0g.ai) */
  indexerUrl?: string;
  /** IPFS gateway for download fallback (default: https://ipfs.io/ipfs) */
  ipfsGateway?: string;
  /** Optional: existing 0G Indexer instance */
  indexer?: Indexer;
}

export interface StorageUploadResult {
  /** Storage URI: 0g://<hash> or ipfs://<cid> or data:... */
  uri: string;
  /** Content hash (keccak256 or CID) */
  hash: string;
  /** Upload transaction hash (0G only) */
  txHash?: string;
  /** Number of bytes uploaded */
  size: number;
  /** Which storage was used */
  provider: '0g' | 'ipfs' | 'inline';
}

/** ─── Constants ─────────────────────────────────────────── */

const DEFAULT_0G_RPC = 'https://evmrpc-testnet.0g.ai';
const DEFAULT_0G_INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';

/** Fallback 0G endpoints to try for browser download (CORS) */
const ZG_DOWNLOAD_ENDPOINTS = [
  'https://indexer-storage-testnet-turbo.0g.ai',
  'https://indexer-testnet.0g.ai',
  'https://storage-node.0g.ai',
];

/** IPFS gateways that support CORS */
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs',
];

/** ─── 0G Storage ────────────────────────────────────────── */

/**
 * Upload data to 0G Storage from the browser.
 *
 * Official SDK pattern:
 *  1. Encode data → Uint8Array
 *  2. Wrap in MemData
 *  3. Call merkleTree()
 *  4. indexer.upload(data, rpcUrl, signer)
 */
export async function uploadTo0G(
  data: string | object | Uint8Array,
  signer: JsonRpcSigner,
  options: Pick<StorageUploadOptions, 'rpcUrl' | 'indexerUrl' | 'indexer'> = {}
): Promise<StorageUploadResult> {
  const rpcUrl = options.rpcUrl || DEFAULT_0G_RPC;
  const indexerUrl = options.indexerUrl || DEFAULT_0G_INDEXER;
  const indexer = options.indexer || new Indexer(indexerUrl);

  let bytes: Uint8Array;
  if (data instanceof Uint8Array) bytes = data;
  else if (typeof data === 'string') bytes = new TextEncoder().encode(data);
  else bytes = new TextEncoder().encode(JSON.stringify(data));

  const memData = new MemData(bytes);

  const [, treeErr] = await memData.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G merkle tree error: ${treeErr}`);
  }

  const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
  if (uploadErr !== null) {
    throw new Error(`0G upload error: ${uploadErr}`);
  }

  if ('rootHash' in tx) {
    return {
      uri: `0g://${tx.rootHash}`,
      hash: tx.rootHash as string,
      txHash: tx.txHash as string,
      size: bytes.length,
      provider: '0g',
    };
  } else {
    const rootHashes = (tx as any).rootHashes ?? [];
    const txHashes = (tx as any).txHashes ?? [];
    return {
      uri: `0g://${rootHashes[0] ?? ''}`,
      hash: rootHashes[0] ?? '',
      txHash: txHashes[0] ?? '',
      size: bytes.length,
      provider: '0g',
    };
  }
}

/**
 * Download from 0G Storage by root hash.
 *
 * Tries multiple endpoints (CORS-friendly). Falls back to showing
 * a direct URL if all fail.
 *
 * @returns Object with `data` on success, or `corsBlocked: true` + `url`
 */
export async function downloadFrom0G(
  rootHash: string,
  options: Pick<StorageUploadOptions, 'indexerUrl'> = {}
): Promise<{ data: string; } | { corsBlocked: true; url: string; }> {
  const endpoints = options.indexerUrl
    ? [options.indexerUrl, ...ZG_DOWNLOAD_ENDPOINTS.filter((u) => u !== options.indexerUrl)]
    : ZG_DOWNLOAD_ENDPOINTS;

  for (const base of endpoints) {
    const url = `${base}/blob/${rootHash}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.text();
        return { data };
      }
    } catch {
      /* CORS or network error — try next endpoint */
    }
  }

  // All endpoints failed — likely CORS
  return { corsBlocked: true, url: `https://indexer-storage-testnet-turbo.0g.ai/blob/${rootHash}` };
}

/** ─── IPFS ─────────────────────────────────────────────── */

/**
 * Upload data to IPFS via a public pinning service (Pinata).
 *
 * Requires `VITE_PINATA_JWT` in .env for authenticated uploads.
 * Falls back to base64 inline if no JWT.
 */
export async function uploadToIPFS(
  data: string | object | Uint8Array
): Promise<StorageUploadResult> {
  const jwt = import.meta.env?.VITE_PINATA_JWT as string | undefined;

  let content: Blob;
  if (data instanceof Uint8Array) {
    content = new Blob([data as unknown as ArrayBuffer]);
  } else if (typeof data === 'string') {
    content = new Blob([data], { type: 'application/json' });
  } else {
    content = new Blob([JSON.stringify(data)], { type: 'application/json' });
  }

  // If no Pinata JWT, fall back to inline
  if (!jwt) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return {
      uri: `data:application/json;base64,${base64}`,
      hash: '',
      size: str.length,
      provider: 'inline',
    };
  }

  const form = new FormData();
  form.append('file', content, 'metadata.json');

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`IPFS upload failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const cid = json.IpfsHash as string;

  return {
    uri: `ipfs://${cid}`,
    hash: cid,
    size: content instanceof Blob ? await content.arrayBuffer().then((b) => b.byteLength) : (content as string).length,
    provider: 'ipfs',
  };
}

/**
 * Download from IPFS by CID.
 *
 * Tries multiple CORS-friendly public gateways.
 */
export async function downloadFromIPFS(
  cid: string,
  options: Pick<StorageUploadOptions, 'ipfsGateway'> = {}
): Promise<string> {
  const gateways = options.ipfsGateway
    ? [options.ipfsGateway, ...IPFS_GATEWAYS.filter((g) => g !== options.ipfsGateway)]
    : IPFS_GATEWAYS;

  for (const gateway of gateways) {
    const url = `${gateway}/${cid}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return await res.text();
    } catch {
      /* try next gateway */
    }
  }

  throw new Error(`IPFS download failed for CID ${cid} (tried ${gateways.length} gateways)`);
}

/** ─── Generic ─────────────────────────────────────────── */

/**
 * Resolve any storage URI and download its content.
 *
 * Supports:
 *   0g://<rootHash>   → downloadFrom0G
 *   ipfs://<cid>      → downloadFromIPFS
 *   data:...          → inline base64 decode
 *   http(s)://...     → direct fetch
 */
export async function resolveStorageURI(uri: string): Promise<string> {
  if (uri.startsWith('0g://')) {
    const rootHash = uri.replace('0g://', '');
    const result = await downloadFrom0G(rootHash);
    if ('data' in result) return result.data;
    throw new Error(`0G Storage CORS blocked. Open manually: ${result.url}`);
  }

  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '');
    return downloadFromIPFS(cid);
  }

  if (uri.startsWith('data:')) {
    // data:application/json;base64,<base64>
    const base64 = uri.split(',')[1];
    if (!base64) throw new Error('Invalid data URI');
    return decodeURIComponent(escape(atob(base64)));
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  throw new Error(`Unsupported storage URI scheme: ${uri.slice(0, 20)}...`);
}

/**
 * Upload to best available storage provider.
 *
 * Priority: 0G (if signer provided) → IPFS (if Pinata JWT) → inline base64
 */
export async function uploadToBestStorage(
  data: string | object | Uint8Array,
  opts: {
    signer?: JsonRpcSigner;
    prefer0g?: boolean;
    preferIPFS?: boolean;
  } & StorageUploadOptions = {}
): Promise<StorageUploadResult> {
  if (opts.prefer0g && opts.signer) {
    try {
      return await uploadTo0G(data, opts.signer, opts);
    } catch {
      /* fall through */
    }
  }

  if (opts.preferIPFS || !opts.signer) {
    try {
      return await uploadToIPFS(data);
    } catch {
      /* fall through */
    }
  }

  // Final fallback: inline base64
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return {
    uri: `data:application/json;base64,${base64}`,
    hash: '',
    size: str.length,
    provider: 'inline',
  };
}

/** ─── Helpers ─────────────────────────────────────────── */

/**
 * Create an ethers v6 signer from a wagmi/viem connector transport.
 */
export async function getEthersSigner(transport: Eip1193Provider): Promise<JsonRpcSigner> {
  const provider = new BrowserProvider(transport);
  return provider.getSigner();
}

/**
 * Detect storage provider from URI string.
 */
export function detectStorageProvider(uri: string): '0g' | 'ipfs' | 'inline' | 'http' | 'unknown' {
  if (uri.startsWith('0g://')) return '0g';
  if (uri.startsWith('ipfs://')) return 'ipfs';
  if (uri.startsWith('data:')) return 'inline';
  if (uri.startsWith('http://') || uri.startsWith('https://')) return 'http';
  return 'unknown';
}

/**
 * Build a 0G Storage URI from root hash.
 */
export function buildZgUri(rootHash: string): string {
  return `0g://${rootHash}`;
}

/**
 * Build an IPFS URI from CID.
 */
export function buildIpfsUri(cid: string): string {
  return `ipfs://${cid}`;
}
