---
id: react-integration
title: Integrasi React
sidebar_label: React Integration
---

# Integrasi PAY.ID di React App

---

## Instalasi

```bash
npm install @payid/sdk-core ethers
```

Taruh `rule_engine.wasm` di folder `public/`:

```bash
cp node_modules/@payid/sdk-core/wasm/rule_engine.wasm public/
```

---

## Config

```ts
// src/config/payid.ts
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

---

## Hook: `usePayID`

WASM di-load sekali, cached di instance level — tidak load ulang tiap `evaluate()`.

```ts
// src/hooks/usePayID.ts
import { useState, useEffect, useRef } from "react";
import { createPayID } from "@payid/sdk-core";

type PayIDInstance = ReturnType<typeof createPayID>;

export function usePayID() {
  const [payid, setPayid] = useState<PayIDInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/rule_engine.wasm");
        if (!res.ok) throw new Error("Failed to load rule_engine.wasm");
        const wasm = new Uint8Array(await res.arrayBuffer());
        setPayid(createPayID({ wasm }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Init failed");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return { payid, loading, error };
}
```

---

## Hook: `useWallet`

```ts
// src/hooks/useWallet.ts
import { useState, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { PAYID_CONTRACTS } from "@/config/payid";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!window.ethereum) return alert("Install MetaMask dulu!");
    setConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Auto switch ke Lisk Sepolia
      try {
        await provider.send("wallet_switchEthereumChain", [
          { chainId: `0x${PAYID_CONTRACTS.CHAIN_ID.toString(16)}` },
        ]);
      } catch {
        await provider.send("wallet_addEthereumChain", [{
          chainId: `0x${PAYID_CONTRACTS.CHAIN_ID.toString(16)}`,
          chainName: "Lisk Sepolia",
          rpcUrls: [PAYID_CONTRACTS.RPC_URL],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: ["https://sepolia-blockscout.lisk.com"],
        }]);
      }

      const s = await provider.getSigner();
      setSigner(s);
      setAddress(await s.getAddress());
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setSigner(null);
    setAddress(null);
  }, []);

  return { address, signer, connecting, connect, disconnect };
}
```

---

## Hook: `usePayment`

Gabungan semua logic payment dalam satu hook:

```ts
// src/hooks/usePayment.ts
import { useState } from "react";
import { ethers } from "ethers";
import { PAYID_CONTRACTS } from "@/config/payid";
import CombinedAbi from "@payid/sdk-core/abis/CombinedRuleStorage.json";
import RuleNFTAbi  from "@payid/sdk-core/abis/RuleItemERC721.json";
import PayWithAbi  from "@payid/sdk-core/abis/PayWithPayID.json";
import UsdcAbi     from "@payid/sdk-core/abis/MockUSDC.json";

type Step = "idle"|"loading-rules"|"evaluating"|"approving"|"sending"|"done"|"error";

