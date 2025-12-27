import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {
  // ============================
  // CONFIG
  // ============================

  // const ethUsdOracle = m.getParameter(
  //   "ethUsdOracle",
  //   "0x0000000000000000000000000000000000000000" // ganti saat deploy
  // );
  // Admin (default deployer)
  const admin = m.getAccount(0);

  // Deploy mock oracle
  const mockOracle = m.contract(
    "MockEthUsdOracle",
    [BigInt(2000 * 1e8)]
  );

  const mockUSD = m.contract(
    "MockUSDC",
    [admin]
  );


  // ============================
  // 1. Deploy RuleItemERC721
  // ============================
  const ruleItemERC721 = m.contract(
    "RuleItemERC721",
    [admin, mockOracle]
  );

  // ============================
  // 2. Deploy CombinedRuleStorage
  // ============================
  const combinedRuleStorage = m.contract(
    "CombinedRuleStorage"
  );

  // ============================
  // 3. Deploy PayIDVerifier
  //    inject CombinedRuleStorage
  // ============================
  const verifier = m.contract(
    "PayIDVerifier",
    [combinedRuleStorage]
  );

  // ============================
  // 4. Deploy PayWithPayID
  //    inject PayIDVerifier
  // ============================
  const payWithPayID = m.contract(
    "PayWithPayID",
    [verifier]
  );

  return {
    ruleItemERC721,
    combinedRuleStorage,
    verifier,
    payWithPayID,
    mockUSD
  };
});
