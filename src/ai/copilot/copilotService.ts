import scriptsData from '@/data/copilotScripts.json';
import { evaluateRules, getPolicyIdsForSignals } from '@/domain/rules/ruleEngine';
import { retrievePolicies } from '@/ai/retrieval/policyRetriever';
import { retrieveCurrentCaseKnowledge, retrieveSimilarClosedCases } from '@/ai/retrieval/caseRetriever';
import { aiGateway } from '@/ai/gateway/aiGateway';
import { assembleMinimumNecessaryContext } from '@/ai/gateway/contextAssembly';
import { buildInvestigationRationale, type InvestigationRationale } from './rationale';
import { requireGrounding, type GroundingCitation } from './grounding';
import { validateGeneratedCitations } from './outputCitationValidator';

export type RetrievalScope = 'current-case' | 'expanded-closed-cases';

export type CopilotAnswer = {
  answer: string;
  citations: GroundingCitation[];
  rationale: InvestigationRationale;
  provider: string;
  model: string;
  promptVersion: string;
  retrievedPolicyIds: string[];
  retrievedCaseIds: string[];
  retrievalScope: RetrievalScope;
  citationValidationPassed: boolean;
};

type Script = {
  match: string;
  answer: string;
  citations: GroundingCitation[];
};

const scripts = scriptsData as Record<string, Script[]>;

const asksForExpandedCaseSearch = (question: string, intent?: string) => {
  if (intent === 'similar closed cases') return true;
  const q = question.toLowerCase();
  return ['similar closed', 'closed case', 'prior adjudication', 'precedent', 'similar case'].some(term => q.includes(term));
};

export async function answerCopilotQuestion(input: {
  claimId: string;
  signals: string[];
  question: string;
  intent?: string;
  asOfDate?: string;
}): Promise<CopilotAnswer> {
  const rationale = buildInvestigationRationale(input.claimId, input.signals);
  const expandCaseScope = asksForExpandedCaseSearch(input.question, input.intent);
  const retrievalScope: RetrievalScope = expandCaseScope ? 'expanded-closed-cases' : 'current-case';
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
      retrievalScope,
      citationValidationPassed: grounded.citations.length > 0,
    };
  }

  const policyIds = getPolicyIdsForSignals(input.signals);
  const policyResults = retrievePolicies(input.question, {
    policyIds,
    asOfDate: input.asOfDate,
    limit: 4,
  });
  const currentCaseResults = retrieveCurrentCaseKnowledge(input.claimId);
  const expandedCaseResults = expandCaseScope ? retrieveSimilarClosedCases(input.claimId, input.signals, 3) : [];
  const caseResults = [...currentCaseResults, ...expandedCaseResults];

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
  const triggeredRuleIds = evaluateRules(input.signals).map(result => result.rule.rule_id);
  const context = assembleMinimumNecessaryContext({
    claimId: input.claimId,
    question: input.question,
    signals: input.signals,
    triggeredRuleIds,
    citations,
    sourceSummaries,
    rationale,
  });

  const generated = await aiGateway.generateGroundedAnswer({ context, citations });
  const validation = validateGeneratedCitations(
    generated.answer,
    citations,
    [...policyResults.map(result => result.item.snippet_id), ...caseResults.map(result => result.caseId)],
  );

  return {
    answer: validation.answer,
    citations: validation.citations,
    rationale,
    provider: generated.provider,
    model: generated.model,
    promptVersion: generated.promptVersion,
    retrievedPolicyIds: policyResults.map(result => result.item.snippet_id),
    retrievedCaseIds: caseResults.map(result => result.caseId),
    retrievalScope,
    citationValidationPassed: validation.passed,
  };
}
