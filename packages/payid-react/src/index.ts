// Provider
export { PayIDProvider, usePayIDContext } from './PayIDProvider';
export type { PayIDContextValue, ModuleInfo, ReputationModule, EscrowModule } from './PayIDProvider';
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
  TxHookResult,
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
  useReport,
  useSuccessfulReports,
} from './hooks/useReputation';

// Hooks: Escrow (milestone-based)
export {
  useUserEscrows,
  useCreateEscrow,
  useSubmitMilestone,
  useReleaseMilestone,
  useDisputeEscrow,
  useResolveRefund,
  useAutoRefund,
} from './hooks/useEscrow';

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

// Adapters (plug-and-play reputation & escrow sources)
export type {
  IReputationAdapter,
  IEscrowAdapter,
  ReputationResult,
  VranConfigResult,
  ReportResult,
  MilestoneDef,
  EscrowResult,
} from './adapters/types';
export {
  DefaultReputationAdapter,
  DefaultEscrowAdapter,
} from './adapters/default';
export {
  NoopReputationAdapter,
  NoopEscrowAdapter,
} from './adapters/noop';

export {
  CompositeReputationAdapter,
  PlatformEscrowAdapter,
  createCompositeIntegration,
} from './adapters/composite/platform-composite';
export type { CompositeReputationOptions } from './adapters/composite/platform-composite';

export {
  FallbackReputationAdapter,
  FallbackEscrowAdapter,
  createFallbackReputation,
  createFallbackEscrow,
} from './adapters/composite/fallback';
export type { FallbackReputationOptions, FallbackEscrowOptions } from './adapters/composite/fallback';

export {
  withMiddlewareReputation,
  withMiddlewareEscrow,
} from './adapters/composite/middleware';
export type { MiddlewareOptions } from './adapters/composite/middleware';

// Contract addresses
export { PAYID_CONTRACTS, getContracts } from './contracts/addresses';

// Gas buffer helper
export { useGasBuffer } from './hooks/useGasBuffer';