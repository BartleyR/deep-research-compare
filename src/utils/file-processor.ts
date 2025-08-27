import { FileInput } from '../interfaces';

export interface ProcessedFiles {
  directFiles: FileInput[];  // Small files that can be included directly
  summaries: string[];       // Summaries of large files
  totalSize: number;         // Total character count
}

// Approximate token limits for each provider (conservative estimates)
export const PROVIDER_CONTEXT_LIMITS = {
  'Claude': 150000,      // Claude 3 has 200k context, being conservative
  'ChatGPT': 8000,       // GPT-4 has 8k-32k depending on model
  'Perplexity': 4000,    // Perplexity has smaller context
  'Gemini': 30000        // Gemini Pro has 32k context
};

export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

export async function processFilesForProvider(
  files: FileInput[] | undefined,
  providerName: string,
  promptTokens: number = 500
): Promise<ProcessedFiles> {
  if (!files || files.length === 0) {
    return { directFiles: [], summaries: [], totalSize: 0 };
  }

  const maxTokens = PROVIDER_CONTEXT_LIMITS[providerName as keyof typeof PROVIDER_CONTEXT_LIMITS] || 4000;
  const availableTokensForFiles = maxTokens - promptTokens - 1000; // Reserve tokens for response
  const maxCharsForFiles = availableTokensForFiles * 4;

  let totalSize = 0;
  const directFiles: FileInput[] = [];
  const summaries: string[] = [];

  // Sort files by size to prioritize smaller files for direct inclusion
  const sortedFiles = [...files].sort((a, b) => a.content.length - b.content.length);

  for (const file of sortedFiles) {
    const fileSize = file.content.length;
    
    if (totalSize + fileSize <= maxCharsForFiles) {
      // File fits within limits, include directly
      directFiles.push(file);
      totalSize += fileSize;
    } else {
      // File is too large or would exceed limits
      // For now, we'll create a brief description
      const lines = file.content.split('\n');
      const preview = lines.slice(0, 20).join('\n');
      const summary = `[Large file: ${file.name}]
Size: ${fileSize} characters (~${estimateTokens(file.content.toString())} tokens)
Lines: ${lines.length}
Preview of first 20 lines:
${preview}
[... rest of file omitted due to size constraints ...]`;
      
      summaries.push(summary);
    }
  }

  return { directFiles, summaries, totalSize };
}

export function formatFilesForPrompt(processed: ProcessedFiles): string {
  const parts: string[] = [];
  
  // Add direct files
  if (processed.directFiles.length > 0) {
    const fileTexts = processed.directFiles.map(f => 
      `File: ${f.name}\n\n${f.content}`
    );
    parts.push('Context files:\n\n' + fileTexts.join('\n\n---\n\n'));
  }
  
  // Add summaries
  if (processed.summaries.length > 0) {
    parts.push('Large file summaries:\n\n' + processed.summaries.join('\n\n'));
  }
  
  return parts.join('\n\n===\n\n');
}

// For providers with large context windows, we can try to fit more
export function shouldUseLargeContext(providerName: string): boolean {
  return providerName === 'Claude' || providerName === 'Gemini';
}