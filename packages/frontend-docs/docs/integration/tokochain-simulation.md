---
id: tokochain-simulation
title: "Studi Kasus: TokoChain"
sidebar_label: "📦 Studi Kasus: TokoChain"
---

# Studi Kasus: TokoChain × PAY.ID

Simulasi integrasi produk nyata — **TokoChain** (payment app UMKM) dengan infrastruktur PAY.ID.

---

## Situasi

TokoChain punya smart contract payment sendiri, tapi **tidak ada filter** — semua transaksi lolos. Merchant tidak bisa set: terima USDC saja, minimum berapa, jam berapa saja.

Setelah integrasi PAY.ID, setiap merchant punya **payment policy** sendiri yang di-enforce on-chain secara otomatis.

---

## Flow Setelah Integrasi

```
MERCHANT (setup sekali di dashboard TokoChain):
  → Subscribe ke PAY.ID (0.0001 ETH / 30 hari)
  → Pilih rules: "USDC only, min 10rb, jam 8–22"
  → TokoChain mintkan Rule NFT + register ke CombinedRuleStorage

CUSTOMER (setiap bayar):
  → Klik "Bayar" di TokoChain
  → App evaluate rules (invisible, < 1 detik)
  → Wallet popup: "Sign untuk konfirmasi"  ← ini consent-nya
  → Transfer berhasil ✅
```

---

## Bagian 1: Subscription

Sebelum merchant bisa buat rule, perlu subscribe. Subscription menentukan:
- Berapa banyak rule slot (1 gratis, 3 dengan subscription)
- Sampai kapan Rule NFT berlaku (expiry = subscriptionExpiry)

```ts
// src/payid/subscription.ts
import { ethers } from "ethers";
import RuleNFTAbi from "@payid/sdk-core/abis/RuleItemERC721.json";

export async function subscribeToPayID(signer: ethers.Signer) {
  const ruleNFT = new ethers.Contract(
    PAYID_CONTRACTS.RULE_ITEM_ERC721, RuleNFTAbi.abi, signer
  );
  const address = await signer.getAddress();

  const hasActive = await ruleNFT.getFunction("hasSubscription")(address);
  if (hasActive) {
    const expiry = await ruleNFT.getFunction("subscriptionExpiry")(address);
    return { alreadyActive: true, expiry: new Date(Number(expiry) * 1000) };
  }

  const price = await ruleNFT.getFunction("subscriptionPriceETH")();
  const tx = await ruleNFT.getFunction("subscribe").send({ value: price });
  await tx.wait();

  const newExpiry = await ruleNFT.getFunction("subscriptionExpiry")(address);
  return { alreadyActive: false, expiry: new Date(Number(newExpiry) * 1000) };
}

export async function getSubscriptionStatus(address: string, provider: ethers.Provider) {
  const ruleNFT = new ethers.Contract(
    PAYID_CONTRACTS.RULE_ITEM_ERC721, RuleNFTAbi.abi, provider
  );
  const expiry = await ruleNFT.getFunction("subscriptionExpiry")(address) as bigint;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isActive = expiry >= now;
  const daysLeft = isActive ? Number((expiry - now) / 86400n) : 0;

  return {
    isActive,
    expiry: new Date(Number(expiry) * 1000),
    daysLeft,
    needsRenewal: daysLeft <= 7,
  };
}
```

:::warning Kalau Subscription Habis
`ruleExpiry[tokenId]` ikut expired → semua payment ke merchant: **REVERT** `RULE_LICENSE_EXPIRED`. TokoChain wajib kirim reminder ke merchant sebelum expired.
:::

---

## Bagian 2: Setup Rules Merchant

```ts
// src/payid/rule-setup.ts

// Rules merchant TokoChain: USDC only + min 10rb + jam 8-22
const RULES = [
  {
    id: "usdc_only",
    if: { field: "tx.asset", op: "==", value: "USDC" },
  },
  {
    id: "min_10k_idr",  // ~0.65 USDC
    if: { field: "tx.amount", op: ">=", value: "650000" },
  },
  {
    id: "business_hours",
    if: { field: "env.timestamp", op: "between", value: [8, 22] },
  },
];

export async function setupMerchantRules(signer: ethers.Signer) {
  const address = await signer.getAddress();
  const ruleNFT = new ethers.Contract(PAYID_CONTRACTS.RULE_ITEM_ERC721, RuleNFTAbi.abi, signer);
  const combined = new ethers.Contract(PAYID_CONTRACTS.COMBINED_RULE_STORAGE, CombinedAbi.abi, signer);

  // 1. Subscribe jika belum
  await subscribeToPayID(signer);

  // 2. Upload + create + activate tiap rule
  const tokenIds: bigint[] = [];
  for (const rule of RULES) {
    // Upload ke IPFS
    const uri = await uploadToPinata(rule);
    const hash = keccak256(toUtf8Bytes(canonicalize(rule)));

    // createRule
    const txCreate = await ruleNFT.getFunction("createRule").send(hash, uri);
    const receiptCreate = await txCreate.wait();
    const ruleId = getRuleIdFromReceipt(receiptCreate, ruleNFT);

    // activateRule → mint NFT, expiry = subscriptionExpiry
    const txActivate = await ruleNFT.getFunction("activateRule").send(ruleId);
    const receiptActivate = await txActivate.wait();
    const tokenId = getTokenIdFromReceipt(receiptActivate, ruleNFT);

    tokenIds.push(tokenId);
  }

  // 3. Build ruleSetHash
  const combinedJSON = canonicalize({ version: "1", logic: "AND", rules: RULES });
  const ruleSetHash = keccak256(toUtf8Bytes(combinedJSON));

  // 4. Register combined rule set (auto-aktif)
  await combined.getFunction("registerCombinedRule").send(
    ruleSetHash,
    Array(tokenIds.length).fill(PAYID_CONTRACTS.RULE_ITEM_ERC721),
    tokenIds,
    1n
  );

  return { ruleSetHash, tokenIds };
}
```

