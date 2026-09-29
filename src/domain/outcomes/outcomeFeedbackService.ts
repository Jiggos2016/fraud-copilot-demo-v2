export type FinalDisposition = 'Confirmed Fraud' | 'False Positive' | 'Inconclusive';

export type OutcomeFeedbackRecord = {
  claimId: string;
  disposition: FinalDisposition;
  decidedAt: string;
  appealOutcome: 'none' | 'upheld' | 'reversed' | 'modified';
  trainingStatus: 'pending-label-review' | 'approved-for-training' | 'excluded';
  source: 'investigator-disposition';
};

const OUTCOME_KEY = 'fraud-copilot-outcome-feedback';

const canUseSessionStorage = () => typeof window !== 'undefined' && !!window.sessionStorage;

const readOutcomes = (): OutcomeFeedbackRecord[] => {
  if (!canUseSessionStorage()) return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(OUTCOME_KEY) || '[]') as OutcomeFeedbackRecord[];
  } catch {
    return [];
  }
};

const writeOutcomes = (records: OutcomeFeedbackRecord[]) => {
  if (canUseSessionStorage()) window.sessionStorage.setItem(OUTCOME_KEY, JSON.stringify(records));
};

/**
 * Records a human disposition as governed feedback. The outcome is NOT used to
 * retrain a model automatically. It enters a pending label-review state so a
 * future training pipeline can curate labels, evaluate fairness/performance,
 * and promote a model only through an explicit registry gate.
 */
export function recordOutcomeFeedback(input: {
  claimId: string;
  disposition: FinalDisposition;
  decidedAt: string;
}): OutcomeFeedbackRecord {
  const record: OutcomeFeedbackRecord = {
    claimId: input.claimId,
    disposition: input.disposition,
    decidedAt: input.decidedAt,
    appealOutcome: 'none',
    trainingStatus: 'pending-label-review',
    source: 'investigator-disposition',
  };
  const remaining = readOutcomes().filter(item => item.claimId !== input.claimId);
  writeOutcomes([...remaining, record]);
  return record;
}

export const listOutcomeFeedback = () => readOutcomes();

export function recordAppealOutcome(claimId: string, appealOutcome: OutcomeFeedbackRecord['appealOutcome']) {
  const records = readOutcomes().map(record => record.claimId === claimId ? { ...record, appealOutcome } : record);
  writeOutcomes(records);
  return records.find(record => record.claimId === claimId);
}
