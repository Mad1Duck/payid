import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {

  const admin = m.getAccount(0);
  const issuer = m.getAccount(1);

  // Infrastructure
  const mockOracle = m.contract("MockEthUsdOracle", [BigInt(2000 * 1e8)]);
  const mockUSDC = m.contract("MockUSDC");
  const mockEAS = m.contract("MockEAS");

  // Core contracts — no constructor args
  const attestationVerifier = m.contract("AttestationVerifier");
  const payIdVerifier = m.contract("PayIDVerifier");
  const payWithPayID = m.contract("PayWithPayID");
  const ruleAuthority = m.contract("RuleAuthority");
  const combinedRuleStorage = m.contract("CombinedRuleStorage");

  const ruleItemERC721 = m.contract("RuleItemERC721", [
    "PayID Rule Item",
    "PRULE",
    admin,
    mockOracle,
  ]);

  // Initialize

  const initAttestation = m.call(attestationVerifier, "initialize", [
    mockEAS, [], [issuer],
  ], { id: "initAttestationVerifier", from: admin });

  const initVerifier = m.call(payIdVerifier, "initialize", [
    admin,
  ], { id: "initPayIDVerifier", from: admin });

  const initPayWith = m.call(payWithPayID, "initialize", [
    payIdVerifier, attestationVerifier,
  ], { id: "initPayWithPayID", from: admin });

  const initAuthority = m.call(ruleAuthority, "initialize", [
    admin,
  ], { id: "initRuleAuthority", from: admin });

  m.call(payIdVerifier, "setTrustedAuthority", [combinedRuleStorage, true], {
    id: "trustCombinedRuleStorage",
    from: admin,
    after: [initVerifier],
  });

  m.call(payIdVerifier, "setTrustedAuthority", [ruleAuthority, true], {
    id: "trustRuleAuthority",
    from: admin,
    after: [initVerifier, initAuthority],
  });

  return {
    mockOracle,
    mockUSDC,
    mockEAS,
    attestationVerifier,
    payIdVerifier,
    payWithPayID,
    ruleItemERC721,
    combinedRuleStorage,
    ruleAuthority,
  };
});