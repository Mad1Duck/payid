import type { PayIDFlowStatus } from 'payid-react';
import type { RuleStatus } from './types';

export const cardBase = 'rounded-2xl relative overflow-hidden';

export const FLOW_STEPS = [
  { id: 'ctx', name: 'Build Context' },
  { id: 'resolve', name: 'Fetch Rules (IPFS)' },
  { id: 'evaluate', name: 'WASM Evaluate' },
  { id: 'decision', name: 'Decision Proof' },
  { id: 'sign', name: 'EIP-712 Sign' },
  { id: 'submit', name: 'Submit Tx' },
];

export function getPipeline(
  s: PayIDFlowStatus,
): Array<{ id: string; name: string; status: RuleStatus; }> {
  let doneUpTo = -1,
    runningAt = -1,
    errorAt = -1;
  if (s === 'fetching-rule') {
    runningAt = 0;
  } else if (s === 'evaluating') {
    doneUpTo = 0;
    runningAt = 1;
  } else if (s === 'proving') {
    doneUpTo = 1;
    runningAt = 2;
  } else if (s === 'approving') {
    doneUpTo = 2;
    runningAt = 3;
  } else if (s === 'awaiting-wallet') {
    doneUpTo = 3;
    runningAt = 4;
  } else if (s === 'confirming') {
    doneUpTo = 4;
    runningAt = 5;
  } else if (s === 'success') {
    doneUpTo = 5;
  } else if (s === 'denied') {
    doneUpTo = 1;
    errorAt = 2;
  } else if (s === 'error') {
    doneUpTo = 2;
    errorAt = 3;
  }
  return FLOW_STEPS.map((step, i) => ({
    ...step,
    status: (i <= doneUpTo
      ? 'done'
      : i === errorAt
        ? 'error'
        : i === runningAt
          ? 'running'
          : 'pending') as RuleStatus,
  }));
}
