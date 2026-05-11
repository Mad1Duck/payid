import type { RuleContext } from "./types";

export function normalizeContext(ctx: RuleContext): RuleContext {
  return {
    ...ctx,
    tx: {
      ...ctx.tx,
      sender: ctx.tx.sender,
      receiver: ctx.tx.receiver,
      asset: ctx.tx.asset
    }
  };
}
