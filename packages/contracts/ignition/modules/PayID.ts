import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {

  const admin = m.getAccount(0);   // deployer = admin
  const issuer = m.getAccount(1);   // account[1] = dummy trusted attester untuk testing

  // ── Infrastructure ─────────────────────────────────────────────────────────

  const mockOracle = m.contract("MockEthUsdOracle", [
    BigInt(2000 * 1e8),   // $2000/ETH, 8 decimals (Chainlink format)
  ]);

  const mockUSDC = m.contract("MockUSDC");

  // ── MockEAS ────────────────────────────────────────────────────────────────
  // FIX: Lisk Sepolia tidak punya EAS deployed.
  // AttestationVerifier constructor baru butuh EAS address — tidak bisa pass string.
  // Deploy MockEAS dulu, lalu pass sebagai easAddress.
  //
  // Kalau deploy ke chain yang punya EAS asli (Sepolia, Base, dll),
  // ganti `mockEAS` di baris attestationVerifier dengan address EAS-nya:
  //   Sepolia  : "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"
  //   Base     : "0x4200000000000000000000000000000000000021"
  //   Optimism : "0x4200000000000000000000000000000000000020"
  const mockEAS = m.contract("MockEAS");

  // ── AttestationVerifier ────────────────────────────────────────────────────
  // FIX: constructor lama (name, version, [issuer]) sudah tidak ada.
  // Constructor baru: (easAddress, bytes32[] schemas, address[] attesters)
  //   - schemas   : kosong untuk testnet, tambah via setTrustedSchema() post-deploy
  //   - attesters : issuer sebagai dummy attester untuk testing
  const attestationVerifier = m.contract("AttestationVerifier", [
    mockEAS,    // easAddress
    [],         // initialSchemas — kosong, set post-deploy jika perlu
    [issuer],   // initialAttesters — issuer account sebagai trusted attester
  ]);

  // ── PayIDVerifier ──────────────────────────────────────────────────────────
  const payIdVerifier = m.contract("PayIDVerifier", [
    "PAY.ID Decision",
    "2",
  ]);

  // ── PayWithPayID ───────────────────────────────────────────────────────────
  const payWithPayID = m.contract("PayWithPayID", [
    payIdVerifier,
    attestationVerifier,
  ]);

  // ── Rule NFT + Storage ─────────────────────────────────────────────────────

  const ruleItemERC721 = m.contract("RuleItemERC721", [
    "PayID Rule Item",
    "PRULE",
    admin,
    mockOracle,
  ]);

  const combinedRuleStorage = m.contract("CombinedRuleStorage");

  // ── RuleAuthority ──────────────────────────────────────────────────────────
  // FIX: contract baru ini belum ada di module sebelumnya.
  // RuleAuthority = registry strict dengan hash commitment + versioning.
  // Bisa dipakai sebagai alternatif CombinedRuleStorage.
  const ruleAuthority = m.contract("RuleAuthority", [admin]);

  // ── Post-deploy: whitelist authorities di PayIDVerifier ────────────────────
  // FIX: tanpa ini semua payment yang set ruleAuthority akan revert
  // "RULE_AUTHORITY_NOT_TRUSTED" saat requireAllowed() dipanggil.
  m.call(payIdVerifier, "setTrustedAuthority", [combinedRuleStorage, true], {
    id: "trustCombinedRuleStorage",
  });

  m.call(payIdVerifier, "setTrustedAuthority", [ruleAuthority, true], {
    id: "trustRuleAuthority",
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