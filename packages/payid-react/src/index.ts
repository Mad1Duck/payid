// Provider
export { PayIDProvider } from './PayIDProvider';
export type {
  PayIDContracts,
  RuleRef,
  RuleSet,
  RuleDefinition,
  SubscriptionInfo,
  CombinedRule,
} from './types';

export { RuleDirection } from './types';

//  Hooks: Rules 
export {
  useRuleCount,
  useRule,
  useRules,
  useMyRules,
  useRuleExpiry,
  useSubscription,
} from './hooks/useRules';

//  Hooks: Combined Rules 
export {
  useAllCombinedRules,
  useActiveCombinedRule,
  useActiveCombinedRuleByDirection,
  useOwnerRuleSets,
  useMyRuleSets,
} from './hooks/useCombinedRules';

//  Hooks: Payment 
export {
  useVerifyDecision,
  useNonceUsed,
  usePayETH,
  usePayERC20,
} from './hooks/usePayID';

//  Hook: Full Flow 
export { usePayIDFlow } from './hooks/usePayIDFlow';
export type { PayIDFlowParams, PayIDFlowResult, PayIDFlowStatus, } from './hooks/usePayIDFlow';

//  Contract addresses 
export { PAYID_CONTRACTS, getContracts } from './contracts/addresses';