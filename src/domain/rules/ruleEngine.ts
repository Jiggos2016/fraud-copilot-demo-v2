import rulesData from '@/data/rules.json';
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

export const getPolicyIdsForSignals = (signals: string[]) =>
  [...new Set(evaluateRules(signals).flatMap(result => result.rule.policy_ids))];
