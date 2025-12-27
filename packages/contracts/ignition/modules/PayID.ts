import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PayIDModule", (m) => {
  // ============================
  // 1. Deploy PayIDVerifier
  // ============================
  const verifier = m.contract("PayIDVerifier");

  // ============================
  // 2. Deploy PayWithPayID
  //    inject verifier address
  // ============================
  const payWithPayID = m.contract(
    "PayWithPayID",
    [verifier]
  );

  return {
    verifier,
    payWithPayID,
  };
});
