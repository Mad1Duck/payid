import type {
  RuleContext,
  RuleResult,
  RuleConfig
} from "payid-types";
import type { RuleSource } from "../resolver/types";
import type { UserOperation } from "../erc4337/types";
import type { ethers } from "ethers";

export interface PayIDClient {
  evaluate(
    context: RuleContext,
    rule: RuleConfig | RuleSource
  ): Promise<RuleResult>;
}

export interface PayIDServer {
  evaluateAndProve(params: {
    context: RuleContext;
    rule: RuleConfig | RuleSource;
    payId: string;
    owner: string;
    signer: ethers.Signer;
    chainId: number;
    verifyingContract: string;
    ttlSeconds?: number;
  }): Promise<{
    result: RuleResult;
    proof: any | null;
  }>;

  buildUserOperation(params: {
    proof: any;
    smartAccount: string;
    nonce: string;
    gas: any;
    targetContract: string;
    paymasterAndData?: string;
  }): UserOperation;
}
