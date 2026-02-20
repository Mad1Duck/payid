export const RULE_OBJECT = {
  "_comment": "Blokir amount kelipatan 666",
  "id": "no_cursed",
  "if": { "field": "tx.amount|mod:666000000", "op": "!=", "value": 0 },
  "message": "666 USDC? Duit setan, ditolak 👹"
};