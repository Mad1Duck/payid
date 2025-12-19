import { validateRequiredContext } from "./validateRequires";
import { verifyAttestation } from "@payid/attestation";

export function preprocessContextV2(
  context: any,
  ruleConfig: any,
  trustedIssuers: Set<string>
) {
  validateRequiredContext(context, ruleConfig.requires);

  if (context.env) {
    verifyAttestation(
      { timestamp: context.env.timestamp },
      context.env.proof,
      trustedIssuers
    );
  }

  if (context.state) {
    verifyAttestation(
      {
        spentToday: context.state.spentToday,
        period: context.state.period
      },
      context.state.proof,
      trustedIssuers
    );
  }

  if (context.oracle) {
    const { proof, ...data } = context.oracle;
    verifyAttestation(data, proof, trustedIssuers);
  }

  if (context.risk) {
    verifyAttestation(
      {
        score: context.risk.score,
        category: context.risk.category,
        modelHash: context.risk.proof.modelHash
      },
      context.risk.proof,
      trustedIssuers
    );
  }

  return context;
}