export const RULE_OBJECT = {
  id: "vip_path",
  logic: "AND",
  conditions: [
    { field: "tx.amount", op: ">=", value: "1000000000" },
  ],
  message: "Jalur VIP: amount minimal 1000 USDC + KYC level 2",
};