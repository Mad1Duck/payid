---
id: react-integration
title: Integrasi React
sidebar_label: React Integration
---

# Integrasi React

## Install

```bash
npm install @payid/sdk-core ethers
```

## Hook: `usePayID`

```ts
import { useState, useEffect } from "react";
import { createPayID } from "payid/client";

export function usePayID() {
  const [payid, setPayid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setPayid(createPayID({})); }
    finally { setLoading(false); }
  }, []);

  return { payid, loading };
}
```

## Hook: `useWallet`

```ts
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [signer, setSigner] = useState(null);

  const connect = useCallback(async () => {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const s = await provider.getSigner();
    setSigner(s);
    setAddress(await s.getAddress());
  }, []);

  return { address, signer, connect };
}
```

## Komponen: PaymentButton

```tsx
export function PaymentButton({ merchantAddress, amountUsdc, onSuccess }) {
  const { payid } = usePayID();
  const { address, signer, connect } = useWallet();
  const { pay, step, txHash, error } = usePayment();

  if (!address) return <button onClick={connect}>Hubungkan Wallet</button>;

  const labels = {
    idle: `Bayar ${amountUsdc} USDC`,
    "loading-rules": "Memuat...",
    evaluating: "Mengevaluasi...",
    approving: "Menyetujui...",
    sending: "Mengirim...",
    done: "✅ Selesai!",
    error: "Coba Lagi",
  };

  return (
    <div>
      <button onClick={() => pay({ payid, signer, merchantAddress, amountUsdc })}
        disabled={["loading-rules","evaluating","approving","sending"].includes(step)}>
        {labels[step]}
      </button>
      {txHash && <a href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`} target="_blank">Lihat TX →</a>}
    </div>
  );
}
```

## Tips

**Inisialisasi SDK sekali.** Gunakan hook `usePayID` sebagai singleton.

**Jangan cache proof.** Generate proof baru setiap kali user ingin bayar.
