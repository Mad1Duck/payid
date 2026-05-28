import { motion } from 'framer-motion'
import PolicyScanning from '@/components/v4/PolicyScanning'
import { getTokenConfig } from '@/constants/tokens'
import type { Step } from '../types'

interface Props {
  p: any
  pipeline: any
  targetPolicy: any
  targetAddress: string | null
  flowStatus: string
  denyReason: string
  onBack: () => void
  backDisabled: boolean
  setStep: (step: Step) => void
  setDenyReason: (val: string) => void
  chainId: number
  asset: string
}

function shortenAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function explainRule(condition: string): string {
  if (condition.includes('oracle.txValueUsd')) {
    if (condition.includes('>=')) {
      const val = condition.split('>=')[1]?.trim();
      const usd = val ? (Number(val) / 1e8).toFixed(2) : '?';
      return `⚠️ INVERTED OPERATOR: This rule REJECTS transactions worth MORE than $${usd} USD. "Minimum" rules should use "<=" not ">=".`;
    }
    if (condition.includes('<=')) {
      const val = condition.split('<=')[1]?.trim();
      const usd = val ? (Number(val) / 1e8).toFixed(2) : '?';
      return `Transaction must be worth AT LEAST $${usd} USD.`;
    }
    return 'Checks the USD value of this transaction.';
  }
  if (condition.includes('tx.amount')) {
    return 'Checks the token amount of this transaction.';
  }
  if (condition.includes('env.timestamp')) {
    return 'Checks the time this transaction is sent.';
  }
  if (condition.includes('oracle.kycLevel')) {
    return 'Requires sender KYC verification.';
  }
  if (condition.includes('oracle.country')) {
    return 'Checks sender country/region.';
  }
  if (condition.includes('risk.score')) {
    return 'Checks risk score of this transaction.';
  }
  if (condition.includes('tx.sender')) {
    return 'Checks sender wallet address.';
  }
  if (condition.includes('tx.chainId')) {
    return 'Checks which blockchain this is sent on.';
  }
  if (condition.includes('intent.type')) {
    return 'Checks payment method (QR, Direct, etc).';
  }
  return 'Evaluates a condition on this transaction.';
}

function computeRiskScore(
  targetAddress: string | null,
  targetPolicy: any,
  isDenied: boolean,
  chainId: number,
  asset: string
): number {
  if (!targetAddress) return 50;

  // Base: deterministic hash from target address (0-40 range)
  let hash = 0;
  for (let i = 0; i < targetAddress.length; i++) {
    hash = ((hash << 5) - hash + targetAddress.charCodeAt(i)) | 0;
  }
  const baseScore = (Math.abs(hash) % 41); // 0-40

  // Policy modifiers
  let modifier = 0;
  if (targetPolicy?.active && targetPolicy.ruleRefs?.length > 0) {
    modifier += 15; // active policy = higher risk baseline
    modifier += Math.min(targetPolicy.ruleRefs.length * 5, 20); // more rules = more risk
  }
  if (isDenied) modifier += 25; // denied = high risk
  if (chainId !== 1 && chainId !== 8453) modifier += 5; // testnet = slightly higher risk
  if (asset === 'ETH' || asset === 'A0GI') modifier += 5; // volatile native = slightly higher

  return Math.min(baseScore + modifier, 100);
}

export function EvaluatingStep({
  p, pipeline, targetPolicy, targetAddress, flowStatus, denyReason, onBack, backDisabled,
  setStep, setDenyReason, chainId, asset
}: Props) {
  const isDenied = flowStatus === 'denied';
  const isEvaluating = ['fetching-rule', 'evaluating', 'proving'].includes(flowStatus);

  const ruleEvaluations = targetPolicy?.ruleRefs && targetPolicy.ruleRefs.length > 0
    ? targetPolicy.ruleRefs.map((ref: any) => {
        const ruleName = `Rule NFT ${shortenAddr(ref.ruleNFT)} #${String(ref.tokenId)}`;

        let message: string;
        if (isDenied) {
          const hasOracle = !!getTokenConfig(chainId, asset)?.oracleKey;

          if (!hasOracle) {
            const condition = 'oracle.txValueUsd >= 1000000000';
            const plainEnglish = explainRule(condition);
            const explanation = `\n\nWhy this failed:\n• You're sending ${asset}\n• ${asset} has no price oracle on chain ${chainId}\n• The recipient's rule checks USD value\n• Without a price, the rule cannot evaluate → REJECT`;
            message = `Condition: ${condition}\n${plainEnglish}${explanation}\n\nResult: ${denyReason}`;
          } else {
            message = `Recipient has an active rule that rejected this transaction.\n\nResult: ${denyReason}`;
          }
        } else if (isEvaluating) {
          message = 'Evaluating rule from IPFS...';
        } else {
          message = 'Rule loaded from IPFS';
        }

        return {
          id: String(ref.tokenId),
          name: ruleName,
          status: isDenied ? 'failed' : isEvaluating ? 'running' : 'pending' as const,
          message,
        };
      })
    : [
        {
          id: 'no-rules',
          name: 'No rules configured',
          status: 'passed' as const,
          message: 'Recipient has no active policy rules',
        },
      ]

  return (
    <motion.div
      key="evaluating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <PolicyScanning
        pipeline={pipeline}
        onBack={onBack}
        backDisabled={backDisabled}
        ruleEvaluations={ruleEvaluations}
        riskScore={computeRiskScore(targetAddress, targetPolicy, isDenied, chainId, asset)}
        errorDetail={denyReason || null}
      />

      {denyReason && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setStep('amount');
              setDenyReason('');
            }}
            className={`text-[11px] px-3 py-1.5 rounded-lg ${p.cardBorder} ${p.textMain} hover:bg-black/5 transition-colors`}
          >
            Modify Transaction
          </button>
        </div>
      )}
    </motion.div>
  )
}
