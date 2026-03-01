---
id: react-integration
title: React Integration
sidebar_label: React Integration
---

# React Integration

## Install

```bash
npm install @payid/sdk-core ethers
```

## Config

```ts
export const PAYID_CONTRACTS = {
  CHAIN_ID: 4202,
  RPC_URL: "https://rpc.sepolia-api.lisk.com",
  RULE_ITEM_ERC721:      "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  COMBINED_RULE_STORAGE: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  PAYID_VERIFIER:        "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  PAY_WITH_PAYID:        "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  USDC:                  "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
} as const;
```

## Hook: `usePayID`

The SDK is initialized once, cached at instance level.

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
import { useState, useCallback } from "react";
import { BrowserProvider } from "ethers";

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [signer, setSigner] = useState(null);

  const connect = useCallback(async () => {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await provider.send("wallet_switchEthereumChain", [
      { chainId: `0x${PAYID_CONTRACTS.CHAIN_ID.toString(16)}` }
    ]);
    const s = await provider.getSigner();
    setSigner(s);
    setAddress(await s.getAddress());
  }, []);

  return { address, signer, connect };
}
```

## Hook: `usePayment`

```ts
type Step = "idle"|"loading-rules"|"evaluating"|"approving"|"sending"|"done"|"error";

export function usePayment() {
  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  async function pay({ payid, signer, merchantAddress, amountUsdc, payIdName }) {
    const AMOUNT = BigInt(Math.round(amountUsdc * 1_000_000));
    const payerAddress = await signer.getAddress();
    const provider = signer.provider;

    setStep("loading-rules");
    const [, ruleRefs, version] = await combined.getFunction("getRuleByHash")(
      await combined.getFunction("activeRuleOf")(merchantAddress)
    );
    const ruleConfigs = await Promise.all(ruleRefs.map(fetchRule));
    const authorityRule = { version: version.toString(), logic: "AND" as const, rules: ruleConfigs };

    setStep("evaluating");
    const { result, proof } = await payid.evaluateAndProve({
      context: buildContext(payerAddress, merchantAddress, AMOUNT, payIdName),
      authorityRule,
      payId: payIdName, payer: payerAddress, receiver: merchantAddress,
      asset: PAYID_CONTRACTS.USDC, amount: AMOUNT,
      signer, ttlSeconds: 300,
      verifyingContract: PAYID_CONTRACTS.PAYID_VERIFIER,
      ruleAuthority: PAYID_CONTRACTS.COMBINED_RULE_STORAGE,
      chainId: PAYID_CONTRACTS.CHAIN_ID,
    });

    if (!proof) throw new Error(`Rejected: ${result.reason ?? result.code}`);

    setStep("approving");
    const allowance = await usdc.getFunction("allowance")(payerAddress, PAYID_CONTRACTS.PAY_WITH_PAYID);
    if (allowance < AMOUNT) await (await usdc.getFunction("approve").send(PAYID_CONTRACTS.PAY_WITH_PAYID, AMOUNT)).wait();

    setStep("sending");
    const tx = await payContract.getFunction("payERC20").send(proof.payload, proof.signature, []);
    await tx.wait();
    setTxHash(tx.hash);
    setStep("done");
  }

  return { pay, step, txHash, error };
}
```

## Component: PaymentButton

```tsx
export function PaymentButton({ merchantAddress, amountUsdc, payIdName = "pay.id/merchant", onSuccess }) {
  const { payid, loading } = usePayID();
  const { address, signer, connect } = useWallet();
  const { pay, step, txHash, error } = usePayment();

  if (!address) return <button onClick={connect}>Connect Wallet</button>;

  const labels = { idle: `Pay ${amountUsdc} USDC`, "loading-rules": "Loading...",
    evaluating: "Evaluating...", approving: "Approving...", sending: "Sending...",
    done: "✅ Done!", error: "Retry" };

  return (
    <div>
      <button onClick={() => pay({ payid, signer, merchantAddress, amountUsdc, payIdName }).then(h => onSuccess?.(h))}
        disabled={["loading-rules","evaluating","approving","sending"].includes(step) || loading}>
        {labels[step]}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {txHash && <a href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`} target="_blank">View TX →</a>}
    </div>
  );
}
```

## Tips

**Initialize the SDK once.** Use the `usePayID` hook as a singleton.

**Never cache a proof.** Generate a new one every time the user wants to pay.

**Check expiry before fetching.** An expired Rule NFT will revert on-chain — better to detect it early client-side.
