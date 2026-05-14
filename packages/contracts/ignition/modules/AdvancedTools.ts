import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import PayIDModule from "./PayID";

export default buildModule("AdvancedToolsModule", (m) => {
  // Reuse deployed PayID core contracts
  const { payWithPayID } = m.useModule(PayIDModule);

  // Advanced payment contracts
  const recurringPayments = m.contract("RecurringPayments");
  const payWithPayIDBatch = m.contract("PayWithPayIDBatch");
  const escrowMilestone = m.contract("EscrowMilestone");
  const timeLockVesting = m.contract("TimeLockVesting");

  // Initialize contracts that depend on PayWithPayID
  m.call(recurringPayments, "initialize", [payWithPayID], {
    id: "initRecurringPayments",
  });

  m.call(payWithPayIDBatch, "initialize", [payWithPayID], {
    id: "initPayWithPayIDBatch",
  });

  return {
    recurringPayments,
    payWithPayIDBatch,
    escrowMilestone,
    timeLockVesting,
  };
});
