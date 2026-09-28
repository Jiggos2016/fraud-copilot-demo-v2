import claimsData from '@/data/claims.json';
import claimantsData from '@/data/claimants.json';
import employersData from '@/data/employers.json';
import { getMlRiskOutput } from '@/domain/ml/mlRiskService';
import { detectSignalsForClaim, signalKeys } from '@/domain/signals/signalEngine';
import { evaluateRules } from '@/domain/rules/ruleEngine';

export type PrioritizedClaim = (typeof claimsData)[number] & {
  claimant: (typeof claimantsData)[number];
  employer: (typeof employersData)[number];
  priority_score: number;
  priority_band: 'Low' | 'Medium' | 'High';
  ml_model_version: string;
  ml_scoring_mode: 'precomputed-demo-inference';
  detected_signals: string[];
  signal_sources: Record<string, 'derived-from-claimant-data' | 'upstream-source-signal'>;
  triggered_rule_ids: string[];
};

/**
 * Joins ML prioritization with explainable signal/rule context for the Risk Queue.
 * ML sets rank. Signals and deterministic rules explain why the case deserves review.
 */
export function getPrioritizedWorkload(): PrioritizedClaim[] {
  return claimsData.map(claim => {
    const claimant = claimantsData.find(item => item.claimant_id === claim.claimant_id)!;
    const employer = employersData.find(item => item.employer_id === claim.employer_id)!;
    const ml = getMlRiskOutput(claim);
    const detected = detectSignalsForClaim(claim, claimant, claimantsData);
    const signals = signalKeys(detected);
    const triggeredRules = evaluateRules(signals);

    return {
      ...claim,
      claimant,
      employer,
      risk_score: ml.priorityScore,
      risk_band: ml.priorityBand,
      top_signals: signals.length ? signals.join(';') : 'none',
      priority_score: ml.priorityScore,
      priority_band: ml.priorityBand,
      ml_model_version: ml.modelVersion,
      ml_scoring_mode: ml.scoringMode,
      detected_signals: signals,
      signal_sources: Object.fromEntries(detected.map(signal => [signal.key, signal.source])),
      triggered_rule_ids: triggeredRules.map(result => result.rule.rule_id),
    };
  });
}

export function getPrioritizedClaim(claimId: string) {
  return getPrioritizedWorkload().find(claim => claim.claim_id === claimId);
}
