import type { UserOperation } from "./types";

export function buildUserOperation(params: {
  sender: string;
  callData: string;
  nonce: string;
  gas: {
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  initCode?: string;
  paymasterAndData?: string;
}): UserOperation {
  return {
    sender: params.sender,
    nonce: params.nonce,
    initCode: params.initCode ?? "0x",
    callData: params.callData,
    callGasLimit: params.gas.callGasLimit,
    verificationGasLimit: params.gas.verificationGasLimit,
    preVerificationGas: params.gas.preVerificationGas,
    maxFeePerGas: params.gas.maxFeePerGas,
    maxPriorityFeePerGas: params.gas.maxPriorityFeePerGas,
    paymasterAndData: params.paymasterAndData ?? "0x",
    signature: "0x" // signed later by smart account
  };
}
