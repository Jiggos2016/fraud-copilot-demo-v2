import { getApplicablePolicySections } from '@/domain/policy/policyService';
import type { PolicySection } from '@/domain/policy/policyTypes';

export type PolicyRetrievalResult = {
  item: PolicySection;
  score: number;
  reasons: string[];
};

export type PolicyRetrievalContext = {
  policyIds?: string[];
  asOfDate?: string;
  jurisdiction?: string;
  limit?: number;
};

const tokenize = (text: string) =>
  [...new Set(text.toLowerCase().split(/[^a-z0-9-]+/).filter(token => token.length > 2))];

export function retrievePolicies(query: string, context: PolicyRetrievalContext = {}): PolicyRetrievalResult[] {
  const queryTokens = tokenize(query);
  const candidates = getApplicablePolicySections({
    policyIds: context.policyIds,
    asOfDate: context.asOfDate,
    jurisdiction: context.jurisdiction,
  });

  return candidates
    .map(item => {
      const haystack = `${item.snippet_id} ${item.source_doc} ${item.section} ${item.text}`.toLowerCase();
      const matchedTokens = queryTokens.filter(token => haystack.includes(token));
      const explicitPolicyMatch = context.policyIds?.includes(item.snippet_id) ?? false;
      const idMatch = query.toLowerCase().includes(item.snippet_id.toLowerCase());
      const score = matchedTokens.length + (explicitPolicyMatch ? 5 : 0) + (idMatch ? 4 : 0);
      const reasons = [
        ...(explicitPolicyMatch ? ['rule-to-policy mapping'] : []),
        ...(idMatch ? ['exact policy id'] : []),
        ...(matchedTokens.length ? [`keyword overlap: ${matchedTokens.join(', ')}`] : []),
      ];
      return { item, score, reasons };
    })
    .filter(result => result.score > 0 || !queryTokens.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, context.limit ?? 5);
}
