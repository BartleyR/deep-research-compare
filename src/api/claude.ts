import Anthropic from '@anthropic-ai/sdk';
import { ResearchProvider, FileInput, ResearchResponse } from '../interfaces';
import { processFilesForProvider, formatFilesForPrompt, estimateTokens } from '../utils/file-processor';

export class ClaudeProvider implements ResearchProvider {
  name: 'Claude' = 'Claude';
  private client: Anthropic;
  private availableModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  getAvailableModels(): string[] {
    return this.availableModels;
  }

  async generateResponse(prompt: string, files?: FileInput[], model?: string): Promise<ResearchResponse> {
    try {
      let fullPrompt = prompt;
      
      if (files && files.length > 0) {
        // Claude has a much larger context window (200k tokens)
        const promptTokens = estimateTokens(prompt);
        const processed = await processFilesForProvider(files, this.name, promptTokens);
        
        if (processed.directFiles.length > 0 || processed.summaries.length > 0) {
          const fileContext = formatFilesForPrompt(processed);
          fullPrompt = `${prompt}\n\n${fileContext}`;
          
          // Log if files were summarized (should be rare for Claude)
          if (processed.summaries.length > 0) {
            console.log(`Claude: ${processed.summaries.length} file(s) were summarized (files were very large)`);
          }
        }
      }

      const selectedModel = model || this.availableModels[0];
      
      const message = await this.client.messages.create({
        model: selectedModel,
        max_tokens: 4000,
        temperature: 0.7,
        system: 'You are a deep research assistant. Provide comprehensive, detailed analysis.',
        messages: [{ role: 'user', content: fullPrompt }]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';

      return {
        provider: this.name,
        model: selectedModel,
        content,
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