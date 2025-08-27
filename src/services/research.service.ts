import { v4 as uuidv4 } from 'uuid';
import { ResearchProvider, ResearchRequest, ResearchResponse, FileInput, ResearchComparison } from '../interfaces';
import { ChatGPTProvider } from '../api/chatgpt';
import { ClaudeProvider } from '../api/claude';
import { GeminiProvider } from '../api/gemini';
import { PerplexityProvider } from '../api/perplexity';

export class ResearchService {
  private providers: ResearchProvider[];
  private researchStore: Map<string, ResearchComparison> = new Map();

  constructor() {
    this.providers = this.initializeProviders();
  }

  private initializeProviders(): ResearchProvider[] {
    const providers: ResearchProvider[] = [];

    if (process.env.OPENAI_API_KEY) {
      providers.push(new ChatGPTProvider(process.env.OPENAI_API_KEY));
    }
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push(new ClaudeProvider(process.env.ANTHROPIC_API_KEY));
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      providers.push(new GeminiProvider(process.env.GOOGLE_AI_API_KEY));
    }
    if (process.env.PERPLEXITY_API_KEY) {
      providers.push(new PerplexityProvider(process.env.PERPLEXITY_API_KEY));
    }

    return providers;
  }

  async submitResearch(prompt: string, files?: FileInput[], modelSelections?: Record<string, string>, selectedProviders?: string[]): Promise<string> {
    const requestId = uuidv4();
    const request: ResearchRequest = {
      id: requestId,
      prompt,
      files,
      createdAt: new Date()
    };

    // Filter providers based on selection
    const providersToUse = selectedProviders 
      ? this.providers.filter(p => selectedProviders.includes(p.name))
      : this.providers;

    const responsePromises = providersToUse.map(provider => 
      provider.generateResponse(prompt, files, modelSelections?.[provider.name])
    );

    const responses = await Promise.all(responsePromises);

    const comparison: ResearchComparison = {
      requestId,
      responses
    };

    this.researchStore.set(requestId, comparison);
    return requestId;
  }

  getResearchComparison(requestId: string): ResearchComparison | undefined {
    return this.researchStore.get(requestId);
  }

  getAllComparisons(): ResearchComparison[] {
    return Array.from(this.researchStore.values());
  }

  evaluateResponses(requestId: string, criteria: string, scores: Record<string, number>): void {
    const comparison = this.researchStore.get(requestId);
    if (comparison) {
      if (!comparison.evaluations) {
        comparison.evaluations = [];
      }
      comparison.evaluations.push({ criteria, scores });
    }
  }

  setPreferredResponse(requestId: string, provider: string): void {
    const comparison = this.researchStore.get(requestId);
    if (comparison) {
      comparison.preferredResponse = provider;
    }
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  getProviderModels(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.providers.forEach(provider => {
      result[provider.name] = provider.getAvailableModels();
    });
    return result;
  }

  async testProvider(providerName: string, model?: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const provider = this.providers.find(p => p.name === providerName);
    
    if (!provider) {
      return {
        success: false,
        error: 'Provider not configured',
        message: `${providerName} API key not found in environment variables`
      };
    }

    try {
      const testPrompt = 'Say "Hello" in response to this test message.';
      const response = await provider.generateResponse(testPrompt, undefined, model);
      
      if (response.error) {
        return {
          success: false,
          error: 'API Error',
          message: response.error
        };
      }
      
      if (response.content && response.content.trim().length > 0) {
        return {
          success: true,
          message: `${providerName} API connection successful${model ? ` with model ${model}` : ''}`
        };
      } else {
        return {
          success: false,
          error: 'Empty Response',
          message: 'API responded but returned empty content'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Connection Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async analyzeResponses(comparison: ResearchComparison): Promise<any> {
    const responses = comparison.responses.filter(r => r.content && !r.error);
    
    if (responses.length < 2) {
      return {
        error: 'Need at least 2 successful responses to analyze',
        metrics: {},
        recommendation: 'Insufficient data for analysis'
      };
    }

    // Calculate basic metrics
    const metrics = this.calculateMetrics(responses);
    
    // Generate analysis using the first available provider
    const analysisProvider = this.providers[0];
    if (!analysisProvider) {
      return {
        error: 'No analysis provider available',
        metrics,
        recommendation: 'Unable to generate detailed analysis'
      };
    }

    const analysisPrompt = this.buildAnalysisPrompt(responses);
    
    try {
      const analysisResponse = await analysisProvider.generateResponse(analysisPrompt);
      
      return {
        metrics,
        analysis: analysisResponse.content,
        recommendation: this.generateRecommendation(responses, metrics),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        metrics,
        analysis: 'Failed to generate detailed analysis',
        recommendation: this.generateRecommendation(responses, metrics),
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }

  private calculateMetrics(responses: ResearchResponse[]): any {
    return {
      lengthComparison: responses.map(r => ({
        provider: r.provider,
        model: r.model,
        wordCount: r.content ? r.content.split(' ').length : 0,
        charCount: r.content ? r.content.length : 0
      })).sort((a, b) => b.wordCount - a.wordCount),
      
      structureAnalysis: responses.map(r => ({
        provider: r.provider,
        hasHeaders: r.content ? /#{1,6}\s/.test(r.content) : false,
        hasList: r.content ? /[\*\-\+]\s|^\d+\.\s/m.test(r.content) : false,
        hasCodeBlocks: r.content ? /```/.test(r.content) : false,
        hasLinks: r.content ? /\[.*?\]\(.*?\)/.test(r.content) : false
      })),
      
      responseTime: responses.map(r => ({
        provider: r.provider,
        timestamp: r.timestamp
      }))
    };
  }

  private buildAnalysisPrompt(responses: ResearchResponse[]): string {
    const responsesText = responses.map((r, i) => 
      `## Response ${i + 1}: ${r.provider} (${r.model || 'default model'})
${r.content}

---`
    ).join('\n\n');

    return `Please analyze these research responses and provide a detailed comparison. Focus on:

1. **Content Quality**: Which response is most comprehensive, accurate, and well-structured?
2. **Unique Insights**: What unique information or perspectives does each response provide?
3. **Strengths & Weaknesses**: Key strengths and weaknesses of each response
4. **Practical Value**: Which response would be most useful for decision-making?

**Responses to Analyze:**

${responsesText}

Please provide a structured analysis with clear sections for each comparison criteria.`;
  }

  private generateRecommendation(responses: ResearchResponse[], metrics: any): string {
    const longest = metrics.lengthComparison[0];
    const structured = metrics.structureAnalysis.find((r: any) => 
      r.hasHeaders && r.hasList && (r.hasCodeBlocks || r.hasLinks)
    );
    
    let recommendation = `Based on the analysis:\n\n`;
    
    if (structured) {
      recommendation += `🏆 **Recommended: ${structured.provider}**\n`;
      recommendation += `- Best structure with headers, lists, and rich formatting\n`;
      recommendation += `- Most comprehensive presentation\n\n`;
    } else {
      recommendation += `🏆 **Recommended: ${longest.provider}**\n`;
      recommendation += `- Most comprehensive content (${longest.wordCount} words)\n`;
      recommendation += `- Provides the most detailed information\n\n`;
    }

    recommendation += `**Quick Comparison:**\n`;
    responses.forEach(r => {
      const metrics_r = metrics.lengthComparison.find((m: any) => m.provider === r.provider);
      const struct = metrics.structureAnalysis.find((s: any) => s.provider === r.provider);
      recommendation += `• **${r.provider}**: ${metrics_r?.wordCount || 0} words, `;
      recommendation += struct?.hasHeaders ? 'well-structured' : 'basic formatting';
      recommendation += `\n`;
    });

    return recommendation;
  }
}