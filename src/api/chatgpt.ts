import OpenAI from 'openai';
import { ResearchProvider, FileInput, ResearchResponse } from '../interfaces';

export class ChatGPTProvider implements ResearchProvider {
  name: 'ChatGPT' = 'ChatGPT';
  private client: OpenAI;
  private availableModels = [
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-4-32k',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k'
  ];

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  getAvailableModels(): string[] {
    return this.availableModels;
  }

  async generateResponse(prompt: string, files?: FileInput[], model?: string): Promise<ResearchResponse> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'You are a deep research assistant. Provide comprehensive, detailed analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      if (files && files.length > 0) {
        const fileContext = files.map(f => `File: ${f.name}\n\n${f.content}`).join('\n\n---\n\n');
        messages.push({
          role: 'user',
          content: `Context files:\n\n${fileContext}`
        });
      }

      const selectedModel = model || this.availableModels[0];
      
      const completion = await this.client.chat.completions.create({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });

      return {
        provider: this.name,
        model: selectedModel,
        content: completion.choices[0].message.content || '',
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