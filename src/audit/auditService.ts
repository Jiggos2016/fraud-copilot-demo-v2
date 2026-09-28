export type AuditEntry = {
  at: string;
  action: string;
  detail: string;
};

export const auditNow = () => new Date().toLocaleString();

export const createAuditEntry = (action: string, detail: string, at = auditNow()): AuditEntry => ({
  at,
  action,
  detail,
});

const inferRetrievalScope = (question: string) => {
  const q = question.toLowerCase();
  return ['similar closed', 'closed case', 'prior adjudication', 'precedent', 'similar case'].some(term => q.includes(term))
    ? 'expanded-closed-cases'
    : 'current-case';
};

export function createCopilotAuditEntries(input: {
  question: string;
  citations: string[];
  provider: string;
  model: string;
  promptVersion: string;
  retrievedPolicyIds: string[];
  retrievedCaseIds: string[];
  retrievalScope?: 'current-case' | 'expanded-closed-cases';
  citationValidationPassed?: boolean;
}, at = auditNow()): AuditEntry[] {
  const scope = input.retrievalScope ?? inferRetrievalScope(input.question);
  const entries = [
    createAuditEntry('Copilot question', input.question, at),
    createAuditEntry('Retrieval scope', scope === 'expanded-closed-cases' ? 'Investigator explicitly broadened retrieval to similar closed cases / precedent.' : 'Default scope: current case plus applicable policy only.', at),
    createAuditEntry('Retrieval', `Policies: ${input.retrievedPolicyIds.join(', ') || 'none'}; Cases: ${input.retrievedCaseIds.join(', ') || 'none'}`, at),
    createAuditEntry('AI provider', `${input.provider} / ${input.model} / ${input.promptVersion}`, at),
    createAuditEntry('Citation returned', input.citations.join(', ') || 'No citation returned', at),
  ];
  if (typeof input.citationValidationPassed === 'boolean') {
    entries.push(createAuditEntry('Post-generation citation check', input.citationValidationPassed ? 'Passed' : 'Blocked response', at));
  }
  return entries;
}
