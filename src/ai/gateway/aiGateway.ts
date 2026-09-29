import type { GroundingCitation } from '@/ai/copilot/grounding';
import type { InvestigationRationale } from '@/ai/copilot/rationale';
import { assembleMinimumNecessaryContext, type MinimumNecessaryAiContext } from './contextAssembly';

export type GroundedAiRequest = {
  claimId: string;
  question: string;
  signals: string[];
  triggeredRuleIds: string[];
  mappedPolicyIds: string[];
  ragPolicyIds: string[];
  citations: GroundingCitation[];
  sourceSummaries: string[];
  rationale: InvestigationRationale;
  groundingMode?: 'standard' | 'strict-retry';
};

export type GroundedAiResponse = {
  provider: string;
  model: string;
  promptVersion: string;
  answer: string;
  context: MinimumNecessaryAiContext;
};

export interface AiGateway {
  generateGroundedAnswer(request: GroundedAiRequest): Promise<GroundedAiResponse>;
}

export class MockAiGateway implements AiGateway {
  async generateGroundedAnswer(request: GroundedAiRequest): Promise<GroundedAiResponse> {
    // PII minimization is inside the gateway boundary so callers cannot bypass it.
    const context = assembleMinimumNecessaryContext(request);
    const sources = context.sourceSummaries.slice(0, request.groundingMode === 'strict-retry' ? 2 : 4);
    const groundingPrefix = request.groundingMode === 'strict-retry'
      ? 'Use only the cited retrieved sources. '
      : '';
    const answer = sources.length
      ? `${groundingPrefix}${sources.join(' ')} The applicable rules and retrieved sources are investigative guidance only; a human investigator must review the evidence before disposition.`
      : '';

    return {
      provider: 'mock',
      model: 'deterministic-grounded-demo',
      promptVersion: request.groundingMode === 'strict-retry'
        ? 'fraud-copilot-grounded-v3-strict-retry'
        : 'fraud-copilot-grounded-v3-gateway-pii',
      answer,
      context,
    };
  }
}

export const aiGateway: AiGateway = new MockAiGateway();
