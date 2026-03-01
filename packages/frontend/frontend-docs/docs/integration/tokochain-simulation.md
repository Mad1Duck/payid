---
id: tokochain-simulation
title: 'Case Study: TokoChain'
sidebar_label: ' Case Study: TokoChain'
---

# Case Study: TokoChain × PAY.ID

A real-world integration simulation — **TokoChain** (an SME payment app) with PAY.ID infrastructure.

**Situation:** TokoChain has its own payment smart contract but no filtering — all transactions go through. Merchants can't configure: USDC only, minimum amounts, or operating hours.

After PAY.ID integration, each merchant has their own **payment policy** enforced on-chain automatically.

---

## Integrated Flow

```
MERCHANT (one-time setup in TokoChain dashboard):
  → Subscribe to PAY.ID (0.0001 ETH / 30 days)
  → Select rules: "USDC only, min 10k IDR, 8am–10pm"
  → TokoChain mints Rule NFT + registers to CombinedRuleStorage

CUSTOMER (every payment):
  → Tap "Pay" in TokoChain
  → App evaluates rules (invisible, < 1 second)
  → Wallet popup: "Sign to confirm"
  → Transfer success ✅
```

---

## Part 1: Subscription

```ts
export async function subscribeToPayID(signer: ethers.Signer) {
  const hasActive = await ruleNFT.getFunction('hasSubscription')(address);
  if (hasActive) return { alreadyActive: true };

  const price = await ruleNFT.getFunction('subscriptionPriceETH')();
  await (await ruleNFT.getFunction('subscribe').send({ value: price })).wait();
}

export async function getSubscriptionStatus(address: string, provider: ethers.Provider) {
  const expiry = await ruleNFT.getFunction('subscriptionExpiry')(address);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const daysLeft = expiry >= now ? Number((expiry - now) / 86400n) : 0;
  return { isActive: expiry >= now, daysLeft, needsRenewal: daysLeft <= 7 };
}
```

:::warning
If subscription expires → all payments to the merchant **REVERT** with `RULE_LICENSE_EXPIRED`. Send renewal reminders before expiry.
:::

---

## Part 2: Merchant Rule Setup

```ts
const RULES = [
  { id: 'usdc_only', if: { field: 'tx.asset', op: '==', value: 'USDC' } },
  { id: 'min_10k_idr', if: { field: 'tx.amount', op: '>=', value: '650000' } },
  { id: 'business_hours', if: { field: 'env.timestamp', op: 'between', value: [8, 22] } },
];

export async function setupMerchantRules(signer: ethers.Signer) {
  await subscribeToPayID(signer);

  const tokenIds: bigint[] = [];
  for (const rule of RULES) {
    const uri = await uploadToPinata(rule);
    const hash = keccak256(toUtf8Bytes(canonicalize(rule)));
    const ruleId = await createRule(hash, uri);
    tokenIds.push(await activateRule(ruleId));
  }

  const ruleSetHash = keccak256(
    toUtf8Bytes(canonicalize({ version: '1', logic: 'AND', rules: RULES })),
  );
  await combined
    .getFunction('registerCombinedRule')
    .send(ruleSetHash, Array(tokenIds.length).fill(PAYID_CONTRACTS.RULE_ITEM_ERC721), tokenIds, 1n);
}
```

---

## Part 3: TokoChain Contract

```solidity
contract TokoChainPay {
    IPayIDVerifier public constant PAYID_VERIFIER =
        IPayIDVerifier(0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9);

    function payMerchant(
        IPayIDVerifier.Decision calldata d,
        bytes calldata sig,
        bytes32[] calldata attestationUIDs
    ) external {
        PAYID_VERIFIER.requireAllowed(d, sig);
        require(d.amount > 0, "ZERO_AMOUNT");
        bool ok = IERC20(d.asset).transferFrom(d.payer, d.receiver, d.amount);
        require(ok, "TRANSFER_FAILED");
    }
}
```

---

## Part 4: Subscription Monitoring

```ts
export async function checkAllMerchants(merchants: string[]) {
  for (const address of merchants) {
    const { isActive, daysLeft, needsRenewal } = await getSubscriptionStatus(address, provider);
    if (!isActive) await notifyMerchant(address, 'EXPIRED', '⚠️ Subscription expired!');
    else if (needsRenewal) await notifyMerchant(address, 'WARNING', `Expires in ${daysLeft} days!`);
  }
}
```

---

## Integration Checklist

```
INITIAL SETUP (TokoChain):
  □ Deploy TokoChainPay contract
  □ Set up monitoring cron job

MERCHANT ONBOARDING:
  □ Subscribe to PAY.ID
  □ Set up payment policy
  □ Upload IPFS + mint NFT + register

EVERY PAYMENT (customer):
  □ Load rules from chain + IPFS   (automatic)
  □ Evaluate rules off-chain       (automatic)
  □ Customer signs proof           (MetaMask popup)
  □ Approve USDC if needed        (MetaMask popup)
  □ payMerchant()                  (MetaMask popup)

MAINTENANCE:
  □ Monitor subscription expiry daily
  □ Send reminder 7 days before expiry
```
