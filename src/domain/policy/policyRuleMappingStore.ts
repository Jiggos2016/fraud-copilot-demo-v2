import rulesData from '@/data/rules.json';
import type { InvestigationRule } from '@/domain/rules/ruleTypes';
import { getManagedPolicySections } from './policyKnowledgeStore';

const MAPPINGS_KEY = 'fraud-copilot-policy-rule-mappings';
const rules = rulesData as InvestigationRule[];

export type RulePolicyMapping = {
  mapping_id: string;
  rule_id: string;
  document_id: string;
  section_id: string;
  section_heading: string;
  score: number;
  reason: string;
  status: 'Suggested' | 'Approved';
  created_at: string;
  approved_at?: string;
};

const canUseSessionStorage = () => typeof window !== 'undefined' && !!window.sessionStorage;

const readMappings = (): RulePolicyMapping[] => {
  if (!canUseSessionStorage()) return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(MAPPINGS_KEY) || '[]') as RulePolicyMapping[];
  } catch {
    return [];
  }
};

const writeMappings = (value: RulePolicyMapping[]) => {
  if (canUseSessionStorage()) window.sessionStorage.setItem(MAPPINGS_KEY, JSON.stringify(value));
};

const tokenize = (value: string) => [...new Set(
  value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 3 && !['when', 'with', 'from', 'that', 'this', 'must', 'rule', 'review'].includes(token)),
)];

export const listRulePolicyMappings = (documentId?: string) => {
  const mappings = readMappings();
  return documentId ? mappings.filter(mapping => mapping.document_id === documentId) : mappings;
};

export function suggestRulePolicyMappings(documentId: string) {
  const sections = getManagedPolicySections(documentId);
  const createdAt = new Date().toISOString();
  const preserved = readMappings().filter(mapping => mapping.document_id !== documentId || mapping.status === 'Approved');
  const approvedKeys = new Set(preserved.filter(mapping => mapping.status === 'Approved').map(mapping => `${mapping.rule_id}:${mapping.section_id}`));
  const suggestions: RulePolicyMapping[] = [];

  for (const rule of rules) {
    const ruleText = [rule.name, rule.description, rule.trigger_logic, ...rule.trigger_signals, ...rule.evidence_required].join(' ');
    const ruleTokens = tokenize(ruleText);
    const ranked = sections.map(section => {
      const sectionText = `${section.section} ${section.text}`.toLowerCase();
      const matched = ruleTokens.filter(token => sectionText.includes(token));
      const phraseBoost = rule.trigger_signals.some(signal => sectionText.includes(signal.replace(/_/g, ' '))) ? 3 : 0;
      return { section, matched, score: matched.length + phraseBoost };
    }).filter(result => result.score >= 2).sort((a, b) => b.score - a.score).slice(0, 2);

    for (const result of ranked) {
      const key = `${rule.rule_id}:${result.section.snippet_id}`;
      if (approvedKeys.has(key)) continue;
      suggestions.push({
        mapping_id: `MAP-${rule.rule_id}-${result.section.snippet_id}`,
        rule_id: rule.rule_id,
        document_id: documentId,
        section_id: result.section.snippet_id,
        section_heading: result.section.section,
        score: result.score,
        reason: result.matched.length ? `Keyword overlap: ${result.matched.slice(0, 5).join(', ')}` : 'Signal phrase overlap',
        status: 'Suggested',
        created_at: createdAt,
      });
    }
  }

  const merged = [...preserved, ...suggestions];
  writeMappings(merged);
  return merged.filter(mapping => mapping.document_id === documentId);
}

export function approveRulePolicyMapping(mappingId: string) {
  const approvedAt = new Date().toISOString();
  const mappings = readMappings().map(mapping =>
    mapping.mapping_id === mappingId ? { ...mapping, status: 'Approved' as const, approved_at: approvedAt } : mapping,
  );
  writeMappings(mappings);
  return mappings.find(mapping => mapping.mapping_id === mappingId);
}

export function revokeRulePolicyMapping(mappingId: string) {
  const mappings = readMappings().filter(mapping => mapping.mapping_id !== mappingId);
  writeMappings(mappings);
}

export const getApprovedPolicyIdsForRules = (ruleIds: string[]) => [
  ...new Set(readMappings()
    .filter(mapping => mapping.status === 'Approved' && ruleIds.includes(mapping.rule_id))
    .map(mapping => mapping.section_id)),
];

export const getApprovedPolicyIdsForRule = (ruleId: string) => getApprovedPolicyIdsForRules([ruleId]);

export function clearRulePolicyMappings() {
  if (canUseSessionStorage()) window.sessionStorage.removeItem(MAPPINGS_KEY);
}
