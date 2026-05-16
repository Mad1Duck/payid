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
  AIAgent,
  AdminAgent,
  AgentRuleInfo,
  AgentSubscription,
  AgentWithRule,
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
  usePayNative,
  usePayNative as usePayETH, // @deprecated use usePayNative
  usePayERC20,
  useSubscribe,
  useSubscriptionPrice,
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

// Hooks: VRAN Reputation
export {
  useReputation,
  useCanReport,
  useVranConfig,
  useSubmitReport,
  useConfirmReport,
} from './hooks/useReputation';

// Hooks: Offline Cache
export { useOfflineCache } from './hooks/useOfflineCache';
export type { CacheStats, DraftPayment } from './hooks/useOfflineCache';

// Hooks: AI Agent Registry (Admin + User dual registry)
export {
  // Admin agents
  useIsAdminAIAgent,
  useAdminAIAgent,
  useAllAdminAIAgents,
  useRegisterAdminAIAgent,
  useUpdateAdminAIAgent,
  useDeactivateAdminAIAgent,
  useRegistryAdmin,
  // User agents
  useIsUserAIAgent,
  useUserAIAgent,
  useUserAIAgentByHandle,
  useAllUserAIAgents,
  useRegisterUserAIAgent,
  useUpdateUserAIAgent,
  useDeactivateUserAIAgent,
  useRecordUserInference,
  useVerifyUserAIAgent,
  // Backward compatibility aliases
  useIsAIAgent,
  useAIAgent,
  useAIAgentByHandle,
  useAllAIAgents,
  useRegisterAIAgent,
  useUpdateAIAgent,
  useDeactivateAIAgent,
  useRecordInference,
  useVerifyAgent,
} from './hooks/useAIAgentRegistry';

// Hooks: AI Agent Rules & Subscriptions
export {
  useAgentCombinedRule,
  useAgentSubscription,
  useIsSubscribedToAgent,
  usePreferredAgent,
  useEffectiveAgentRule,
  useAllAgentsWithRules,
  useAgentSubscriptionPrice,
  useSetAgentCombinedRule,
  useUnsetAgentCombinedRule,
  useSubscribeToAgent,
  useUnsubscribeFromAgent,
  useSetPreferredAgent,
} from './hooks/useAIAgentRules';

// Contract addresses
export { PAYID_CONTRACTS, getContracts } from './contracts/addresses';