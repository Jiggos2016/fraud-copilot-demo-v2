import rulesData from '@/data/rules.json';
import { getApprovedPolicyIdsForRules } from '@/domain/policy/policyRuleMappingStore';
import { getApplicablePolicySections } from '@/domain/policy/policyService';
import type { InvestigationRule, TriggeredRule } from './ruleTypes';

const rules = rulesData as InvestigationRule[];

export const parseSignalString = (value: string) =>
  value.split(';').map(signal => signal.trim()).filter(signal => signal && signal !== 'none');

export const getRuleCatalog = () => rules;

export const getRuleById = (ruleId: string) => rules.find(rule => rule.rule_id === ruleId);

export function evaluateRules(signals: string[]): TriggeredRule[] {
  const activeSignals = new Set(signals);
  return rules
    .filter(rule => rule.status === 'Active')
    .map(rule => ({
      rule,
      matchedSignals: rule.trigger_signals.filter(signal => activeSignals.has(signal)),
    }))
    .filter(result => result.matchedSignals.length > 0);
}

/**
 * Rule-to-policy lineage is deterministic: built-in rule policy IDs plus only
 * administrator-approved uploaded mappings whose policy document is Active in
 * the Policy Knowledge Service.
 */
export const getPolicyIdsForSignals = (signals: string[]) => {
  const triggered = evaluateRules(signals);
  const staticPolicyIds = triggered.flatMap(result => result.rule.policy_ids);
  const approvedUploadedPolicyIds = getApprovedPolicyIdsForRules(triggered.map(result => result.rule.rule_id));
  const activeApprovedUploadedIds = getApplicablePolicySections({ policyIds: approvedUploadedPolicyIds })
    .map(section => section.snippet_id);
  return [...new Set([...staticPolicyIds, ...activeApprovedUploadedIds])];
};
