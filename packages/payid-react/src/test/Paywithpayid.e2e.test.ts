import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes, parseUnits, zeroAddress } from "viem";
import type { Address, Hash, WalletClient } from "viem";

describe("PayWithPayID E2E (ETH + ERC20)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  const payerWallet = walletClients[0];
  const merchantWallet = walletClients[1];

  if (!payerWallet || !merchantWallet) {
    throw new Error("Hardhat network harus menyediakan minimal 2 wallet clients");
  }

  const [payer] = await payerWallet.getAddresses();
  const [merchant] = await merchantWallet.getAddresses();

  const chainId = await publicClient.getChainId();

  interface DecisionMessage {
    version: Hash;
    payId: Hash;
    payer: Address;
    receiver: Address;
    asset: Address;
    amount: bigint;
    contextHash: Hash;
    ruleSetHash: Hash;
    ruleAuthority: Address;
    issuedAt: bigint;
    expiresAt: bigint;
    nonce: Hash;
    requiresAttestation: boolean;
  }

  interface WriteOptions {
    account?: WalletClient["account"];
    value?: bigint;
  }

  interface RuleNFTContract {
    address: Address;
    write: {
      createRule: (args: readonly [Hash, string], opts: WriteOptions) => Promise<Hash>;
      activateRule: (args: readonly [bigint], opts: WriteOptions) => Promise<Hash>;
      extendRuleExpiry: (args: readonly [bigint, bigint], opts: WriteOptions) => Promise<Hash>;
    };
    read: {
      subscriptionPriceETH: () => Promise<bigint>;
      ruleTokenId: (args: readonly [bigint]) => Promise<bigint>;
    };
  }

  interface RuleStorageContract {
    address: Address;
    write: {
      registerCombinedRule: (
        args: readonly [Hash, Address[], bigint[], bigint],
        opts: WriteOptions,
      ) => Promise<Hash>;
    };
  }

  interface VerifierContract {
    address: Address;
    write: {
      initialize: (args: readonly [Address]) => Promise<Hash>;
    };
    read: {
      verifyDecision: (args: readonly [DecisionMessage, Hash]) => Promise<boolean>;
    };
  }

  interface ERC20Contract {
    address: Address;
    write: {
      mint: (args: readonly [Address, bigint], opts: WriteOptions) => Promise<Hash>;
      approve: (args: readonly [Address, bigint], opts: WriteOptions) => Promise<Hash>;
    };
    read: {
      balanceOf: (args: readonly [Address]) => Promise<bigint>;
    };
  }

  interface AttestationVerifierContract {
    address: Address;
    write: {
      initialize: (args: readonly [Address, Hash[], Address[]]) => Promise<Hash>;
    };
  }

  interface PayContract {
    address: Address;
    write: {
      initialize: (args: readonly [Address, Address]) => Promise<Hash>;
      payERC20: (args: readonly [DecisionMessage, Hash, Hash[]], opts: WriteOptions) => Promise<Hash>;
      payETH: (args: readonly [DecisionMessage, Hash, Hash[]], opts: WriteOptions & { value: bigint; }) => Promise<Hash>;
    };
  }

  const DECISION_TYPES = {
    Decision: [
      { name: "version", type: "bytes32" },
      { name: "payId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "contextHash", type: "bytes32" },
      { name: "ruleSetHash", type: "bytes32" },
      { name: "ruleAuthority", type: "address" },
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "nonce", type: "bytes32" },
      { name: "requiresAttestation", type: "bool" },
    ],
  } as const;

  function hashString(v: string): Hash {
    return keccak256(toBytes(v));
  }

  async function signDecision(
    verifier: { address: Address; },
    decision: DecisionMessage,
    signer: WalletClient,
  ): Promise<Hash> {
    return signer.signTypedData({
      account: signer.account as any,
      domain: {
        name: "PAY.ID Decision",
        version: "2",
        chainId,
        verifyingContract: verifier.address,
      },
      types: DECISION_TYPES,
      primaryType: "Decision",
      message: decision,
    });
  }

  async function deployContracts() {
    const usdc = await viem.deployContract("MockUSDC") as ERC20Contract;

    const oracle = await viem.deployContract("MockEthUsdOracle", [
      2000n * 10n ** 8n,
    ]);

    const ruleNFT = await viem.deployContract("RuleItemERC721", [
      "PayID Rule Item",
      "PRULE",
      merchant!,
      oracle.address!,
    ]) as RuleNFTContract;

    const ruleStorage = await viem.deployContract("CombinedRuleStorage") as RuleStorageContract;

    const verifier = await viem.deployContract("PayIDVerifier") as VerifierContract;
    await verifier.write.initialize([payer! as any]);

    const mockEAS = await viem.deployContract("MockEAS");
    const mockAttestationVerifier = await viem.deployContract("AttestationVerifier") as AttestationVerifierContract;
    await mockAttestationVerifier.write.initialize([mockEAS.address as Address, [], []]);

    const pay = await viem.deployContract("PayWithPayID") as PayContract;
    await pay.write.initialize([verifier.address, mockAttestationVerifier.address as Address]);

    return { usdc, oracle, ruleNFT, ruleStorage, verifier, pay };
  }

  async function setupMerchantRule(
    ruleNFT: RuleNFTContract,
    ruleStorage: RuleStorageContract,
    ruleJson: string,
    ruleSetHashKey: string,
  ): Promise<{ tokenId: bigint; ruleSetHash: Hash; }> {
    const ruleHash = hashString(ruleJson);

    await ruleNFT.write.createRule(
      [ruleHash, "ipfs://rule.json"],
      { account: merchantWallet?.account },
    );

    await ruleNFT.write.activateRule(
      [1n],
      { account: merchantWallet?.account },
    );

    const tokenId = await ruleNFT.read.ruleTokenId([1n]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const price = await ruleNFT.read.subscriptionPriceETH();

    await ruleNFT.write.extendRuleExpiry(
      [tokenId, now + 30n * 24n * 60n * 60n],
      { account: merchantWallet?.account, value: price },
    );

    const ruleSetHash = hashString(ruleSetHashKey);

    await ruleStorage.write.registerCombinedRule(
      [ruleSetHash, [ruleNFT.address], [tokenId], 1n],
      { account: merchantWallet?.account },
    );

    return { tokenId, ruleSetHash };
  }

  it("executes ERC20 payment end-to-end", async () => {
    const { usdc, ruleNFT, ruleStorage, verifier, pay } = await deployContracts();

    const RULE_JSON = JSON.stringify({
      id: "min_amount",
      if: { field: "tx.amount", op: ">=", value: "100000000" },
    });

    const { ruleSetHash } = await setupMerchantRule(
      ruleNFT,
      ruleStorage,
      RULE_JSON,
      "combined-rule-v1:min_amount",
    );

    const amount = parseUnits("150", 6);

    await usdc.write.mint([payer!, amount], { account: payerWallet.account });
    await usdc.write.approve([pay.address, amount], { account: payerWallet.account });

    const payerUSDCBefore = await usdc.read.balanceOf([payer!]);
    const merchantUSDCBefore = await usdc.read.balanceOf([merchant!]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const decision: DecisionMessage = {
      version: hashString("2"),
      payId: hashString("pay-erc20-001"),
      payer: payer!,
      receiver: merchant!,
      asset: usdc.address,
      amount,
      contextHash: hashString("ctx"),
      ruleSetHash,
      ruleAuthority: zeroAddress,
      issuedAt: now - 5n,
      expiresAt: now + 300n,
      nonce: hashString("nonce-erc20-001"),
      requiresAttestation: false,
    };

    const sig = await signDecision(verifier, decision, payerWallet);

    await pay.write.payERC20(
      [decision, sig, []],
      { account: payerWallet.account },
    );

    const payerUSDCAfter = await usdc.read.balanceOf([payer!]);
    const merchantUSDCAfter = await usdc.read.balanceOf([merchant!]);

    assert.equal(merchantUSDCAfter, merchantUSDCBefore + amount,
      "merchant harus menerima USDC sejumlah amount");
    assert.equal(payerUSDCAfter, payerUSDCBefore - amount,
      "payer harus kehilangan USDC sejumlah amount");
  });

  it("executes ETH payment end-to-end", async () => {
    const { ruleNFT, ruleStorage, verifier, pay } = await deployContracts();

    const RULE_JSON = JSON.stringify({
      id: "min_amount_eth",
      if: { field: "tx.amount", op: ">=", value: "1000000000000000" },
    });

    const { ruleSetHash } = await setupMerchantRule(
      ruleNFT,
      ruleStorage,
      RULE_JSON,
      "combined-rule-v1:min_amount_eth",
    );

    const amount = parseUnits("0.01", 18);

    const merchantETHBefore = await publicClient.getBalance({ address: merchant! });
    const payerETHBefore = await publicClient.getBalance({ address: payer! });

    const now = BigInt(Math.floor(Date.now() / 1000));
    const decision: DecisionMessage = {
      version: hashString("2"),
      payId: hashString("pay-eth-001"),
      payer: payer!,
      receiver: merchant!,
      asset: zeroAddress,
      amount,
      contextHash: hashString("ctx-eth"),
      ruleSetHash,
      ruleAuthority: zeroAddress,
      issuedAt: now - 5n,
      expiresAt: now + 300n,
      nonce: hashString("nonce-eth-001"),
      requiresAttestation: false,
    };

    const sig = await signDecision(verifier, decision, payerWallet);

    await pay.write.payETH(
      [decision, sig, []],
      { account: payerWallet.account, value: amount },
    );

    const merchantETHAfter = await publicClient.getBalance({ address: merchant! });
    const payerETHAfter = await publicClient.getBalance({ address: payer! });

    assert.ok(merchantETHAfter > merchantETHBefore,
      "merchant harus menerima ETH");
    assert.ok(payerETHAfter < payerETHBefore,
      "payer harus kehilangan ETH (amount + gas)");
    assert.equal(merchantETHAfter - merchantETHBefore, amount,
      "merchant harus menerima tepat amount ETH");
  });

  it("verifyDecision returns false when proof expired", async () => {
    const { usdc, verifier } = await deployContracts();

    const amount = parseUnits("150", 6);
    const now = BigInt(Math.floor(Date.now() / 1000));

    const expiredDecision: DecisionMessage = {
      version: hashString("2"),
      payId: hashString("pay-expired"),
      payer: payer!,
      receiver: merchant!,
      asset: usdc.address,
      amount,
      contextHash: hashString("ctx"),
      ruleSetHash: hashString("any-rule"),
      ruleAuthority: zeroAddress,
      issuedAt: now - 600n,
      expiresAt: now - 60n,
      nonce: hashString("nonce-expired"),
      requiresAttestation: false,
    };

    const sig = await signDecision(verifier, expiredDecision, payerWallet);

    const isValid = await verifier.read.verifyDecision([expiredDecision, sig]);
    assert.equal(isValid, false, "expired proof harus invalid");
  });
});