export interface RuleContext {
  tx: {
    sender?: string;
    asset: string;
    amount: string;
    amountUsd?: string;
    chainId: number;
    receiver?: string;
  };
  payId?: {
    id: string;
    owner: string;
  };
  intent?: {
    type: "QR" | "DIRECT" | "API";
    expiresAt?: number;
    nonce?: string;
    issuer?: string;
  };
}
export interface TxContext {
  sender: string;
  receiver: string;
  asset: string;
  amount: string;
  amountUsd?: string; // USD equivalent (calculated from token price oracle)
  chainId: number;
  memo?: string;
}

export interface PayIdContext {
  id: string;
  owner: string;
}

export interface ContextV1 {
  tx: TxContext;
  payId: PayIdContext;
}
