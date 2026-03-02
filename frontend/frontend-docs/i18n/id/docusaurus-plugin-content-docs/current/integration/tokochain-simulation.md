---
id: tokochain-simulation
title: 'Studi Kasus: TokoChain'
sidebar_label: ' Case Study: TokoChain'
---

# Studi Kasus: TokoChain × PAY.ID

Simulasi integrasi dunia nyata — **TokoChain** (aplikasi pembayaran UMKM) dengan infrastruktur PAY.ID.

**Situasi:** TokoChain punya smart contract payment sendiri tapi tanpa filtering — semua transaksi langsung lolos. Merchant tidak bisa konfigurasi: USDC only, minimum amount, atau jam operasional.

Setelah integrasi PAY.ID, setiap merchant punya **payment policy** sendiri yang di-enforce on-chain secara otomatis.

---

## Flow Terintegrasi

```
MERCHANT (setup sekali di dashboard TokoChain):
  → Subscribe ke PAY.ID (0.0001 ETH / 30 hari)
  → Pilih rules: "USDC only, min 10rb IDR, jam 8–22"
  → TokoChain mint Rule NFT + register ke CombinedRuleStorage

CUSTOMER (setiap payment):
  → Tap "Bayar" di TokoChain
  → App evaluasi rules (invisible, < 1 detik)
  → Popup wallet: "Tanda tangan untuk konfirmasi"
  → Transfer sukses ✅
```

---

## Checklist Integrasi

```
SETUP AWAL (TokoChain):
  □ Deploy contract TokoChainPay
  □ Setup cron monitoring

ONBOARDING MERCHANT:
  □ Subscribe ke PAY.ID
  □ Setup payment policy
  □ Upload IPFS + mint NFT + register

SETIAP PAYMENT (customer):
  □ Load rules dari chain + IPFS   (otomatis)
  □ Evaluasi rules off-chain       (otomatis)
  □ Customer tandatangan proof     (popup MetaMask)
  □ Approve USDC jika perlu        (popup MetaMask)
  □ payMerchant()                  (popup MetaMask)

MAINTENANCE:
  □ Monitor expiry subscription harian
  □ Kirim reminder 7 hari sebelum habis
```

:::warning
Jika subscription habis → semua payment ke merchant itu **REVERT** dengan `RULE_LICENSE_EXPIRED`.
:::
