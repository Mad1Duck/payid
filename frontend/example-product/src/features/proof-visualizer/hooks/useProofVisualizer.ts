import { useState, useCallback } from 'react';
import { useV4Palette } from '@/components/v4/theme';

export type Stage =
  | 'idle'
  | 'context'
  | 'storage'
  | 'resolve'
  | 'evaluate'
  | 'decision'
  | 'sign'
  | 'validate'
  | 'complete';

export interface StageInfo {
  key: Stage;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

export const STAGES: StageInfo[] = [
  { key: 'context', title: 'Build Context', subtitle: 'tx + payId + env + oracle', icon: 'Layers', color: '#0EA5E9' },
  { key: 'storage', title: 'IPFS Storage', subtitle: 'Fetching rule blob from IPFS', icon: 'Database', color: '#8B5CF6' },
  { key: 'resolve', title: 'Resolve Rules', subtitle: 'IPFS hash → WASM config', icon: 'Box', color: '#EC4899' },
  { key: 'evaluate', title: 'WASM Engine', subtitle: 'Deterministic execution', icon: 'Cpu', color: '#F59E0B' },
  { key: 'decision', title: 'Decision', subtitle: 'ALLOW / REJECT', icon: 'FileCheck', color: '#00D084' },
  { key: 'sign', title: 'EIP-712 Sign', subtitle: 'Typed data signature', icon: 'PenTool', color: '#06B6D4' },
  { key: 'validate', title: 'On-Chain', subtitle: 'PayIDVerifier.validate', icon: 'Link2', color: '#00D084' },
];

// Sample transaction data for demo
const SAMPLE_TX = {
  sender: '0x1234567890123456789012345678901234567890',
  receiver: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  amount: '20000000', // 20 USDC (6 decimals)
  chainId: 1,
};

// Sample rule logic for demo (deterministic: 20 USDC <= 100 USDC limit = ALLOW)
const DEMO_RULES = [
  { id: 'usdc_only', check: () => SAMPLE_TX.asset === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', message: 'Only USDC payments allowed' },
  { id: 'max_amount', check: () => BigInt(SAMPLE_TX.amount) <= 100000000n, message: 'Amount exceeds daily limit of 100 USDC' },
  { id: 'kyc_required', check: () => true, message: 'KYC level 1 or higher required' },
];

export function useProofVisualizer() {
  const p = useV4Palette();
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedStage, setSelectedStage] = useState<Stage>('idle');
  const [history, setHistory] = useState<Stage[]>([]);
  const [result, setResult] = useState<'allow' | 'reject' | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const start = useCallback(async () => {
    setStage('context');
    setSelectedStage('context');
    setHistory(['context']);
    setResult(null);
    setReason(null);

    const sequence: Stage[] = ['context', 'storage', 'resolve', 'evaluate', 'decision', 'sign', 'validate'];

    // Simulate stages with delays, but use deterministic rule evaluation
    for (let i = 0; i < sequence.length; i++) {
      const next = sequence[i];
      await new Promise((r) => setTimeout(r, 800)); // Delay between stages
      setStage(next);
      setHistory((h) => [...h, next]);

      // Deterministic rule evaluation at the 'evaluate' stage
      if (next === 'evaluate') {
        setSelectedStage('evaluate');
        // Evaluate all rules (AND logic)
        const failedRule = DEMO_RULES.find(rule => !rule.check());

        setStage('decision');
        setHistory((h) => [...h, 'decision']);
        setSelectedStage('decision');

        if (failedRule) {
          setResult('reject');
          setReason(failedRule.message);
        } else {
          setResult('allow');
          setReason('All rules passed: USDC only, amount within limit, KYC verified');
        }

        // Continue to remaining stages
        await new Promise((r) => setTimeout(r, 600));
        setStage('sign');
        setHistory((h) => [...h, 'sign']);
        setSelectedStage('sign');
        await new Promise((r) => setTimeout(r, 600));
        setStage('validate');
        setHistory((h) => [...h, 'validate']);
        setSelectedStage('validate');
        await new Promise((r) => setTimeout(r, 600));
        setStage('complete');
        setSelectedStage('complete');
        return;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setSelectedStage('idle');
    setHistory([]);
    setResult(null);
  }, []);

  const currentStageInfo = STAGES.find((s) => s.key === stage);

  return { p, stage, selectedStage, setSelectedStage, history, result, reason, start, reset, currentStageInfo };
}