export function usePayment() {
  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay({
    payid, signer, merchantAddress, amountUsdc, payIdName,
  }: {
    payid: any;
    signer: ethers.Signer;
    merchantAddress: string;
    amountUsdc: number;
    payIdName: string;
  }) {
    setError(null);
    setTxHash(null);
    const payerAddress = await signer.getAddress();
    const provider = signer.provider!;
    const AMOUNT = BigInt(Math.round(amountUsdc * 1_000_000));

    try {
      // ── Load rules dari chain + IPFS ─────────────────────────────
      setStep("loading-rules");
      const combined = new ethers.Contract(
        PAYID_CONTRACTS.COMBINED_RULE_STORAGE, CombinedAbi.abi, provider
      );
      const ruleSetHash = await combined.getFunction("activeRuleOf")(merchantAddress);
      if (ruleSetHash === ethers.ZeroHash) throw new Error("Merchant belum setup rules");

      const [, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

      const ruleConfigs = await Promise.all(
        (ruleRefs as any[]).map(async (ref) => {
          const nft = new ethers.Contract(ref.ruleNFT, RuleNFTAbi.abi, provider);

          // Cek expiry sebelum fetch
          const expiry: bigint = await nft.getFunction("ruleExpiry")(ref.tokenId);
          if (expiry < BigInt(Math.floor(Date.now() / 1000))) {
            throw new Error("Rule merchant sudah expired. Merchant perlu renew subscription.");
          }

          const tokenURI: string = await nft.getFunction("tokenURI")(ref.tokenId);
          const url = tokenURI.startsWith("ipfs://")
            ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
            : tokenURI;
          const meta = await fetch(url).then(r => r.json());
          return meta.rule;
        })
      );

      const authorityRule = {
        version: (version as bigint).toString(),
        logic: "AND" as const,
        rules: ruleConfigs,
      };

      // ── Evaluate + generate proof ─────────────────────────────────
      setStep("evaluating");
      const context = {
        tx: {
          sender: payerAddress,
          receiver: merchantAddress,
          asset: "USDC",
          amount: AMOUNT.toString(),
          chainId: PAYID_CONTRACTS.CHAIN_ID,
        },
        payId: { id: payIdName, owner: merchantAddress },
        env: { timestamp: Math.floor(Date.now() / 1000) },
        state: {
          spentTodayPlusTx: AMOUNT.toString(),
          dailyLimit: "50000000000",
        },
      };

      const { result, proof } = await payid.evaluateAndProve({
        context,
        authorityRule,
        payId: payIdName,
        payer: payerAddress,
        receiver: merchantAddress,
        asset: PAYID_CONTRACTS.USDC,
        amount: AMOUNT,
        signer,
        ttlSeconds: 60,
        verifyingContract: PAYID_CONTRACTS.PAYID_VERIFIER,
        ruleAuthority: PAYID_CONTRACTS.COMBINED_RULE_STORAGE,
      });

      if (!proof) {
        throw new Error(translateRejection(result.reason ?? result.code));
      }

      // ── Approve USDC ──────────────────────────────────────────────
      setStep("approving");
      const usdc = new ethers.Contract(PAYID_CONTRACTS.USDC, UsdcAbi.abi, signer);
      const allowance = await usdc.getFunction("allowance")(payerAddress, PAYID_CONTRACTS.PAY_WITH_PAYID);
      if ((allowance as bigint) < AMOUNT) {
        const tx = await usdc.getFunction("approve").send(PAYID_CONTRACTS.PAY_WITH_PAYID, AMOUNT);
        await tx.wait();
      }

      // ── Send payment ──────────────────────────────────────────────
      setStep("sending");
      const payContract = new ethers.Contract(
        PAYID_CONTRACTS.PAY_WITH_PAYID, PayWithAbi.abi, signer
      );
      const tx = await payContract.getFunction("payERC20").send(
        proof.payload, proof.signature, []
      );
      await tx.wait();
      setTxHash(tx.hash);
      setStep("done");
      return tx.hash;

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment gagal";
      setError(msg);
      setStep("error");
      throw err;
    }
  }

  return { pay, step, txHash, error };
}

function translateRejection(reason: string): string {
  if (reason?.includes("tx.asset")) return "Merchant hanya menerima USDC.";
  if (reason?.includes("min_amount")) return "Jumlah terlalu kecil.";
  if (reason?.includes("business_hours")) return "Di luar jam operasional merchant.";
  return `Payment ditolak: ${reason}`;
}
```

---

## Komponen: PaymentButton

```tsx
// src/components/PaymentButton.tsx
import { usePayID } from "@/hooks/usePayID";
import { useWallet } from "@/hooks/useWallet";
import { usePayment } from "@/hooks/usePayment";

interface Props {
  merchantAddress: string;
  amountUsdc: number;
  payIdName?: string;
  onSuccess?: (txHash: string) => void;
}

export function PaymentButton({ merchantAddress, amountUsdc, payIdName = "pay.id/merchant", onSuccess }: Props) {
  const { payid, loading: wasmLoading } = usePayID();
  const { address, signer, connecting, connect } = useWallet();
  const { pay, step, txHash, error } = usePayment();

  if (!address) {
    return (
      <button onClick={connect} disabled={connecting || wasmLoading}>
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  const labels: Record<typeof step, string> = {
    idle:           `Bayar ${amountUsdc} USDC`,
    "loading-rules": "Loading rules...",
    evaluating:     "Evaluating...",
    approving:      "Approve USDC...",
    sending:        "Sending...",
    done:           "✅ Berhasil!",
    error:          "Coba Lagi",
  };

  const isLoading = ["loading-rules","evaluating","approving","sending"].includes(step);

  async function handlePay() {
    if (!payid || !signer) return;
    const hash = await pay({ payid, signer, merchantAddress, amountUsdc, payIdName });
    if (hash) onSuccess?.(hash);
  }

  return (
    <div>
      <button onClick={handlePay} disabled={isLoading || wasmLoading || step === "done"}>
        {labels[step]}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {txHash && (
        <a href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`} target="_blank">
          Lihat Transaksi →
        </a>
      )}
    </div>
  );
}
```

---

## Pakai di Halaman

```tsx
// src/pages/Checkout.tsx
import { PaymentButton } from "@/components/PaymentButton";

export function CheckoutPage() {
  return (
    <PaymentButton
      merchantAddress="0xMERCHANT_ADDRESS"
      amountUsdc={150}
      payIdName="pay.id/merchant"
      onSuccess={(hash) => {
        console.log("Sukses! TX:", hash);
        // redirect ke success page
      }}
    />
  );
}
```

---

## Tips

**Load WASM sekali saja.** Pakai `usePayID` hook sebagai singleton — jangan instantiate `createPayID()` berulang-ulang.

**Proof TTL 60 detik.** Jangan cache proof. Generate baru setiap kali user mau bayar.

**Cek expiry sebelum fetch.** Rule NFT yang expired akan revert di contract. Lebih baik deteksi early di client daripada user dapat error onchain.

**Mobile wallet.** Untuk WalletConnect/mobile, ganti `BrowserProvider(window.ethereum)` dengan `Web3Modal` atau `wagmi`. Logic SDK-nya sama persis.
