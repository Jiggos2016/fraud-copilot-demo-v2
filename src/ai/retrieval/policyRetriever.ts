import { getApplicablePolicySections } from '@/domain/policy/policyService';
import type { PolicyQueryContext, PolicySection } from '@/domain/policy/policyTypes';

export type PolicyRetrievalResult = {
  item: PolicySection;
  score: number;
  reasons: string[];
};

export type PolicyRetrievalContext = PolicyQueryContext & {
  limit?: number;
};

const tokenize = (text: string) =>
  [...new Set(text.toLowerCase().split(/[^a-z0-9-]+/).filter(token => token.length > 2))];

export function retrievePolicies(query: string, context: PolicyRetrievalContext = {}): PolicyRetrievalResult[] {
  const queryTokens = tokenize(query);
  const policyContext: PolicyQueryContext = {
    ...(context.policyIds ? { policyIds: context.policyIds } : {}),
    ...(context.asOfDate ? { asOfDate: context.asOfDate } : {}),
    ...(context.jurisdiction ? { jurisdiction: context.jurisdiction } : {}),
  };
  const candidates = getApplicablePolicySections(policyContext);

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
