import type { InvestigationRationale } from '@/ai/copilot/rationale';
import type { GroundingCitation } from '@/ai/copilot/grounding';

export type MinimumNecessaryAiContext = {
  claimReference: string;
  question: string;
  signals: string[];
  triggeredRuleIds: string[];
  mappedPolicyReferences: string[];
  ragPolicyReferences: string[];
  caseReferences: string[];
  sourceSummaries: string[];
  rationale: InvestigationRationale;
  piiPolicy: 'minimum-necessary';
};

/**
 * Internal AI-gateway stage. Direct claimant PII such as name, filing IP,
 * device fingerprint, address, or employer contact information is excluded.
 * Every model request must pass through this function before provider routing.
 */
export function assembleMinimumNecessaryContext(input: {
  claimId: string;
  question: string;
  signals: string[];
  triggeredRuleIds: string[];
  mappedPolicyIds: string[];
  ragPolicyIds: string[];
  citations: GroundingCitation[];
  sourceSummaries: string[];
  rationale: InvestigationRationale;
}): MinimumNecessaryAiContext {
  return {
    claimReference: input.claimId,
    question: input.question,
    signals: input.signals,
    triggeredRuleIds: input.triggeredRuleIds,
    mappedPolicyReferences: input.mappedPolicyIds,
    ragPolicyReferences: input.ragPolicyIds,
    caseReferences: input.citations.filter(citation => citation.type === 'case').map(citation => citation.id),
    sourceSummaries: input.sourceSummaries,
    rationale: input.rationale,
    piiPolicy: 'minimum-necessary',
  };
}
