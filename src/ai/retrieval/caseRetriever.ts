import claimsData from '@/data/claims.json';
import casesData from '@/data/cases.json';
import { parseSignalString } from '@/domain/rules/ruleEngine';
import { getMlRiskOutput, type FeatureAttribution, type RiskBand } from '@/domain/ml/mlRiskService';

export type CaseRetrievalResult = {
  caseId: string;
  claimId: string;
  disposition: string;
  notes: string;
  matchedSignals: string[];
  score: number;
  scope: 'current-case' | 'expanded-closed-cases';
  priorityScore?: number;
  priorityBand?: RiskBand;
  modelVersion?: string;
  featureAttributions?: FeatureAttribution[];
};

/**
 * Case-first knowledge is always available independently of rule hits. This is
 * important for anomaly-only cases where ML prioritizes a claim but no
 * deterministic rule fires.
 */
export function retrieveCurrentCaseKnowledge(claimId: string): CaseRetrievalResult[] {
  const claim = claimsData.find(item => item.claim_id === claimId);
  const caseItem = casesData.find(item => item.claim_id === claimId);
  if (!claim) return [];

  const ml = getMlRiskOutput(claim);
  return [{
    caseId: caseItem?.case_id ?? claimId,
    claimId,
    disposition: caseItem?.disposition ?? 'Open',
    notes: caseItem?.notes_summary ?? 'Current claim record.',
    matchedSignals: parseSignalString(claim.top_signals),
    score: 100,
    scope: 'current-case',
    priorityScore: ml.priorityScore,
    priorityBand: ml.priorityBand,
    modelVersion: ml.modelVersion,
    featureAttributions: ml.featureAttributions,
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
