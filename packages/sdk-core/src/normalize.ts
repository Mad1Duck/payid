import type { RuleContext } from "payid-types";

export function normalizeContext(ctx: RuleContext): RuleContext {
  return {
    ...ctx,
    tx: {
      ...ctx.tx,
      sender: ctx.tx.sender?.toLowerCase(),
      receiver: ctx.tx.receiver?.toLowerCase(),
      asset: ctx.tx.asset.toUpperCase()
    }
  };
}
