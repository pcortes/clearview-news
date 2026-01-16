import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { openaiService } from '../services/openai';
import { getFactGrounding } from '../services/factGrounding';
import cache from '../services/cache';
import crypto from 'crypto';

const router = Router();

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
  content: z.string().min(100, 'Article content must be at least 100 characters'),
  title: z.string().min(1, 'Title is required'),
  source: z.string().min(1, 'Source is required'),
});

// Cache TTL: 1 hour
const CACHE_TTL = 3600;

function getCacheKey(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return `analyze:${hash}`;
}

// SSE streaming endpoint
router.post('/stream', async (req: Request, res: Response) => {
  // Validate request
  const validation = AnalyzeRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: 'Validation failed', details: validation.error.issues });
    return;
  }

  const { url, content, title, source } = validation.data;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Check cache
    const cacheKey = getCacheKey(url);
    const cached = await cache.get<any>(cacheKey);

    if (cached) {
      sendEvent('cached', { cached: true });
      if (cached.bias_score) {
        sendEvent('biasScore', cached.bias_score);
      }
      sendEvent('summary', { text: cached.summary.text });
      sendEvent('keyFacts', { facts: cached.summary.key_facts });
      sendEvent('missingContext', { items: cached.summary.missing_context });
      sendEvent('biasIndicators', { indicators: cached.bias_indicators });
      sendEvent('complete', {
        id: cached.id,
        is_political: cached.is_political,
        political_lean: cached.political_lean || 'none',
        cached: true
      });
      res.end();
      return;
    }

    const analysisId = crypto.randomUUID();
    sendEvent('status', { message: 'Verifying facts...' });

    // Get real-time fact grounding from Exa (parallel with nothing else yet)
    const groundingContext = await getFactGrounding(title, content);

    if (groundingContext) {
      console.log('[AnalyzeStream] Got fact grounding, injecting into prompts');
    }

    sendEvent('status', { message: 'Analyzing...' });

    // Run BOTH LLM calls in parallel, with grounding context
    const quickPromise = openaiService.analyzeQuick(content, title, source, groundingContext);
    const detailedPromise = openaiService.analyzeDetailed(content, title, source, groundingContext);

    // As each completes, send its results
    quickPromise.then(quickAnalysis => {
      sendEvent('biasScore', quickAnalysis.biasScore);
      sendEvent('summary', { text: quickAnalysis.summaryText });
    });

    // Wait for both to complete
    const [quickAnalysis, detailedAnalysis] = await Promise.all([quickPromise, detailedPromise]);

    // Send detailed results (quick already sent above)
    sendEvent('keyFacts', { facts: detailedAnalysis.keyFacts });
    sendEvent('missingContext', { items: detailedAnalysis.missingContext });
    sendEvent('biasIndicators', {
      indicators: detailedAnalysis.biasIndicators.map(bi => ({
        original_text: bi.originalText,
        type: bi.type,
        explanation: bi.explanation,
      })),
    });

    // Build complete response for caching
    const response = {
      id: analysisId,
      bias_score: quickAnalysis.biasScore,
      summary: {
        text: quickAnalysis.summaryText,
        key_facts: detailedAnalysis.keyFacts,
        missing_context: detailedAnalysis.missingContext,
      },
      bias_indicators: detailedAnalysis.biasIndicators.map(bi => ({
        original_text: bi.originalText,
        type: bi.type,
        explanation: bi.explanation,
      })),
      is_political: quickAnalysis.isPolitical,
      political_lean: quickAnalysis.politicalLean,
      cached: false,
    };

    // Cache it
    await cache.set(cacheKey, response, CACHE_TTL);

    // Send complete event
    sendEvent('complete', {
      id: analysisId,
      is_political: quickAnalysis.isPolitical,
      political_lean: quickAnalysis.politicalLean,
      cached: false
    });

  } catch (error) {
    console.error('[AnalyzeStream] Error:', error);
    sendEvent('error', { message: (error as Error).message });
  }

  res.end();
});

export default router;
