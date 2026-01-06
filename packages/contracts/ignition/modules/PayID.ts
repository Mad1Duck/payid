import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {
  const admin = m.getAccount(0);
  const issuer = m.getAccount(1);

  const mockOracle = m.contract(
    "MockEthUsdOracle",
    [BigInt(2000 * 1e8)]
  );

  const mockUSD = m.contract("MockUSDC");

  const attestationVerifier = m.contract(
    "AttestationVerifier",
    [
      "PayID Attestation",
      "1",
      [issuer],
    ]
  );

  const payIdVerifier = m.contract(
    "PayIDVerifier",
    [
      "PAY.ID Decision",
      "2",
    ]
  );

  const payWithPayID = m.contract(
    "PayWithPayID",
    [
      payIdVerifier,
      attestationVerifier,
    ]
  );

  const ruleItemERC721 = m.contract(
    "RuleItemERC721",
    [
      "PayID Rule Item",
      "PRULE",
      admin,
      mockOracle,
    ]
  );

  const combinedRuleStorage = m.contract(
    "CombinedRuleStorage"
  );

  return {
    mockOracle,
    mockUSD,
    attestationVerifier,
    payIdVerifier,
    payWithPayID,
    ruleItemERC721,
    combinedRuleStorage,
  };
});
