export type GroundingCitation = {
  type: 'case' | 'policy';
  id: string;
  label: string;
};

export const NO_GROUNDED_ANSWER = 'No grounded answer found for this query.';

export function requireGrounding(answer: string, citations: GroundingCitation[]) {
  if (!answer.trim() || citations.length === 0) {
    return { answer: NO_GROUNDED_ANSWER, citations: [] as GroundingCitation[] };
  }
  return { answer, citations };
}
