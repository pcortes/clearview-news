import { Request, Response } from 'express';
import { openaiService } from '../services/openai';
import cache from '../services/cache';
import crypto from 'crypto';

// Cache TTL: 1 hour
const CACHE_TTL = 3600;

// Generate cache key from URL
function getCacheKey(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return `analyze:${hash}`;
}

// Default/fallback values for partial failures
const DEFAULT_ANALYSIS = {
  summary: {
    text: '',
    keyFacts: [] as string[],
    missingContext: [] as string[],
  },
  biasIndicators: [] as { originalText: string; type: string; explanation: string }[],
  isPolitical: false,
};

export async function analyzeArticle(req: Request, res: Response): Promise<void> {
  const { url, content, title, source } = req.body;
  const warnings: string[] = [];

  try {
    // Check cache first
    const cacheKey = getCacheKey(url);
    const cached = await cache.get<any>(cacheKey);

    if (cached) {
      console.log(`[Analyze] Cache hit for ${url}`);
      res.json({ ...cached, cached: true });
      return;
    }

    console.log(`[Analyze] Analyzing article: "${title}" from ${source}`);

    // Call OpenAI to analyze the article with graceful degradation
    let analysis = { ...DEFAULT_ANALYSIS };

    try {
      analysis = await openaiService.analyzeArticle(content, title, source);
    } catch (analysisError) {
      const errorMessage = (analysisError as Error).message;
      console.error('[Analyze] OpenAI analysis failed:', errorMessage);

      // Check if it's a budget error - rethrow so user knows
      if (errorMessage.includes('budget') || errorMessage.includes('cost')) {
        throw analysisError;
      }

      // For other errors, try to provide partial results
      warnings.push('Full analysis unavailable - showing partial results');

      // Try to extract basic summary from content if OpenAI fails
      try {
        const basicSummary = extractBasicSummary(content, title);
        analysis.summary.text = basicSummary.text;
        analysis.summary.keyFacts = basicSummary.keyFacts;
      } catch (summaryError) {
        console.error('[Analyze] Basic summary extraction failed:', (summaryError as Error).message);
        analysis.summary.text = 'Unable to generate summary at this time.';
        warnings.push('Summary generation failed');
      }
    }

    // Validate and sanitize response data
    const response = {
      id: crypto.randomUUID(),
      summary: {
        text: analysis.summary?.text || 'Summary unavailable',
        key_facts: Array.isArray(analysis.summary?.keyFacts) ? analysis.summary.keyFacts : [],
        missing_context: Array.isArray(analysis.summary?.missingContext) ? analysis.summary.missingContext : [],
      },
      bias_indicators: Array.isArray(analysis.biasIndicators)
        ? analysis.biasIndicators.map(bi => ({
            original_text: bi.originalText || '',
            type: bi.type || 'unknown',
            explanation: bi.explanation || '',
          }))
        : [],
      is_political: Boolean(analysis.isPolitical),
      cached: false,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    // Only cache if no warnings (full successful analysis)
    if (warnings.length === 0) {
      await cache.set(cacheKey, response, CACHE_TTL);
    }

    res.json(response);
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error('[Analyze] Error:', errorMessage);

    // Determine appropriate status code based on error type
    let statusCode = 500;
    let userMessage = 'Analysis failed';

    if (errorMessage.includes('budget') || errorMessage.includes('cost')) {
      statusCode = 429;
      userMessage = 'Service temporarily paused due to usage limits';
    } else if (errorMessage.includes('OPENAI_API_KEY')) {
      statusCode = 503;
      userMessage = 'AI service not configured';
    } else if (errorMessage.includes('rate') || errorMessage.includes('429')) {
      statusCode = 503;
      userMessage = 'Service temporarily unavailable - please try again';
    }

    res.status(statusCode).json({
      error: userMessage,
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
}

/**
 * Extract a basic summary from content when AI analysis fails
 * This provides graceful degradation
 */
function extractBasicSummary(content: string, title: string): { text: string; keyFacts: string[] } {
  // Simple extraction: use first few sentences as summary
  const sentences = content
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 20)
    .slice(0, 3)
    .map(s => s.trim());

  const summaryText = sentences.length > 0
    ? sentences.join('. ') + '.'
    : `Article: ${title}`;

  // Extract potential key facts (sentences with numbers or quotes)
  const keyFacts = content
    .split(/[.!?]+/)
    .filter(s => /\d+/.test(s) || /"[^"]+"|'[^']+'/.test(s))
    .slice(0, 3)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200);

  return {
    text: summaryText,
    keyFacts: keyFacts.length > 0 ? keyFacts : ['Key facts unavailable'],
  };
}
