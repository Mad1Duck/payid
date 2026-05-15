# Deploy ke Dev Node (100.73.196.95:8545)

## Persiapan

1. Pastikan node berjalan di `100.73.196.95:8545`
2. Pastikan accounts[0] punya ETH (minimal 0.5 ETH untuk deploy semua contract)

## 1. Deploy Contracts

```bash
cd packages/contracts
npx hardhat ignition deploy ignition/modules/PayID.ts \
  --network devnode \
  --deployment-id payid-devnode
```

## 2. Sinkronisasi Address ke Frontend

```bash
# Otomatis sync ke addresses.ts
npx hardhat run scripts/sync-deployments.ts --network devnode
```

Atau manual — copy output addresses ke:
`frontend/example-product/src/constants/contracts/addresses.ts`

## 3. Jalankan Frontend

```bash
cd frontend/example-product
npm run dev
# Buka http://localhost:5173
```

## Network Config

| Parameter | Value |
|-----------|-------|
| RPC URL | `http://100.73.196.95:8545` |
| Chain ID | `31337` (Hardhat) |
| Network name | `devnode` |

## Wallet Connect

MetaMask / wallet tambahkan custom network:
- **Network Name**: PAY.ID DevNode
- **RPC URL**: http://100.73.196.95:8545
- **Chain ID**: 31337
- **Currency Symbol**: ETH
