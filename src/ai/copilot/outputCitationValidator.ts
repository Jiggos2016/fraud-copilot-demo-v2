import { NO_GROUNDED_ANSWER, type GroundingCitation } from './grounding';

export type CitationValidationResult = {
  answer: string;
  citations: GroundingCitation[];
  passed: boolean;
  reason?: string;
};

/**
 * Independent output-side guardrail. The model response is not shown unless it
 * is non-empty and every returned citation points to a source actually retrieved
 * for this request.
 */
export function validateGeneratedCitations(
  answer: string,
  citations: GroundingCitation[],
  retrievedSourceIds: string[],
): CitationValidationResult {
  const allowed = new Set(retrievedSourceIds);
  if (!answer.trim()) {
    return { answer: NO_GROUNDED_ANSWER, citations: [], passed: false, reason: 'empty-response' };
  }
  if (citations.length === 0) {
    return { answer: NO_GROUNDED_ANSWER, citations: [], passed: false, reason: 'missing-citations' };
  }
  if (citations.some(citation => !allowed.has(citation.id))) {
    return { answer: NO_GROUNDED_ANSWER, citations: [], passed: false, reason: 'citation-not-in-retrieval-set' };
  }
  return { answer, citations, passed: true };
}
