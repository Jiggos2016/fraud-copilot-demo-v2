import { evaluateRules } from '@/domain/rules/ruleEngine';
import { getPolicySection } from '@/domain/policy/policyService';
import { retrieveSimilarClosedCases } from '@/ai/retrieval/caseRetriever';

export type InvestigationRationale = {
  whyPrioritized: string[];
  triggeredSignals: string[];
  triggeredRules: string[];
  applicablePolicies: string[];
  supportingEvidence: string[];
  contradictingEvidence: string[];
  missingEvidence: string[];
  similarCases: string[];
  recommendedNextSteps: string[];
};

export function buildInvestigationRationale(claimId: string, signals: string[]): InvestigationRationale {
  const triggeredRules = evaluateRules(signals);
  const policyIds = [...new Set(triggeredRules.flatMap(result => result.rule.policy_ids))];
  const similarCases = retrieveSimilarClosedCases(claimId, signals);
  const evidenceRequired = [...new Set(triggeredRules.flatMap(result => result.rule.evidence_required))];

  return {
    whyPrioritized: triggeredRules.map(result => `${result.rule.rule_id} · ${result.rule.name}`),
    triggeredSignals: signals,
    triggeredRules: triggeredRules.map(result => result.rule.rule_id),
    applicablePolicies: policyIds.map(id => {
      const policy = getPolicySection(id);
      return policy ? `${id} · ${policy.section}` : id;
    }),
    supportingEvidence: signals.length ? signals : ['No active automated signal in the demo record'],
    contradictingEvidence: ['No contradictory evidence is automatically inferred. Investigator review is required.'],
    missingEvidence: evidenceRequired,
    similarCases: similarCases.map(result => `${result.caseId} · ${result.disposition}`),
    recommendedNextSteps: triggeredRules.map(result => result.rule.system_action),
  };
}
