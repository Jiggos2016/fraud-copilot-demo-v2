import type { GroundingCitation } from '@/ai/copilot/grounding';

export type CopilotTranscriptEntry = {
  at: string;
  claimId: string;
  question: string;
  answer: string;
  citations: GroundingCitation[];
  provider: string;
  model: string;
  promptVersion: string;
  mappedPolicyIds: string[];
  ragPolicyIds: string[];
  retrievedCaseIds: string[];
  retrievalScope: 'current-case' | 'expanded-closed-cases';
  citationValidationPassed: boolean;
  citationRetryCount: number;
};

const KEY = 'fraud-copilot-transcript';

const readAll = (): CopilotTranscriptEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || '[]') as CopilotTranscriptEntry[];
  } catch {
    return [];
  }
};

const writeAll = (entries: CopilotTranscriptEntry[]) => {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(KEY, JSON.stringify(entries));
};

export function recordCopilotTranscript(entry: Omit<CopilotTranscriptEntry, 'at'> & { at?: string }) {
  const stored: CopilotTranscriptEntry = { ...entry, at: entry.at ?? new Date().toISOString() };
  writeAll([...readAll(), stored]);
  return stored;
}

export const listCopilotTranscripts = (claimId: string) =>
  readAll().filter(entry => entry.claimId === claimId);
