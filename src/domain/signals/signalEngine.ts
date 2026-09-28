export type ClaimSignalInput = {
  claim_id: string;
  claimant_id: string;
  top_signals: string;
};

export type ClaimantSignalInput = {
  claimant_id: string;
  state_of_residence: string;
  filing_ip: string;
  ip_geo_state: string;
  ip_geo_country: string;
  device_fingerprint: string;
};

export type DetectedSignal = {
  key: string;
  source: 'derived-from-claimant-data' | 'upstream-source-signal';
};

const parseUpstreamSignals = (value: string) =>
  value.split(';').map(signal => signal.trim()).filter(signal => signal && signal !== 'none');

/**
 * Converts source data into explainable investigation signals.
 *
 * Signals that can be reproduced from the local claimant dataset are derived here.
 * Signals requiring upstream wage, registry, network-list, or other enterprise data
 * are preserved as upstream source signals in this static MVP.
 */
export function detectSignalsForClaim(
  claim: ClaimSignalInput,
  claimant: ClaimantSignalInput,
  allClaimants: ClaimantSignalInput[],
): DetectedSignal[] {
  const detected = new Map<string, DetectedSignal>();
  const add = (key: string, source: DetectedSignal['source']) => detected.set(key, { key, source });

  const sharedIp = allClaimants.some(other =>
    other.claimant_id !== claimant.claimant_id && other.filing_ip === claimant.filing_ip,
  );
  if (sharedIp) add('same_ip_multi_claimant', 'derived-from-claimant-data');

  const reusedDevice = allClaimants.some(other =>
    other.claimant_id !== claimant.claimant_id && other.device_fingerprint === claimant.device_fingerprint,
  );
  if (reusedDevice) add('device_fingerprint_reuse', 'derived-from-claimant-data');

  if (claimant.ip_geo_country && claimant.ip_geo_country !== 'US') {
    add('cross_country_ip_mismatch', 'derived-from-claimant-data');
  } else if (claimant.ip_geo_state && claimant.state_of_residence && claimant.ip_geo_state !== claimant.state_of_residence) {
    add('cross_state_ip_mismatch', 'derived-from-claimant-data');
  }

  for (const signal of parseUpstreamSignals(claim.top_signals)) {
    if (!detected.has(signal)) add(signal, 'upstream-source-signal');
  }

  return [...detected.values()];
}

export const signalKeys = (signals: DetectedSignal[]) => signals.map(signal => signal.key);
