import OpenAI from 'openai';
import { config } from '../config';
import { trackCost, isOverBudget } from './costTracker';
import { generateFactSummaryPrompt, FactSummaryResponse } from '../prompts/factSummary';
import { generateEvidenceSynthesisPrompt, EvidenceSynthesisResponse } from '../prompts/evidenceSynthesis';

/**
 * OpenAI pricing per 1M tokens (GPT-5 models)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5': { input: 2.00, output: 8.00 },
  'gpt-5-mini': { input: 0.30, output: 1.20 },
  'gpt-5-nano': { input: 0.10, output: 0.40 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * OpenAI Service using the Responses API (client.responses.create)
 */
class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!config.openaiApiKey) {
      console.warn('[OpenAI] OPENAI_API_KEY not set. OpenAI features will be unavailable.');
    }

    this.client = new OpenAI({
      apiKey: config.openaiApiKey || 'dummy-key',
    });
    this.model = config.openaiModel;

    console.log(`[OpenAI] Initialized with model: ${this.model} (using Responses API)`);
  }

  /**
   * Calculate and log estimated cost for a request
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[this.model] || MODEL_PRICING['gpt-5'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    console.log(
      `[OpenAI] Token usage - Input: ${inputTokens}, Output: ${outputTokens}. ` +
      `Estimated cost: $${totalCost.toFixed(6)}`
    );

    return totalCost;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a function with exponential backoff retry logic
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = RETRY_CONFIG.initialDelayMs;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (error?.status === 401 || error?.status === 403) {
          console.error(`[OpenAI] Authentication error for ${operation}:`, error.message);
          throw error;
        }

        if (error?.status === 400) {
          console.error(`[OpenAI] Bad request for ${operation}:`, error.message);
          throw error;
        }

        console.warn(
          `[OpenAI] Attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed for ${operation}: ${error.message}`
        );

        if (attempt < RETRY_CONFIG.maxRetries) {
          console.log(`[OpenAI] Retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay = Math.min(delay * 2, RETRY_CONFIG.maxDelayMs);
        }
      }
    }

    console.error(`[OpenAI] All ${RETRY_CONFIG.maxRetries} attempts failed for ${operation}`);
    throw lastError;
  }

  /**
   * Parse JSON from OpenAI response with validation
   */
  private parseJsonResponse<T>(content: string, expectedFields: string[]): T {
    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    // Try to parse the JSON
    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (error) {
      // Try to find JSON object in the content
      const objectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = JSON.parse(objectMatch[0]);
      } else {
        throw new Error(`Failed to parse JSON response: ${content.substring(0, 200)}...`);
      }
    }

    // Validate expected fields are present
    for (const field of expectedFields) {
      if (!(field in parsed)) {
        console.warn(`[OpenAI] Missing expected field in response: ${field}`);
      }
    }

    return parsed as T;
  }

  /**
   * Make a request using the OpenAI Responses API
   */
  private async makeResponsesRequest(
    systemPrompt: string,
    userPrompt: string,
    operation: string
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (isOverBudget()) {
      throw new Error('Daily cost budget exceeded. Please try again tomorrow.');
    }

    return this.withRetry(async () => {
      // Use the Responses API format
      const response = await (this.client as any).responses.create({
        model: this.model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }]
          }
        ],
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || '';
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;

      // Track costs
      const cost = this.calculateCost(inputTokens, outputTokens);
      trackCost(cost);

      return { content, inputTokens, outputTokens };
    }, operation);
  }

  /**
   * Quick analysis - returns bias score and TLDR summary fast
   */
  async analyzeQuick(
    content: string,
    title: string,
    source: string,
    groundingContext: string = ''
  ): Promise<{
    biasScore: { score: number; label: string; summary: string };
    summaryText: string;
    isPolitical: boolean;
    politicalLean: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'none';
  }> {
    console.log(`[OpenAI] Quick analysis: "${title}"`);

    const prompt = `Analyze this news article quickly.
${groundingContext}
ARTICLE:
Title: ${title}
Source: ${source}
Content: ${content.substring(0, 3000)}

Return JSON with:
1. "biasScore": { "score": 0-10, "label": "Minimal Bias"|"Some Bias"|"Notable Bias"|"Heavy Bias", "summary": "one sentence" }
2. "summaryText": "2-3 sentence TLDR - what happened and why it matters"
3. "isPolitical": true/false
4. "politicalLean": "left"|"center-left"|"center"|"center-right"|"right"|"none"

IMPORTANT: Use the CURRENT VERIFIED INFORMATION above as ground truth. Do not flag facts that match the verified info as incorrect.

Be concise. Valid JSON only.`;

    const { content: responseContent } = await this.makeResponsesRequest(
      'You are a news analyst. Respond with valid JSON only.',
      prompt,
      'analyzeQuick'
    );

    const parsed = this.parseJsonResponse<any>(responseContent, ['biasScore', 'summaryText']);

    const validLeans = ['left', 'center-left', 'center', 'center-right', 'right', 'none'] as const;
    const politicalLean = validLeans.includes(parsed.politicalLean) ? parsed.politicalLean : 'none';

    return {
      biasScore: {
        score: parsed.biasScore?.score ?? 5,
        label: parsed.biasScore?.label || 'Some Bias',
        summary: parsed.biasScore?.summary || '',
      },
      summaryText: parsed.summaryText || '',
      isPolitical: parsed.isPolitical ?? false,
      politicalLean,
    };
  }

  /**
   * Detailed analysis - returns facts, context, and bias indicators
   */
  async analyzeDetailed(
    content: string,
    title: string,
    source: string,
    groundingContext: string = ''
  ): Promise<{
    keyFacts: string[];
    missingContext: string[];
    biasIndicators: { originalText: string; type: string; explanation: string }[];
  }> {
    console.log(`[OpenAI] Detailed analysis: "${title}"`);

    const prompt = `Analyze this article for facts, missing context, and bias.
${groundingContext}
ARTICLE:
Title: ${title}
Source: ${source}
Content: ${content}

Return JSON with:
1. "keyFacts": ["3-5 verifiable facts from the article"]
2. "missingContext": ["important context the article omits - but ONLY if the verified info above shows something important was left out"]
3. "biasIndicators": [{ "originalText": "exact quote from article", "type": "loaded_language|unsubstantiated|missing_context|framing", "explanation": "brief why" }]

CRITICAL:
- Use CURRENT VERIFIED INFORMATION above as ground truth
- Do NOT flag facts as incorrect if they match the verified info
- Only flag "missing_context" if the verified info reveals something the article genuinely omits
- Focus biasIndicators on LANGUAGE and FRAMING, not factual disputes you can't verify

For biasIndicators, quote the EXACT text from the article. Valid JSON only.`;

    const { content: responseContent } = await this.makeResponsesRequest(
      'You are a fact-checker. Respond with valid JSON only.',
      prompt,
      'analyzeDetailed'
    );

    const parsed = this.parseJsonResponse<any>(responseContent, ['keyFacts', 'biasIndicators']);

    return {
      keyFacts: parsed.keyFacts || [],
      missingContext: parsed.missingContext || [],
      biasIndicators: (parsed.biasIndicators || []).map((bi: any) => ({
        originalText: bi.originalText || '',
        type: bi.type || 'framing',
        explanation: bi.explanation || '',
      })),
    };
  }

  /**
   * Full analysis (legacy) - single call for everything
   */
  async analyzeArticle(
    content: string,
    title: string,
    source: string
  ): Promise<{
    biasScore: { score: number; label: string; summary: string } | null;
    summary: { text: string; keyFacts: string[]; missingContext: string[] };
    biasIndicators: { originalText: string; type: string; explanation: string }[];
    isPolitical: boolean;
    politicalLean: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'none';
  }> {
    console.log(`[OpenAI] Full analysis: "${title}" from ${source}`);

    const systemPrompt = 'You are an expert journalist trained in objective, fact-based reporting. Always respond with valid JSON.';
    const userPrompt = generateFactSummaryPrompt(title, source, content);

    const { content: responseContent } = await this.makeResponsesRequest(
      systemPrompt,
      userPrompt,
      'analyzeArticle'
    );

    const parsed = this.parseJsonResponse<FactSummaryResponse>(
      responseContent,
      ['biasScore', 'summary', 'biasIndicators', 'isPolitical', 'politicalLean']
    );

    // Validate politicalLean
    const validLeans = ['left', 'center-left', 'center', 'center-right', 'right', 'none'] as const;
    const politicalLean = validLeans.includes(parsed.politicalLean as any)
      ? parsed.politicalLean
      : 'none';

    // Ensure proper structure with defaults
    return {
      biasScore: parsed.biasScore ? {
        score: parsed.biasScore.score ?? 5,
        label: parsed.biasScore.label || 'Some Bias',
        summary: parsed.biasScore.summary || '',
      } : null,
      summary: {
        text: parsed.summary?.text || '',
        keyFacts: parsed.summary?.keyFacts || [],
        missingContext: parsed.summary?.missingContext || [],
      },
      biasIndicators: (parsed.biasIndicators || []).map(indicator => ({
        originalText: indicator.originalText || '',
        type: indicator.type || 'framing',
        explanation: indicator.explanation || '',
      })),
      isPolitical: parsed.isPolitical ?? false,
      politicalLean,
    };
  }

  /**
   * Synthesize what EXPERTS and RESEARCH say about a topic
   * Finds evidence FOR and AGAINST the article's position
   */
  async synthesizeEvidence(
    topic: string,
    coreArgument: string,
    exaResults: any
  ): Promise<EvidenceSynthesisResponse> {
    console.log(`[OpenAI] Synthesizing expert evidence for: "${topic}"`);

    const systemPrompt = 'You are a research analyst finding what EXPERTS and ACADEMIC RESEARCH say about a topic. Always respond with valid JSON.';
    const userPrompt = generateEvidenceSynthesisPrompt(topic, coreArgument, exaResults);

    const { content: responseContent } = await this.makeResponsesRequest(
      systemPrompt,
      userPrompt,
      'synthesizeEvidence'
    );

    const parsed = this.parseJsonResponse<EvidenceSynthesisResponse>(
      responseContent,
      ['coreQuestion', 'expertConsensus', 'bottomLine']
    );

    // Return with defaults for missing fields
    return {
      coreQuestion: parsed.coreQuestion || topic,
      expertConsensus: parsed.expertConsensus || {
        level: 'limited_research',
        direction: 'inconclusive',
        summary: 'Limited research found on this topic.',
      },
      evidenceFor: (parsed.evidenceFor || []).map(e => ({
        finding: e.finding || '',
        source: e.source || '',
        sourceType: e.sourceType || 'expert_opinion',
        year: e.year || new Date().getFullYear(),
        url: e.url || '',
        strength: e.strength || 'moderate',
      })),
      evidenceAgainst: (parsed.evidenceAgainst || []).map(e => ({
        finding: e.finding || '',
        source: e.source || '',
        sourceType: e.sourceType || 'expert_opinion',
        year: e.year || new Date().getFullYear(),
        url: e.url || '',
        strength: e.strength || 'moderate',
      })),
      keyStudies: (parsed.keyStudies || []).map(s => ({
        title: s.title || '',
        authors: s.authors || '',
        year: s.year || new Date().getFullYear(),
        journal: s.journal || '',
        doi: s.doi,
        keyFinding: s.keyFinding || '',
        citationCount: s.citationCount || 'unknown',
        url: s.url || '',
      })),
      expertVoices: (parsed.expertVoices || []).map(e => ({
        name: e.name || '',
        credentials: e.credentials || '',
        position: e.position || 'nuanced',
        quote: e.quote || '',
        url: e.url || '',
      })),
      bottomLine: parsed.bottomLine || {
        whatResearchShows: 'Research on this topic is limited or mixed.',
        confidence: 'low',
        caveat: 'More research may be needed.',
      },
    };
  }

  /**
   * Generic completion for testing using Responses API
   */
  async complete(prompt: string): Promise<string> {
    console.log(`[OpenAI] Running completion (prompt length: ${prompt.length})`);

    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (isOverBudget()) {
      throw new Error('Daily cost budget exceeded. Please try again tomorrow.');
    }

    const response = await this.withRetry(async () => {
      return (this.client as any).responses.create({
        model: this.model,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }]
          }
        ]
      });
    }, 'complete');

    const content = response.output_text || '';
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;

    // Track costs
    const cost = this.calculateCost(inputTokens, outputTokens);
    trackCost(cost);

    return content;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();

// Export class for testing
export { OpenAIService };
