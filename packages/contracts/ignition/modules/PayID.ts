import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {

  const admin = m.getAccount(0);
  const issuer = m.getAccount(1);

  // --- Parameters ---
  // If useMockX is true and XAddress is empty, it will deploy a new Mock.
  // If XAddress is provided, it will use that address.

  let oracleAddress: any = m.getParameter("oracleAddress", "");
  if (oracleAddress.toString() === "") {
    oracleAddress = m.getParameter("chainlinkEthUsd", "");
  }

  const useMockOracle = m.getParameter("useMockOracle", false);

  const useMockEAS = m.getParameter("useMockEAS", true);
  const easAddress: any = m.getParameter("easAddress", "");

  const useMockAgentRegistry = m.getParameter("useMockAgentRegistry", true);
  const agentRegistryAddress: any = m.getParameter("agentRegistryAddress", "");

  // --- Infrastructure ---

  // Oracle (Chainlink ETH/USD)
  let oracle;
  let mockOracle;
  if (useMockOracle && oracleAddress.toString() === "") {
    mockOracle = m.contract("MockOracle");
    oracle = mockOracle;
  } else {
    oracle = m.contractAt("IAggregatorV3", oracleAddress);
  }

  // EAS (Ethereum Attestation Service)
  let eas;
  if (!useMockEAS && easAddress && easAddress.toString() !== "") {
    eas = m.contractAt("MockEAS", easAddress);
  } else {
    eas = m.contract("MockEAS");
  }

  // Agent Registry (0G Agent ID)
  let agentRegistry;
  if (!useMockAgentRegistry && agentRegistryAddress && agentRegistryAddress.toString() !== "") {
    agentRegistry = m.contractAt("MockAgentRegistry", agentRegistryAddress);
  } else {
    agentRegistry = m.contract("MockAgentRegistry");
  }


  // --- Core contracts ---
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
    admin, oracle,
  ], { id: "initRuleItemERC721", from: admin });

  const agentPayID = m.contract("AgentPayID", [
    agentRegistry,
    payIdVerifier,
  ]);

  // Initialize

  const initAttestation = m.call(attestationVerifier, "initialize", [
    eas, [], [issuer],
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

  // AI Agent contracts
  const aiAgentRegistry = m.contract("AIAgentRegistry");
  const aiAgentRuleManager = m.contract("AIAgentRuleManager", [
    aiAgentRegistry,
    combinedRuleStorage,
  ]);

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
    oracle,
    eas,
    attestationVerifier,
    payIdVerifier,
    payWithPayID,
    ruleItemERC721,
    combinedRuleStorage,
    ruleAuthority,
    agentRegistry,
    agentPayID,
    aiAgentRegistry,
    aiAgentRuleManager,
    vindexRegistry,
    recurringPayments,
    payWithPayIDBatch,
    escrowMilestone,
    timeLockVesting,
  };
});