---

## Bagian 3: Contract TokoChain (Modified)

Perubahan minimal — hanya tambah verifikasi proof sebelum transfer:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPayIDVerifier {
    struct Decision {
        bytes32 version;
        bytes32 payId;
        address payer;
        address receiver;
        address asset;
        uint256 amount;
        bytes32 contextHash;
        bytes32 ruleSetHash;
        address ruleAuthority;
        uint64  issuedAt;
        uint64  expiresAt;
        bytes32 nonce;
        bool    requiresAttestation;
    }

    function requireAllowed(Decision calldata d, bytes calldata sig) external;
}

/**
 * @title TokoChainPay
 * @notice Payment contract TokoChain dengan PAY.ID enforcement.
 *         Deploy SEKALI, dipakai semua merchant.
 */
contract TokoChainPay {
    // Contract PAY.ID resmi — tidak bisa diganti
    IPayIDVerifier public constant PAYID_VERIFIER =
        IPayIDVerifier(0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9);

    event PaymentReceived(
        address indexed payer,
        address indexed receiver,
        address indexed token,
        uint256 amount,
        bytes32 payId,
        bytes32 nonce
    );

    function payMerchant(
        IPayIDVerifier.Decision calldata d,
        bytes calldata sig,
        bytes32[] calldata attestationUIDs  // [] kalau tidak butuh KYC
    ) external {
        // Verifikasi proof ke PAY.ID — akan REVERT kalau:
        //   - Signature tidak valid
        //   - Proof expired (> 60 detik)
        //   - Rule tidak ALLOW / license expired
        //   - Nonce sudah dipakai (replay protection)
        PAYID_VERIFIER.requireAllowed(d, sig);

        require(d.amount > 0, "ZERO_AMOUNT");
        require(d.receiver != address(0), "INVALID_RECEIVER");

        bool ok = IERC20(d.asset).transferFrom(d.payer, d.receiver, d.amount);
        require(ok, "TRANSFER_FAILED");

        emit PaymentReceived(d.payer, d.receiver, d.asset, d.amount, d.payId, d.nonce);
    }
}
```

---

## Bagian 4: Customer Payment (React)

```tsx
// Komponen checkout TokoChain — pakai hook dari React Integration
import { usePayID } from "@/hooks/usePayID";
import { useWallet } from "@/hooks/useWallet";
import { usePayment } from "@/hooks/usePayment";

// TOKOCHAIN_PAY_ADDRESS = address contract yang sudah di-deploy
const TOKOCHAIN_PAY = "0xYOUR_TOKOCHAIN_CONTRACT";

export function TokoChainCheckout({ merchant }) {
  const { payid } = usePayID();
  const { signer, address, connect } = useWallet();
  const { pay, step, txHash, error } = usePayment(TOKOCHAIN_PAY);

  if (!address) return <button onClick={connect}>Connect Wallet</button>;

  return (
    <div>
      <h3>Bayar ke {merchant.payId}</h3>
      <p>Jumlah: Rp 50.000</p>

      <button
        onClick={() => pay({ payid, signer, merchantAddress: merchant.address, amountUsdc: 3.2, payIdName: merchant.payId })}
        disabled={step !== "idle"}
      >
        {step === "idle" ? "Bayar Sekarang" : `${step}...`}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {txHash && <p>✅ Sukses! <a href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`}>Lihat TX</a></p>}
    </div>
  );
}
```

---

## Bagian 5: Monitoring Subscription

TokoChain perlu monitor subscription semua merchant — kalau expired, payment customer gagal:

```ts
// Cron job harian — kirim email reminder
export async function checkAllMerchants(merchants: string[]) {
  const provider = new ethers.JsonRpcProvider(PAYID_CONTRACTS.RPC_URL);

  for (const address of merchants) {
    const status = await getSubscriptionStatus(address, provider);

    if (!status.isActive) {
      await notifyMerchant(address, "EXPIRED",
        "⚠️ PAY.ID subscription expired! Customer tidak bisa bayar ke kamu."
      );
    } else if (status.needsRenewal) {
      await notifyMerchant(address, "WARNING",
        `Subscription habis ${status.daysLeft} hari lagi. Renew sekarang!`
      );
    }
  }
}
```

---

## Ringkasan: Siapa Bayar Apa

| Pihak | Biaya | Untuk |
|---|---|---|
| TokoChain | Gas deploy sekali | `TokoChainPay` contract |
| Merchant | 0.0001 ETH / 30 hari | Subscription PAY.ID |
| Merchant | Gas | Setup rules (create + activate + register) |
| Customer | Gas | Approve + payMerchant |

---

## Checklist Integrasi

```
SETUP AWAL (TokoChain):
  □ Deploy TokoChainPay contract
  □ Hardcode PAYID_VERIFIER address
  □ Setup monitoring cron job

ONBOARDING MERCHANT:
  □ Connect wallet di dashboard
  □ Subscribe ke PAY.ID
  □ Setup payment policy (pilih rules)
  □ TokoChain upload IPFS + mint NFT + register

SETIAP PAYMENT (customer):
  □ Load rules dari chain + IPFS     (otomatis)
  □ Evaluate rules off-chain         (otomatis)
  □ Customer sign proof              (MetaMask popup)
  □ Approve USDC jika perlu          (MetaMask popup)
  □ payMerchant()                    (MetaMask popup)

MAINTENANCE:
  □ Monitor subscription expiry tiap hari
  □ Kirim reminder 7 hari sebelum expired
  □ Alert urgent kalau sudah expired
```
