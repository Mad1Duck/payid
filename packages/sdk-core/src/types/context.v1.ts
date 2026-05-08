export interface RuleContext {
  tx: {
    sender?: string;
    asset: string;
    amount: string;
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
