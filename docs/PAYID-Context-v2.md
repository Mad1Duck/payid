# PAY.ID Context Schema v2

## Backward Compatibility

PAY.ID v1 context remains valid and unchanged.

v2 only ADDS optional fields.

---

## Context v1 (Unchanged)

```json
{
  "tx": {
    "sender": "address",
    "receiver": "address",
    "asset": "string",
    "amount": "string",
    "chainId": "number"
  },
  "payId": {
    "id": "string",
    "owner": "address"
  }
}
```

---

## Context v2 Extensions

### env (Time Attestation)

```json
{
  "env": {
    "timestamp": 1717000000,
    "proof": {
      "issuer": "0xTIME_AUTH",
      "issuedAt": 1716990000,
      "expiresAt": 1717000600,
      "signature": "0x..."
    }
  }
}
```

---

### state (Cumulative Snapshot)

```json
{
  "state": {
    "spentToday": "700000000",
    "period": "2025-06-01",
    "proof": {
      "issuer": "0xSTATE_AUTH",
      "issuedAt": 1716990000,
      "expiresAt": 1717000600,
      "signature": "0x..."
    }
  }
}
```

---

### oracle (Oracle Snapshot)

```json
{
  "oracle": {
    "ethUsd": "3500",
    "blockNumber": 19800000,
    "proof": {
      "issuer": "0xORACLE",
      "issuedAt": 1716990000,
      "expiresAt": 1717000600,
      "signature": "0x..."
    }
  }
}
```

---

### risk (Risk Scoring)

```json
{
  "risk": {
    "score": 42,
    "category": "LOW",
    "proof": {
      "issuer": "0xRISK_PROVIDER",
      "modelHash": "0xMODEL",
      "issuedAt": 1716990000,
      "expiresAt": 1717000600,
      "signature": "0x..."
    }
  }
}
```

---

## Rule Requirements Declaration

Rules may declare required context fields:

```json
{
  "requires": ["env.timestamp", "state.spentToday"]
}
```

Missing required fields MUST result in REJECT.

---

## End
