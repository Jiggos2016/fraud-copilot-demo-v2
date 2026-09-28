import type { GroundingCitation } from '@/ai/copilot/grounding';
import type { MinimumNecessaryAiContext } from './contextAssembly';

export type GroundedAiRequest = {
  context: MinimumNecessaryAiContext;
  citations: GroundingCitation[];
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
    const sources = request.context.sourceSummaries.slice(0, 3);
    const answer = sources.length
      ? `${sources.join(' ')} The applicable rules and retrieved sources are investigative guidance only; a human investigator must review the evidence before disposition.`
      : '';

    return {
      provider: 'mock',
      model: 'deterministic-grounded-demo',
      promptVersion: 'fraud-copilot-grounded-v2-minimum-pii',
      answer,
    };
  }
}

export const aiGateway: AiGateway = new MockAiGateway();
