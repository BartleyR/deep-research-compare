export interface ResearchProvider {
  name: 'ChatGPT' | 'Claude' | 'Perplexity' | 'Gemini';
  generateResponse(prompt: string, files?: FileInput[], model?: string): Promise<ResearchResponse>;
  getAvailableModels(): string[];
}

export interface FileInput {
  name: string;
  content: string;
  mimeType: string;
}

export interface ResearchResponse {
  provider: string;
  model?: string;
  content: string;
  timestamp: Date;
  error?: string;
}

export interface ResearchRequest {
  id: string;
  prompt: string;
  files?: FileInput[];
  evaluationInstructions?: string;
  createdAt: Date;
}

export interface ResearchComparison {
  requestId: string;
  responses: ResearchResponse[];
  evaluationInstructions?: string;
  evaluations?: {
    criteria: string;
    scores: Record<string, number>;
  }[];
  preferredResponse?: string;
}