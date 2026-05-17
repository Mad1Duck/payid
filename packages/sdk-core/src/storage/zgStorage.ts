import { Indexer, Blob } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';

export interface ZGStorageConfig {
  nodeUrl: string;
  indexerUrl: string;
  privateKey: string;
}

export class ZGStorage {
  private indexer: Indexer;

  constructor(private config: ZGStorageConfig) {
    this.indexer = new Indexer(config.indexerUrl);
  }

  /**
   * Uploads data to 0G Storage
   * @param data The data to upload (string or object)
   * @returns The Merkle root hash of the uploaded data
   */
  async upload(data: any): Promise<string> {
    const provider = new ethers.JsonRpcProvider(this.config.nodeUrl);
    const wallet = new ethers.Wallet(this.config.privateKey, provider);

    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(content);

    const file = {
      name: 'metadata.json',
      size: uint8Array.length,
      type: 'application/json',
      lastModified: Date.now(),
      arrayBuffer: async () => uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength)
    };

    const blob = new Blob(file as any);

    const [result, err] = await this.indexer.upload(
      blob,
      this.config.nodeUrl,
      wallet
    );

    if (err) {
      throw new Error(`0G Storage Upload Error: ${err.message}`);
    }

    // Safe access using Type Guard
    if ("rootHash" in result) {
      return result.rootHash;
    } else {
      return result.rootHashes[0] ?? "";
    }
  }

  /**
   * Downloads data from 0G Storage
   * @param rootHash The Merkle root hash
   * @returns The downloaded data as string
   */
  async download(rootHash: string): Promise<string> {
    const blob = await this.indexer.download(rootHash, this.config.nodeUrl);
    if (!blob) throw new Error(`Data not found for hash: ${rootHash}`);
    return blob.toString();
  }
}
