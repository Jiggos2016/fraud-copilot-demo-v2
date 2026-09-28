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

export function createCopilotAuditEntries(input: {
  question: string;
  citations: string[];
  provider: string;
  model: string;
  promptVersion: string;
  retrievedPolicyIds: string[];
  retrievedCaseIds: string[];
}, at = auditNow()): AuditEntry[] {
  return [
    createAuditEntry('Copilot question', input.question, at),
    createAuditEntry('Retrieval', `Policies: ${input.retrievedPolicyIds.join(', ') || 'none'}; Cases: ${input.retrievedCaseIds.join(', ') || 'none'}`, at),
    createAuditEntry('AI provider', `${input.provider} / ${input.model} / ${input.promptVersion}`, at),
    createAuditEntry('Citation returned', input.citations.join(', ') || 'No citation returned', at),
  ];
}
