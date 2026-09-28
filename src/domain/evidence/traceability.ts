import { evaluateRules } from '@/domain/rules/ruleEngine';
import { getPolicySection } from '@/domain/policy/policyService';

export type TraceabilityRecord = {
  signal: string;
  ruleId: string;
  ruleName: string;
  policyIds: string[];
  policySections: string[];
  requiredEvidence: string[];
  systemAction: string;
  prohibitedAction: string;
};

export function buildTraceability(signals: string[]): TraceabilityRecord[] {
  return evaluateRules(signals).flatMap(({ rule, matchedSignals }) =>
    matchedSignals.map(signal => ({
      signal,
      ruleId: rule.rule_id,
      ruleName: rule.name,
      policyIds: rule.policy_ids,
      policySections: rule.policy_ids.map(id => {
        const policy = getPolicySection(id);
        return policy ? `${id} · ${policy.section}` : id;
      }),
      requiredEvidence: rule.evidence_required,
      systemAction: rule.system_action,
      prohibitedAction: rule.prohibited_action,
    })),
  );
}
