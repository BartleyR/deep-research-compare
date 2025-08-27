import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchProvider, FileInput, ResearchResponse } from '../interfaces';
import { processFilesForProvider, formatFilesForPrompt, estimateTokens } from '../utils/file-processor';

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
        // Gemini has a good context window (32k+ tokens)
        const promptTokens = estimateTokens(fullPrompt);
        const processed = await processFilesForProvider(files, this.name, promptTokens);
        
        if (processed.directFiles.length > 0 || processed.summaries.length > 0) {
          const fileContext = formatFilesForPrompt(processed);
          fullPrompt = `${fullPrompt}\n\n${fileContext}`;
          
          // Log if files were summarized
          if (processed.summaries.length > 0) {
            console.log(`Gemini: ${processed.summaries.length} file(s) were summarized due to size constraints`);
          }
        }
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