import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {
  const admin = m.getAccount(0);
  const issuer = m.getAccount(1);

  // ─── Infrastructure ───────────────────────────────────────────────────────
  const mockOracle = m.contract("MockEthUsdOracle", [BigInt(2000 * 1e8)]);
  const mockUSDC = m.contract("MockUSDC");
  const mockEAS = m.contract("MockEAS");

  // ─── AttestationVerifier ──────────────────────────────────────────────────
  const attestationVerifier = m.contract("AttestationVerifier", [
    mockEAS,
    [],
    [issuer],
  ]);

  // ─── PayIDVerifier ────────────────────────────────────────────────────────
  const payIdVerifier = m.contract("PayIDVerifier", [
    "PAY.ID Decision",
    "2",
  ]);

  // ─── PayWithPayID ─────────────────────────────────────────────────────────
  const payWithPayID = m.contract("PayWithPayID", [
    payIdVerifier,
    attestationVerifier,
  ]);

  // ─── Rule NFT + Storage ───────────────────────────────────────────────────
  const ruleItemERC721 = m.contract("RuleItemERC721", ["PayID Rule Item", "PRULE", admin, mockOracle]);
  const combinedRuleStorage = m.contract("CombinedRuleStorage");
  const ruleAuthority = m.contract("RuleAuthority", [admin]);

  // ─── Post-deploy: whitelist authorities ──────────────────────────────────
  m.call(payIdVerifier, "setTrustedAuthority", [combinedRuleStorage, true], { id: "trustCombinedRuleStorage" });
  m.call(payIdVerifier, "setTrustedAuthority", [ruleAuthority, true], { id: "trustRuleAuthority" });

  return { mockOracle, mockUSDC, mockEAS, attestationVerifier, payIdVerifier, payWithPayID, ruleItemERC721, combinedRuleStorage, ruleAuthority };
});