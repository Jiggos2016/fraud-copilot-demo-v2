import scriptsData from '@/data/copilotScripts.json';
import { getPolicyIdsForSignals } from '@/domain/rules/ruleEngine';
import { retrievePolicies } from '@/ai/retrieval/policyRetriever';
import { retrieveSimilarClosedCases } from '@/ai/retrieval/caseRetriever';
import { aiGateway } from '@/ai/gateway/aiGateway';
import { buildInvestigationRationale, type InvestigationRationale } from './rationale';
import { requireGrounding, type GroundingCitation } from './grounding';

export type CopilotAnswer = {
  answer: string;
  citations: GroundingCitation[];
  rationale: InvestigationRationale;
  provider: string;
  model: string;
  promptVersion: string;
  retrievedPolicyIds: string[];
  retrievedCaseIds: string[];
};

type Script = {
  match: string;
  answer: string;
  citations: GroundingCitation[];
};

const scripts = scriptsData as Record<string, Script[]>;

export async function answerCopilotQuestion(input: {
  claimId: string;
  signals: string[];
  question: string;
  intent?: string;
  asOfDate?: string;
}): Promise<CopilotAnswer> {
  const rationale = buildInvestigationRationale(input.claimId, input.signals);
  const scripted = scripts[input.claimId] || [];
  const scriptHit = input.intent
    ? scripted.find(script => script.match === input.intent)
    : scripted.find(script => {
        const query = input.question.toLowerCase();
        return query.includes(script.match.toLowerCase()) || script.match.toLowerCase().includes(query);
      });

  if (scriptHit) {
    const grounded = requireGrounding(scriptHit.answer, scriptHit.citations);
    return {
      ...grounded,
      rationale,
      provider: 'scripted-local',
      model: 'grounded-script-v1',
      promptVersion: 'fraud-copilot-script-v1',
      retrievedPolicyIds: scriptHit.citations.filter(c => c.type === 'policy').map(c => c.id),
      retrievedCaseIds: scriptHit.citations.filter(c => c.type === 'case').map(c => c.id),
    };
  }

  const policyIds = getPolicyIdsForSignals(input.signals);
  const policyResults = retrievePolicies(input.question, {
    policyIds,
    asOfDate: input.asOfDate,
    limit: 4,
  });
  const caseResults = retrieveSimilarClosedCases(input.claimId, input.signals, 3);

  const citations: GroundingCitation[] = [
    ...policyResults.map(({ item }) => ({
      type: 'policy' as const,
      id: item.snippet_id,
      label: `${item.section} · ${item.source_doc}`,
    })),
    ...caseResults.map(result => ({
      type: 'case' as const,
      id: result.caseId,
      label: `${result.caseId} · ${result.disposition}`,
    })),
  ];

  const sourceSummaries = [
    ...policyResults.map(({ item }) => `${item.snippet_id}: ${item.text}`),
    ...caseResults.map(result => `${result.caseId}: ${result.notes}`),
  ];

  const generated = await aiGateway.generateGroundedAnswer({
    question: input.question,
    claimId: input.claimId,
    rationale,
    citations,
    sourceSummaries,
  });
  const grounded = requireGrounding(generated.answer, citations);

  return {
    ...grounded,
    rationale,
    provider: generated.provider,
    model: generated.model,
    promptVersion: generated.promptVersion,
    retrievedPolicyIds: policyResults.map(result => result.item.snippet_id),
    retrievedCaseIds: caseResults.map(result => result.caseId),
  };
}
