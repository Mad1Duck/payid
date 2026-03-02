---
id: combining-rules
title: Menggabungkan Rules
sidebar_label: Menggabungkan Rules
---

# Menggabungkan Rules

**CombinedRuleSet** memungkinkan kamu menggabungkan beberapa Rule NFT menjadi satu payment policy. Saat seseorang membayar kamu, **semua rules dalam set dievaluasi bersama** (logika AND — semuanya harus lolos).

---

## Kenapa Gabungkan Rules?

Daripada nulis satu rule raksasa yang isinya semuanya, kamu bisa pisah rules ke NFT terpisah:

| Manfaat | Contoh |
|---|---|
| **Modular** | Pisah "hanya USDC" dari "min jumlah" — kelola secara independen |
| **Bisa dipakai ulang** | Satu rule NFT "blokir akhir pekan" bisa dipakai di banyak combined set |
| **Update mudah** | Update satu rule tanpa deploy ulang semuanya |
| **Audit trail** | Setiap rule punya NFT sendiri dengan riwayat on-chain sendiri |

---

## Strukturnya

```
CombinedRuleStorage
└── ruleSetHash → CombinedRule
      ├── owner: "0xMERCHANT"
      └── rules:
            ├── [0] tokenId: 1  → "usdc_saja"        (disimpan di IPFS)
            ├── [1] tokenId: 2  → "min_jumlah"       (disimpan di IPFS)
            └── [2] tokenId: 3  → "jam_bisnis"       (disimpan di IPFS)
```

Saat pembayaran masuk:
1. SDK baca `ruleSetHash` untuk receiver dari blockchain
2. Ambil semua 3 rule JSON dari IPFS
3. Evaluasi semuanya — semua 3 harus ALLOW agar pembayaran jalan

---

## Langkah demi Langkah

### Langkah 1 — Definisikan Rule-mu

Edit `examples/simple/rule.nft/currentRule.ts`:

```ts
export const RULE_OBJECT = {
  id: "usdc_saja",
  if: { field: "tx.asset", op: "in", value: ["USDC", "USDT"] },
  message: "Hanya stablecoin yang diterima",
};
```

### Langkah 2 — Upload ke IPFS + Buat Rule NFT

```bash
bun run setup:upload       # Upload rule JSON ke IPFS
bun run setup:create-rule  # Subscribe + create + activate Rule NFT
```

Ulangi ini untuk **setiap rule** yang mau kamu gabungkan. Setiap run membuat satu Rule NFT baru. Kamu akan dapat Token ID untuk masing-masing.

### Langkah 3 — Register Combined Rule Set

```bash
bun run setup:register
```

Ini akan melihat Rule NFT aktifmu dan menggabungkannya menjadi satu policy.

---

## Fungsi `registerCombinedRule`

Di balik layar, SDK memanggil:

```solidity
function registerCombinedRule(
  bytes32 ruleSetHash,    // Hash dari semua rules yang digabungkan
  address[] ruleNFTs,     // Array alamat kontrak RuleItemERC721
  uint256[] tokenIds,     // Array token ID (satu per rule)
  uint64 version          // Nomor versi untuk policy ini
) external
```

Yang dilakukan:
1. Deaktivasi combined rule set lama (kalau ada)
2. Verifikasi kamu memiliki semua Rule NFT
3. Verifikasi tidak ada Rule NFT yang expired
4. Langsung daftarkan set baru sebagai policy aktif

:::note Satu Policy Per Alamat
Setiap alamat hanya bisa punya **satu rule set aktif** pada satu waktu. Mendaftarkan yang baru otomatis menggantikan yang lama. Tanpa downtime.
:::

---

## Baca Rule Set Aktif

Untuk lihat rules yang sedang aktif untuk suatu receiver:

```ts
// 1. Dapatkan rule set hash untuk receiver
const ruleSetHash = await combined.getFunction("activeRuleOf")(merchantAddress);

// 2. Dapatkan daftar referensi rule NFT
const [owner, ruleRefs, version] = await combined.getFunction("getRuleByHash")(ruleSetHash);

// 3. Ambil setiap rule dari IPFS
const rules = await Promise.all(
  ruleRefs.map(async (ref) => {
    const tokenURI = await ruleNFT.getFunction("tokenURI")(ref.tokenId);
    const url = tokenURI.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${tokenURI.slice(7)}`
      : tokenURI;
    return (await fetch(url).then(r => r.json())).rule;
  })
);

console.log("Rules aktif:", rules);
```

---

## Batas

| Batas | Nilai |
|---|---|
| Maksimum Rule NFT per combined set | **10** |
| Maksimum rule slot tanpa subscription | **1** |
| Maksimum rule slot dengan subscription | **3** |

Untuk logika yang lebih kompleks, gunakan `NestedRule` di dalam satu Rule NFT daripada menambah lebih banyak NFT.

---

## Update Rules

Saat kamu mau ganti payment policy-mu:

```bash
# 1. Edit rule-mu
vim examples/simple/rule.nft/currentRule.ts

# 2. Upload ke IPFS
bun run setup:upload

# 3. Buat Rule NFT baru
bun run setup:create-rule

# 4. Register combined rule set yang sudah diupdate
bun run setup:register
```

`registerCombinedRule()` otomatis deaktivasi set lama dan aktifkan yang baru. **Tanpa downtime** — pembayaran yang sudah dapat proof sebelumnya masih akan berjalan sampai TTL-nya habis.

---

## Pakai UI React

Di `example-product`, tab **Combine** memungkinkan kamu melakukan semua ini dari browser:

1. Buka tab **Rule NFTs** → lihat dan aktifkan rules-mu
2. Buka tab **Combine** → pilih rules dan klik "Register Combined Rule"
3. Buka tab **Pay** → test pembayaran terhadap policy baru-mu

UI menggunakan hooks ini dari `payid-react`:
- `useMyRules()` — ambil semua Rule NFT milikmu
- `useActiveCombinedRule(address)` — baca policy aktif untuk alamat manapun
- `useAllCombinedRules()` — daftar semua combined rules yang terdaftar
