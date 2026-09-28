import claimsData from '@/data/claims.json';
import casesData from '@/data/cases.json';
import { parseSignalString } from '@/domain/rules/ruleEngine';

export type CaseRetrievalResult = {
  caseId: string;
  claimId: string;
  disposition: string;
  notes: string;
  matchedSignals: string[];
  score: number;
  scope: 'current-case' | 'expanded-closed-cases';
};

export function retrieveCurrentCaseKnowledge(claimId: string): CaseRetrievalResult[] {
  const caseItem = casesData.find(item => item.claim_id === claimId);
  if (!caseItem) return [];
  const claim = claimsData.find(item => item.claim_id === claimId);
  return [{
    caseId: caseItem.case_id,
    claimId,
    disposition: caseItem.disposition,
    notes: caseItem.notes_summary,
    matchedSignals: claim ? parseSignalString(claim.top_signals) : [],
    score: 100,
    scope: 'current-case',
  }];
}

export function retrieveSimilarClosedCases(claimId: string, signals: string[], limit = 3): CaseRetrievalResult[] {
  const signalSet = new Set(signals);

  return casesData
    .filter(caseItem => caseItem.claim_id !== claimId && caseItem.disposition !== 'Open')
    .map(caseItem => {
      const relatedClaim = claimsData.find(claim => claim.claim_id === caseItem.claim_id);
      const relatedSignals = relatedClaim ? parseSignalString(relatedClaim.top_signals) : [];
      const matchedSignals = relatedSignals.filter(signal => signalSet.has(signal));
      return {
        caseId: caseItem.case_id,
        claimId: caseItem.claim_id,
        disposition: caseItem.disposition,
        notes: caseItem.notes_summary,
        matchedSignals,
        score: matchedSignals.length * 3,
        scope: 'expanded-closed-cases' as const,
      };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.caseId.localeCompare(b.caseId))
    .slice(0, limit);
}
