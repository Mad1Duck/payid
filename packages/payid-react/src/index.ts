// Provider
export { PayIDProvider, usePayIDContext } from './PayIDProvider';
export type { PayIDContextValue } from './PayIDProvider';
export type {
  PayIDContracts,
  RuleRef,
  RuleSet,
  RuleDefinition,
  SubscriptionInfo,
  CombinedRule,
} from './types';
export { RuleDirection } from './types';

// Hooks: Rules (read)
export {
  useRuleCount,
  useRule,
  useRules,
  useMyRules,
  useRuleExpiry,
  useSubscription,
} from './hooks/useRules';

// Hooks: Combined Rules (read)
export {
  useAllCombinedRules,
  useActiveCombinedRule,
  useActiveCombinedRuleByDirection,
  useOwnerRuleSets,
  useMyRuleSets,
} from './hooks/useCombinedRules';

// Hooks: Payment (read + write)
export {
  useVerifyDecision,
  useNonceUsed,
  usePayETH,
  usePayERC20,
  useSubscribe,
  useCreateRule,
  useCreateRuleVersion,
  useActivateRule,
  useExtendRuleExpiry,
  useRegisterCombinedRule,
  useDeactivateCombinedRule,
} from './hooks/usePayID';

// Hook: QR Code Generator (receiver/merchant side)
export { usePayIDQR } from './hooks/usePayidQrCode';
export type { PayIDQRParams, PayIDQRResult, PayIDQRStatus } from './hooks/usePayidQrCode';

// Hook: Full Flow (client-side evaluate + prove + submit)
export { usePayIDFlow } from './hooks/usePayIDFlow';
export type {
  PayIDFlowParams,
  PayIDFlowResult,
  PayIDFlowStatus,
} from './hooks/usePayIDFlow';

// Contract addresses
export { PAYID_CONTRACTS, getContracts } from './contracts/addresses';