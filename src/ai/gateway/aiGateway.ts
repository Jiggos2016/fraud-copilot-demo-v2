import type { GroundingCitation } from '@/ai/copilot/grounding';
import type { InvestigationRationale } from '@/ai/copilot/rationale';

export type GroundedAiRequest = {
  question: string;
  claimId: string;
  rationale: InvestigationRationale;
  citations: GroundingCitation[];
  sourceSummaries: string[];
};

export type GroundedAiResponse = {
  provider: string;
  model: string;
  promptVersion: string;
  answer: string;
};

export interface AiGateway {
  generateGroundedAnswer(request: GroundedAiRequest): Promise<GroundedAiResponse>;
}

export class MockAiGateway implements AiGateway {
  async generateGroundedAnswer(request: GroundedAiRequest): Promise<GroundedAiResponse> {
    const sources = request.sourceSummaries.slice(0, 3);
    const answer = sources.length
      ? `${sources.join(' ')} The applicable rules and retrieved sources are investigative guidance only; a human investigator must review the evidence before disposition.`
      : '';

    return {
      provider: 'mock',
      model: 'deterministic-grounded-demo',
      promptVersion: 'fraud-copilot-grounded-v1',
      answer,
    };
  }
}

export const aiGateway: AiGateway = new MockAiGateway();
