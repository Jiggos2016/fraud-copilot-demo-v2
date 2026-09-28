export type RiskBand = 'Low' | 'Medium' | 'High';

export type FeatureAttribution = {
  feature: string;
  direction: 'raises-priority' | 'lowers-priority' | 'neutral';
  explanation: string;
};

export type MlRiskOutput = {
  claimId: string;
  priorityScore: number;
  priorityBand: RiskBand;
  modelVersion: string;
  scoringMode: 'precomputed-demo-inference';
  ensemble: ['gradient-boosted-classifier', 'unsupervised-anomaly-detector'];
  featureAttributions: FeatureAttribution[];
};

type ClaimRiskInput = {
  claim_id: string;
  risk_score: number;
  top_signals: string;
};

const bandForScore = (score: number): RiskBand => score < 40 ? 'Low' : score < 70 ? 'Medium' : 'High';

const attributionText: Record<string, string> = {
  same_ip_multi_claimant: 'Shared filing infrastructure contributed to investigation priority.',
  device_fingerprint_reuse: 'Device reuse across claimant records contributed to investigation priority.',
  cross_country_ip_mismatch: 'Filing geography mismatch contributed to investigation priority.',
  cross_state_ip_mismatch: 'Residence and filing-network geography mismatch contributed to investigation priority.',
  sequential_ip_cluster: 'Network-cluster behavior contributed to investigation priority.',
  blocklisted_ip_range: 'Higher-risk network context contributed to investigation priority.',
  undeclared_wage_match: 'Potential wage-reporting mismatch contributed to investigation priority.',
  new_hire_registry_lag: 'Employment-timing signal contributed to investigation priority.',
};

/**
 * Phase-1 architecture contract for ML prioritization.
 *
 * The static demo already contains seeded risk scores. We expose those values through
 * the same contract a production gradient-boosted + anomaly ensemble would use.
 * Critically, this is an investigation-priority score, never a probability of fraud.
 */
export function getMlRiskOutput(claim: ClaimRiskInput): MlRiskOutput {
  const signals = claim.top_signals.split(';').map(value => value.trim()).filter(value => value && value !== 'none');
  return {
    claimId: claim.claim_id,
    priorityScore: claim.risk_score,
    priorityBand: bandForScore(claim.risk_score),
    modelVersion: 'demo-ensemble-v1',
    scoringMode: 'precomputed-demo-inference',
    ensemble: ['gradient-boosted-classifier', 'unsupervised-anomaly-detector'],
    featureAttributions: signals.map(feature => ({
      feature,
      direction: 'raises-priority' as const,
      explanation: attributionText[feature] || 'This feature contributed to investigation priority in the synthetic demo output.',
    })),
  };
}
