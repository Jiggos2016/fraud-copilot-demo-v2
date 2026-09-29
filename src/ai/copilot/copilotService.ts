import { evaluateRules, getPolicyIdsForSignals } from '@/domain/rules/ruleEngine';
import { getPolicySectionsByIds } from '@/domain/policy/policyService';
import { retrievePolicies } from '@/ai/retrieval/policyRetriever';
import { retrieveCurrentCaseKnowledge, retrieveSimilarClosedCases } from '@/ai/retrieval/caseRetriever';
import { aiGateway } from '@/ai/gateway/aiGateway';
import { buildInvestigationRationale, type InvestigationRationale } from './rationale';
import { type GroundingCitation } from './grounding';
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
  mappedPolicyIds: string[];
  ragPolicyIds: string[];
  retrievedCaseIds: string[];
  retrievalScope: RetrievalScope;
  citationValidationPassed: boolean;
  citationRetryCount: number;
};

const asksForExpandedCaseSearch = (question: string, intent?: string) => {
  if (intent === 'similar closed cases') return true;
  const q = question.toLowerCase();
  return ['similar closed', 'closed case', 'prior adjudication', 'precedent', 'similar case'].some(term => q.includes(term));
};

const caseSummary = (result: ReturnType<typeof retrieveCurrentCaseKnowledge>[number]) => {
  const attribution = result.featureAttributions?.length
    ? ` Contributing features: ${result.featureAttributions.map(item => `${item.feature} (${item.explanation})`).join('; ')}`
    : '';
  const priority = typeof result.priorityScore === 'number'
    ? ` Investigation-priority score ${result.priorityScore} (${result.priorityBand}) from ${result.modelVersion}.${attribution}`
    : '';
  return `${result.caseId}: ${result.notes}${priority}`;
};

export async function answerCopilotQuestion(input: {
  claimId: string;
  signals: string[];
  question: string;
  intent?: string;
  asOfDate?: string;
}): Promise<CopilotAnswer> {
  // The flow starts with the current case and investigator question, not with a rule hit.
  const rationale = buildInvestigationRationale(input.claimId, input.signals);
  const currentCaseResults = retrieveCurrentCaseKnowledge(input.claimId);
  const triggeredRules = evaluateRules(input.signals);
  const triggeredRuleIds = triggeredRules.map(result => result.rule.rule_id);

  // Exact rule -> policy lineage is loaded directly by mapped section ID. No ranking/search.
  const mappedPolicyIds = getPolicyIdsForSignals(input.signals);
  const mappedPolicySections = getPolicySectionsByIds(mappedPolicyIds, { asOfDate: input.asOfDate });

  // RAG is question-driven and searches for additional relevant policy independently of mappings.
  const ragPolicyResults = retrievePolicies(input.question, {
    asOfDate: input.asOfDate,
    limit: 4,
  }).filter(result => !mappedPolicyIds.includes(result.item.snippet_id));

  // Broader case/precedent retrieval is explicit and logged through retrievalScope.
  const expandCaseScope = asksForExpandedCaseSearch(input.question, input.intent);
  const retrievalScope: RetrievalScope = expandCaseScope ? 'expanded-closed-cases' : 'current-case';
  const expandedCaseResults = expandCaseScope ? retrieveSimilarClosedCases(input.claimId, input.signals, 3) : [];
  const caseResults = [...currentCaseResults, ...expandedCaseResults];

  const mappedPolicyCitations: GroundingCitation[] = mappedPolicySections.map(item => ({
    type: 'policy',
    id: item.snippet_id,
    label: `${item.section} · ${item.source_doc} · mapped`,
  }));
  const ragPolicyCitations: GroundingCitation[] = ragPolicyResults.map(({ item }) => ({
    type: 'policy',
    id: item.snippet_id,
    label: `${item.section} · ${item.source_doc} · question retrieval`,
  }));
  const caseCitations: GroundingCitation[] = caseResults.map(result => ({
    type: 'case',
    id: result.caseId,
    label: `${result.caseId} · ${result.scope === 'current-case' ? 'current case' : result.disposition}`,
  }));
  const citations = [...mappedPolicyCitations, ...ragPolicyCitations, ...caseCitations];

  const sourceSummaries = [
    ...currentCaseResults.map(result => `CURRENT CASE: ${caseSummary(result)}`),
    ...mappedPolicySections.map(item => `MAPPED POLICY ${item.snippet_id}: ${item.text}`),
    ...ragPolicyResults.map(({ item }) => `QUESTION-RETRIEVED POLICY ${item.snippet_id}: ${item.text}`),
    ...expandedCaseResults.map(result => `EXPANDED CASE ${result.caseId}: ${result.notes}`),
  ];

  const gatewayRequest = {
    claimId: input.claimId,
    question: input.question,
    signals: input.signals,
    triggeredRuleIds,
    mappedPolicyIds: mappedPolicySections.map(item => item.snippet_id),
    ragPolicyIds: ragPolicyResults.map(result => result.item.snippet_id),
    citations,
    sourceSummaries,
    rationale,
  };

  const retrievedSourceIds = [
    ...mappedPolicySections.map(item => item.snippet_id),
    ...ragPolicyResults.map(result => result.item.snippet_id),
    ...caseResults.map(result => result.caseId),
  ];

  let generated = await aiGateway.generateGroundedAnswer(gatewayRequest);
  let validation = validateGeneratedCitations(generated.answer, citations, retrievedSourceIds);
  let citationRetryCount = 0;

  // Fail closed: block the first failed response, retry exactly once with stricter grounding,
  // then return the canonical no-grounded-answer response if validation still fails.
  if (!validation.passed) {
    citationRetryCount = 1;
    generated = await aiGateway.generateGroundedAnswer({ ...gatewayRequest, groundingMode: 'strict-retry' });
    validation = validateGeneratedCitations(generated.answer, citations, retrievedSourceIds);
  }

  return {
    answer: validation.answer,
    citations: validation.citations,
    rationale,
    provider: generated.provider,
    model: generated.model,
    promptVersion: generated.promptVersion,
    retrievedPolicyIds: [...new Set([...mappedPolicySections.map(item => item.snippet_id), ...ragPolicyResults.map(result => result.item.snippet_id)])],
    mappedPolicyIds: mappedPolicySections.map(item => item.snippet_id),
    ragPolicyIds: ragPolicyResults.map(result => result.item.snippet_id),
    retrievedCaseIds: caseResults.map(result => result.caseId),
    retrievalScope,
    citationValidationPassed: validation.passed,
    citationRetryCount,
  };
}
