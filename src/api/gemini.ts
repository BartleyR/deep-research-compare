import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchProvider, FileInput, ResearchResponse } from '../interfaces';

export class GeminiProvider implements ResearchProvider {
  name: 'Gemini' = 'Gemini';
  private client: GoogleGenerativeAI;
  private availableModels = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ];

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  getAvailableModels(): string[] {
    return this.availableModels;
  }

  async generateResponse(prompt: string, files?: FileInput[], modelName?: string): Promise<ResearchResponse> {
    try {
      const selectedModel = modelName || this.availableModels[0];
      const model = this.client.getGenerativeModel({ model: selectedModel });
      
      let fullPrompt = `You are a deep research assistant. Provide comprehensive, detailed analysis.\n\n${prompt}`;
      
      if (files && files.length > 0) {
        const fileContext = files.map(f => `File: ${f.name}\n\n${f.content}`).join('\n\n---\n\n');
        fullPrompt = `${fullPrompt}\n\nContext files:\n\n${fileContext}`;
      }

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;

      return {
        provider: this.name,
        model: selectedModel,
        content: response.text(),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        provider: this.name,
        content: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}