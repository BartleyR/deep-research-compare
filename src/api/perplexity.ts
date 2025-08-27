import axios from 'axios';
import { ResearchProvider, FileInput, ResearchResponse } from '../interfaces';
import { processFilesForProvider, formatFilesForPrompt, estimateTokens } from '../utils/file-processor';

export class PerplexityProvider implements ResearchProvider {
  name: 'Perplexity' = 'Perplexity';
  private apiKey: string;
  private availableModels = [
    'sonar-pro',
    'sonar',
    'sonar-deep-research',
    'sonar-reasoning-pro',
    'sonar-reasoning',
    'r1-1776'
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getAvailableModels(): string[] {
    return this.availableModels;
  }

  async generateResponse(prompt: string, files?: FileInput[], model?: string): Promise<ResearchResponse> {
    try {
      let fullPrompt = prompt;
      
      if (files && files.length > 0) {
        // Process files intelligently based on size constraints
        const promptTokens = estimateTokens(prompt);
        const processed = await processFilesForProvider(files, this.name, promptTokens);
        
        if (processed.directFiles.length > 0 || processed.summaries.length > 0) {
          const fileContext = formatFilesForPrompt(processed);
          fullPrompt = `${prompt}\n\n${fileContext}`;
          
          // Log if files were omitted or summarized
          if (processed.summaries.length > 0) {
            console.log(`Perplexity: ${processed.summaries.length} file(s) were summarized due to size constraints`);
          }
        }
      }

      const selectedModel = model || this.availableModels[0];
      
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: 'You are a deep research assistant. Provide comprehensive, detailed analysis with citations when possible.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return {
        provider: this.name,
        model: selectedModel,
        content: response.data.choices[0].message.content,
        timestamp: new Date()
      };
    } catch (error) {
      let errorMessage = 'Unknown error';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = `Authentication failed: Invalid API key. Please check your PERPLEXITY_API_KEY in the .env file.`;
        } else if (error.response?.status === 429) {
          errorMessage = `Rate limit exceeded. Please try again later.`;
        } else if (error.response?.status === 400) {
          const errorDetail = error.response.data?.error?.message || 'Invalid request parameters';
          if (errorDetail.toLowerCase().includes('length') || errorDetail.toLowerCase().includes('token')) {
            errorMessage = `Content too long: Files were processed but still exceed limits. Try with smaller files or fewer files.`;
          } else {
            errorMessage = `Bad request: ${errorDetail}`;
          }
        } else if (error.response) {
          errorMessage = `API Error (${error.response.status}): ${error.response.data?.error?.message || error.response.statusText}`;
        } else if (error.request) {
          errorMessage = `Network error: Unable to reach Perplexity API`;
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        provider: this.name,
        content: '',
        timestamp: new Date(),
        error: errorMessage
      };
    }
  }
}