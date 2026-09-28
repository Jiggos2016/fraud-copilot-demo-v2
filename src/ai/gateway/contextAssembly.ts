import type { InvestigationRationale } from '@/ai/copilot/rationale';
import type { GroundingCitation } from '@/ai/copilot/grounding';

export type MinimumNecessaryAiContext = {
  claimReference: string;
  question: string;
  signals: string[];
  triggeredRuleIds: string[];
  policyReferences: string[];
  caseReferences: string[];
  sourceSummaries: string[];
  rationale: InvestigationRationale;
  piiPolicy: 'minimum-necessary';
};

/**
 * Builds the context sent to the model. Direct claimant PII such as name,
 * filing IP, device fingerprint, address, or employer contact information is
 * intentionally excluded unless a future approved use case explicitly needs it.
 */
export function assembleMinimumNecessaryContext(input: {
  claimId: string;
  question: string;
  signals: string[];
  triggeredRuleIds: string[];
  citations: GroundingCitation[];
  sourceSummaries: string[];
  rationale: InvestigationRationale;
}): MinimumNecessaryAiContext {
  return {
    claimReference: input.claimId,
    question: input.question,
    signals: input.signals,
    triggeredRuleIds: input.triggeredRuleIds,
    policyReferences: input.citations.filter(citation => citation.type === 'policy').map(citation => citation.id),
    caseReferences: input.citations.filter(citation => citation.type === 'case').map(citation => citation.id),
    sourceSummaries: input.sourceSummaries,
    rationale: input.rationale,
    piiPolicy: 'minimum-necessary',
  };
}
