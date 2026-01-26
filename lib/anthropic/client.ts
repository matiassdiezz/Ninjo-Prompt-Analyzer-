import Anthropic from '@anthropic-ai/sdk';
import type { AnthropicContent, AnthropicImageContent } from './types';
import type { ImageFeedback } from '@/types/feedback';
import type { TokenUsage } from '@/types/tokens';
import { calculateCost } from '@/types/tokens';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_RETRIES = 2;

export interface StreamResult {
  text: string;
  usage: TokenUsage | null;
}

export class AnthropicClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Constructs content array for multi-modal requests
   * Images should be placed first as per Anthropic best practices
   */
  buildContentArray(
    textContent: string,
    images: ImageFeedback[] = []
  ): AnthropicContent[] {
    const content: AnthropicContent[] = [];

    // Add images first
    for (const image of images) {
      if (image.base64) {
        const mediaType = this.getMediaTypeFromBase64(image.base64);
        const base64Data = this.extractBase64Data(image.base64);

        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        });
      }
    }

    // Add text content last
    content.push({
      type: 'text',
      text: textContent,
    });

    return content;
  }

  /**
   * Analyzes prompt with Claude
   */
  async analyzePrompt(
    systemPrompt: string,
    userPrompt: string,
    images: ImageFeedback[] = []
  ): Promise<string> {
    try {
      const content = this.buildContentArray(userPrompt, images);

      const message = await this.client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      // Extract text from response
      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      return textContent.text;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error('Anthropic API Error:', {
          status: error.status,
          message: error.message,
        });
        throw new Error(`Anthropic API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Analyzes prompt with retry logic for JSON parsing failures
   */
  async analyzePromptWithRetry(
    systemPrompt: string,
    retrySystemPrompt: string,
    userPrompt: string,
    images: ImageFeedback[] = [],
    parseFunction: (response: string) => unknown
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Use simplified prompt on retries
        const promptToUse = attempt === 0 ? systemPrompt : retrySystemPrompt;
        const userPromptToUse = attempt === 0
          ? userPrompt
          : `${userPrompt}\n\nIMPORTANTE: Responde SOLO con JSON válido, sin texto adicional.`;

        console.log(`Analysis attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

        const response = await this.analyzePrompt(promptToUse, userPromptToUse, images);

        // Try to parse the response
        const parsed = parseFunction(response);
        return parsed;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);

        // If it's an API error (not parsing), don't retry
        if (lastError.message.includes('Anthropic API Error')) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('All analysis attempts failed');
  }

  /**
   * Analyzes prompt with Claude using streaming
   * Returns an async generator that yields text chunks and final usage
   */
  async *analyzePromptStream(
    systemPrompt: string,
    userPrompt: string,
    images: ImageFeedback[] = []
  ): AsyncGenerator<{ type: 'chunk'; content: string } | { type: 'usage'; usage: TokenUsage }, void, unknown> {
    try {
      const content = this.buildContentArray(userPrompt, images);

      const stream = this.client.messages.stream({
        model: MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'chunk', content: event.delta.text };
        }

        // Capture usage from message_delta event
        if (event.type === 'message_delta' && event.usage) {
          const inputTokens = (event as { usage: { input_tokens?: number } }).usage.input_tokens || 0;
          const outputTokens = event.usage.output_tokens || 0;
          yield {
            type: 'usage',
            usage: {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              estimatedCost: calculateCost(inputTokens, outputTokens),
            },
          };
        }
      }

      // Get final message for complete usage data
      const finalMessage = await stream.finalMessage();
      if (finalMessage.usage) {
        yield {
          type: 'usage',
          usage: {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
            estimatedCost: calculateCost(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens),
          },
        };
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error('Anthropic API Error:', {
          status: error.status,
          message: error.message,
        });
        throw new Error(`Anthropic API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extracts media type from base64 data URL
   */
  private getMediaTypeFromBase64(
    base64String: string
  ): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
    if (base64String.startsWith('data:image/png')) return 'image/png';
    if (base64String.startsWith('data:image/jpeg')) return 'image/jpeg';
    if (base64String.startsWith('data:image/jpg')) return 'image/jpeg';
    if (base64String.startsWith('data:image/gif')) return 'image/gif';
    if (base64String.startsWith('data:image/webp')) return 'image/webp';

    // Default to PNG if unknown
    return 'image/png';
  }

  /**
   * Extracts base64 data from data URL
   */
  private extractBase64Data(base64String: string): string {
    const base64Match = base64String.match(/^data:image\/\w+;base64,(.+)$/);
    return base64Match ? base64Match[1] : base64String;
  }
}

/**
 * Strategy 1: Extract JSON from ```json...``` blocks
 */
function extractJsonBlock(response: string): string | null {
  const match = response.match(/```json\s*([\s\S]*?)\s*```/);
  return match ? match[1].trim() : null;
}

/**
 * Strategy 2: Extract JSON from generic ```...``` blocks
 */
function extractGenericBlock(response: string): string | null {
  const match = response.match(/```\s*([\s\S]*?)\s*```/);
  if (match) {
    const content = match[1].trim();
    // Verify it looks like JSON
    if (content.startsWith('{') || content.startsWith('[')) {
      return content;
    }
  }
  return null;
}

/**
 * Strategy 3: Extract raw JSON object from response
 */
function extractRawJson(response: string): string | null {
  // Find the first { and last }
  const startIdx = response.indexOf('{');
  const endIdx = response.lastIndexOf('}');

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return response.substring(startIdx, endIdx + 1);
  }
  return null;
}

/**
 * Strategy 4: Repair common JSON issues and extract
 */
function repairAndExtractJson(response: string): string | null {
  let json = extractJsonBlock(response) || extractGenericBlock(response) || extractRawJson(response);

  if (!json) return null;

  // Common repairs
  // 1. Remove trailing commas before } or ]
  json = json.replace(/,(\s*[}\]])/g, '$1');

  // 2. Replace single quotes with double quotes (careful with apostrophes in text)
  // Only do this if the JSON has obvious single-quote issues
  if (json.includes("': ") || json.includes("',") || json.includes("['")) {
    json = json
      .replace(/(\{|\[|,)\s*'([^']+)'\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'\s*(,|\}|\])/g, ':"$1"$2');
  }

  // 3. Remove control characters that break JSON
  json = json.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n') return '\\n';
    if (char === '\r') return '\\r';
    if (char === '\t') return '\\t';
    return '';
  });

  // 4. Fix unescaped quotes inside strings (basic attempt)
  // This is tricky and may not always work

  return json;
}

/**
 * Parses JSON from Claude's response using multiple strategies
 */
export function parseAnalysisResponse(response: string): unknown {
  const strategies = [
    { name: 'jsonBlock', fn: extractJsonBlock },
    { name: 'genericBlock', fn: extractGenericBlock },
    { name: 'rawJson', fn: extractRawJson },
    { name: 'repairAndExtract', fn: repairAndExtractJson },
  ];

  const errors: string[] = [];

  for (const strategy of strategies) {
    const extracted = strategy.fn(response);
    if (extracted) {
      try {
        const parsed = JSON.parse(extracted);
        console.log(`Successfully parsed JSON using strategy: ${strategy.name}`);
        return parsed;
      } catch (error) {
        errors.push(`${strategy.name}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
  }

  console.error('All JSON parsing strategies failed:', errors);
  console.error('Response preview:', response.substring(0, 500));
  throw new Error(`Failed to parse analysis response as JSON. Strategies tried: ${errors.join('; ')}`);
}

/**
 * Simplified system prompt for retry attempts
 */
export const RETRY_SYSTEM_PROMPT = `Eres un analizador de prompts. Tu respuesta DEBE ser JSON válido.

REGLAS ESTRICTAS:
1. Responde SOLO con el JSON, sin texto antes ni después
2. NO uses bloques de código markdown (\`\`\`)
3. Asegúrate de que el JSON sea válido (comillas dobles, sin trailing commas)
4. Si originalText contiene comillas o caracteres especiales, escápalos correctamente
5. El campo "category" en sections SOLO puede ser: mission, persona, flow, guardrails, engagement, examples, efficiency, hallucination

Formato requerido:
{
  "agentProfile": { "detectedMission": "...", "targetAudience": "...", "tone": "...", "strengths": [], "concerns": [] },
  "sections": [{ "category": "mission|persona|flow|guardrails|engagement|examples|efficiency|hallucination" }],
  "inconsistencies": [],
  "missingElements": [],
  "scores": { "clarity": 5, "consistency": 5, "completeness": 5, "engagement": 5, "safety": 5, "overall": 5 },
  "overallFeedback": "...",
  "topPriorities": []
}`;
