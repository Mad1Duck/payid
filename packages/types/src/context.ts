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
}
