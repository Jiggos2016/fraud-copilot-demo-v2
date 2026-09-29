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
  mappedPolicyIds?: string[];
  ragPolicyIds?: string[];
  retrievalScope?: 'current-case' | 'expanded-closed-cases';
  citationValidationPassed?: boolean;
  citationRetryCount?: number;
}, at = auditNow()): AuditEntry[] {
  const scope = input.retrievalScope ?? inferRetrievalScope(input.question);
  const entries = [
    createAuditEntry('Copilot question', input.question, at),
    createAuditEntry('Retrieval scope', scope === 'expanded-closed-cases' ? 'Investigator explicitly broadened retrieval to similar closed cases / precedent.' : 'Default scope: current case plus policy knowledge only.', at),
    createAuditEntry('Mapped policy fetch', (input.mappedPolicyIds ?? []).join(', ') || 'No triggered-rule policy mapping', at),
    createAuditEntry('Question-driven RAG', (input.ragPolicyIds ?? input.retrievedPolicyIds).join(', ') || 'No additional policy result', at),
    createAuditEntry('Case retrieval', input.retrievedCaseIds.join(', ') || 'Current case only / no additional case result', at),
    createAuditEntry('AI provider', `${input.provider} / ${input.model} / ${input.promptVersion}`, at),
    createAuditEntry('Citation returned', input.citations.join(', ') || 'No citation returned', at),
  ];
  if (typeof input.citationRetryCount === 'number' && input.citationRetryCount > 0) {
    entries.push(createAuditEntry('Citation retry', `Initial output blocked; retried ${input.citationRetryCount} time with stricter grounding.`, at));
  }
  if (typeof input.citationValidationPassed === 'boolean') {
    entries.push(createAuditEntry('Post-generation citation check', input.citationValidationPassed ? 'Passed' : 'Blocked after retry; returned canonical no-grounded-answer response.', at));
  }
  return entries;
}
