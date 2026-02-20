/**
 * @module eas
 * @description EAS (Ethereum Attestation Service) helper untuk client-side.
 * Fully serverless — fetch attestation UIDs langsung dari chain.
 *
 * EAS addresses:
 *   Mainnet  : 0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587
 *   Base     : 0x4200000000000000000000000000000000000021
 *   Optimism : 0x4200000000000000000000000000000000000020
 *   Arbitrum : 0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458
 *   Sepolia  : 0xC2679fBD37d54388Ce493F1DB75320D236e1815e
 */

import { ethers } from "ethers";

const EAS_ABI = [
  "function getAttestation(bytes32 uid) external view returns (tuple(bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address attester, address recipient, bool revocable, bytes data))",
  "function isAttestationValid(bytes32 uid) external view returns (bool)",
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schema)",
];

export interface EASAttestation {
  uid: string;
  schema: string;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  attester: string;
  recipient: string;
  revocable: boolean;
  data: string;
}

export interface EASClientOptions {
  easAddress: string;
  provider: ethers.Provider;
}

export class EASClient {
  private readonly contract: ethers.Contract;

  constructor(options: EASClientOptions) {
    this.contract = new ethers.Contract(
      options.easAddress,
      EAS_ABI,
      options.provider
    );
  }

  async getAttestation(uid: string): Promise<EASAttestation> {
    const raw = await this.contract.getFunction("getAttestation")(uid);
    return {
      uid: raw.uid,
      schema: raw.schema,
      time: raw.time,
      expirationTime: raw.expirationTime,
      revocationTime: raw.revocationTime,
      attester: raw.attester,
      recipient: raw.recipient,
      revocable: raw.revocable,
      data: raw.data,
    };
  }

  async isValid(uid: string): Promise<boolean> {
    const result = await this.contract.getFunction("isAttestationValid")(uid);
    return result as boolean;
  }

  async getAttestationUIDs(params: {
    recipient: string;
    schemaUID: string;
    attester?: string;
    fromBlock?: number;
  }): Promise<string[]> {
    const attestedFilter = this.contract.filters["Attested"];
    if (!attestedFilter) {
      throw new Error("EAS: Attested event not found in ABI");
    }

    const filter = attestedFilter(
      params.recipient,
      params.attester ?? null,
      null,
      params.schemaUID
    );

    const events = await this.contract.queryFilter(
      filter,
      params.fromBlock ?? 0
    );

    const uids = (events as ethers.EventLog[]).map(
      e => e.args["uid"] as string
    );

    const validUids: string[] = [];
    for (const uid of uids) {
      const valid = await this.isValid(uid);
      if (valid) validUids.push(uid);
    }

    return validUids;
  }

  /**
   * One-liner: dapat valid UIDs siap di-pass ke payETH/payERC20
   *
   * @example
   * const eas = new EASClient({ easAddress: EAS_ADDRESSES[11155111], provider })
   * const uids = await eas.getValidUIDs({ recipient: payerAddress, schemaUID: KYC_SCHEMA_UID })
   * await payWithPayID.payERC20(decision, sig, uids)
   */
  async getValidUIDs(params: {
    recipient: string;
    schemaUID: string;
    attester?: string;
    fromBlock?: number;
  }): Promise<string[]> {
    return this.getAttestationUIDs(params);
  }
}

export const EAS_ADDRESSES: Record<number, string> = {
  1: "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587", // Ethereum Mainnet
  8453: "0x4200000000000000000000000000000000000021", // Base
  10: "0x4200000000000000000000000000000000000020", // Optimism
  42161: "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458", // Arbitrum One
  11155111: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e", // Sepolia
  4202: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e", // Lisk Sepolia
};