import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {

  const admin = m.getAccount(0);
  const issuer = m.getAccount(1);

  // Infrastructure
  const mockOracle = m.contract("MockEthUsdOracle", [BigInt(2000 * 1e8)]);
  const mockUSDC = m.contract("MockUSDC");
  const mockIDRX = m.contract("MockIDRX");
  const mockEAS = m.contract("MockEAS");
  const mockAgentRegistry = m.contract("MockAgentRegistry");

  // Core contracts
  const attestationVerifier = m.contract("AttestationVerifier");
  const payIdVerifier = m.contract("PayIDVerifier");
  const payWithPayID = m.contract("PayWithPayID");
  const ruleAuthority = m.contract("RuleAuthority");
  const combinedRuleStorage = m.contract("CombinedRuleStorage");
  const vindexRegistry = m.contract("VindexRegistry");

  const ruleItemERC721 = m.contract("RuleItemERC721", [
    "PayID Rule Item",
    "PRULE",
  ]);

  const initRuleItem = m.call(ruleItemERC721, "initialize", [
    admin, mockOracle,
  ], { id: "initRuleItemERC721", from: admin });

  const agentPayID = m.contract("AgentPayID", [
    mockAgentRegistry,
    payIdVerifier,
  ]);

  // Initialize

  const initAttestation = m.call(attestationVerifier, "initialize", [
    mockEAS, [], [issuer],
  ], { id: "initAttestationVerifier", from: admin });

  // PayIDVerifier.initialize requires (initialOwner, _attestationVerifier)
  const initVerifier = m.call(payIdVerifier, "initialize", [
    admin, attestationVerifier,
  ], { id: "initPayIDVerifier", from: admin, after: [initAttestation] });

  const initPayWith = m.call(payWithPayID, "initialize", [
    payIdVerifier, attestationVerifier,
  ], { id: "initPayWithPayID", from: admin, after: [initVerifier] });

  const initAuthority = m.call(ruleAuthority, "initialize", [
    admin,
  ], { id: "initRuleAuthority", from: admin });

  const initVindexRegistry = m.call(vindexRegistry, "initialize", [
    admin,
  ], { id: "initVindexRegistry", from: admin });

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

  // Advanced payment tools
  const recurringPayments = m.contract("RecurringPayments");
  const payWithPayIDBatch = m.contract("PayWithPayIDBatch");
  const escrowMilestone = m.contract("EscrowMilestone");
  const timeLockVesting = m.contract("TimeLockVesting");

  // Initialize contracts that depend on PayWithPayID
  m.call(recurringPayments, "initialize", [payWithPayID], {
    id: "initRecurringPayments",
    from: admin,
    after: [initPayWith],
  });

  m.call(payWithPayIDBatch, "initialize", [payWithPayID], {
    id: "initPayWithPayIDBatch",
    from: admin,
    after: [initPayWith],
  });

  return {
    mockOracle,
    mockUSDC,
    mockIDRX,
    mockEAS,
    attestationVerifier,
    payIdVerifier,
    payWithPayID,
    ruleItemERC721,
    combinedRuleStorage,
    ruleAuthority,
    mockAgentRegistry,
    agentPayID,
    vindexRegistry,
    recurringPayments,
    payWithPayIDBatch,
    escrowMilestone,
    timeLockVesting,
  };
});