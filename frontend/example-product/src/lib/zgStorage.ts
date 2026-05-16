import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

/** Minimal EIP-1193 provider shape that BrowserProvider accepts. */
interface Eip1193Provider {
  request(args: { method: string; params?: any[]; }): Promise<any>;
}

export interface ZGStorageUploadOptions {
  /** 0G Storage chain RPC (default: https://evmrpc-testnet.0g.ai) */
  rpcUrl?: string;
  /** 0G Storage indexer URL (default: https://indexer-storage-testnet-turbo.0g.ai) */
  indexerUrl?: string;
  /** Optional: existing Indexer instance */
  indexer?: Indexer;
}

export interface ZGUploadResult {
  /** Merkle root hash of the uploaded blob */
  rootHash: string;
  /** Upload transaction hash */
  txHash: string;
  /** Number of bytes uploaded */
  size: number;
}

/** Turbo indexer (recommended) — faster, higher fees */
const DEFAULT_RPC_URL = 'https://evmrpc-testnet.0g.ai';
const DEFAULT_INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';

/**
 * Upload data to 0G Storage from the browser using a connected wallet.
 *
 * Official pattern (per 0G docs):
 *  1. Encode data to Uint8Array
 *  2. Wrap in MemData
 *  3. Call merkleTree() to compute root hash
 *  4. Call indexer.upload() with the data, RPC URL, and signer
 *
 * @param data     - Raw data to upload (string, object, or Uint8Array)
 * @param signer   - ethers v6 JsonRpcSigner from the connected wallet
 * @param options  - Optional RPC / indexer URLs
 * @returns Promise<ZGUploadResult> with rootHash & txHash
 *
 * @example
 * ```ts
 * // With wagmi/viem
 * const { data: client } = useConnectorClient();
 * const signer = await getEthersSigner(client?.transport);
 * const result = await uploadToZGStorage(jsonString, signer);
 * console.log(result.rootHash); // "0xabc..."
 * ```
 */
export async function uploadToZGStorage(
  data: string | object | Uint8Array,
  signer: JsonRpcSigner,
  options: ZGStorageUploadOptions = {}
): Promise<ZGUploadResult> {
  const rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
  const indexerUrl = options.indexerUrl || DEFAULT_INDEXER_URL;

  const indexer = options.indexer || new Indexer(indexerUrl);

  let bytes: Uint8Array;
  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new TextEncoder().encode(JSON.stringify(data));
  }

  const memData = new MemData(bytes);

  // Must call merkleTree() before upload — populates internal state
  const [, treeErr] = await memData.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G Storage merkle tree error: ${treeErr}`);
  }

  const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);

  if (uploadErr !== null) {
    throw new Error(`0G Storage upload failed: ${uploadErr}`);
  }

  // Handle both single and fragmented (>4GB) responses
  if ('rootHash' in tx) {
    return {
      rootHash: tx.rootHash as string,
      txHash: tx.txHash as string,
      size: bytes.length,
    };
  } else {
    const rootHashes = (tx as any).rootHashes ?? [];
    const txHashes = (tx as any).txHashes ?? [];
    return {
      rootHash: rootHashes[0] ?? '',
      txHash: txHashes[0] ?? '',
      size: bytes.length,
    };
  }
}

/**
 * Download data from 0G Storage by root hash.
 *
 * ⚠️ Browser limitation: `indexer.download()` uses Node.js `fs` internally
 * and does NOT work in browser. This function falls back to fetching via
 * the 0G indexer HTTP API instead.
 *
 * @param rootHash   - Merkle root hash of the blob
 * @param options    - Optional indexer URL
 * @returns Promise<string> with the raw content
 */
export async function downloadFromZGStorage(
  rootHash: string,
  options: Pick<ZGStorageUploadOptions, 'indexerUrl'> = {}
): Promise<string> {
  const indexerUrl = options.indexerUrl || DEFAULT_INDEXER_URL;

  // Browser-safe: fetch via indexer REST API
  const url = `${indexerUrl}/blob/${rootHash}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`0G Storage download failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

/**
 * Create an ethers v6 signer from a wagmi/viem connector transport.
 * Use this when you have `client.transport` from `useConnectorClient()`.
 *
 * @param transport - viem Transport from wagmi connector client
 * @returns Promise<JsonRpcSigner>
 *
 * @example
 * ```ts
 * const { data: client } = useConnectorClient();
 * const signer = await getEthersSigner(client?.transport);
 * ```
 */
export async function getEthersSigner(transport: Eip1193Provider): Promise<JsonRpcSigner> {
  const provider = new BrowserProvider(transport);
  return provider.getSigner();
}

/**
 * Build a 0G Storage URI (`0g://<rootHash>`) for use in metadata / contracts.
 */
export function buildZgUri(rootHash: string): string {
  return `0g://${rootHash}`;
}
