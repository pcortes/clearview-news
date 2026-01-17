/**
 * Evaluate Controller
 * Wave 7 - API endpoint for full article evaluation
 *
 * Reference: EXPERT_EVALUATION_SPEC.md
 *
 * Provides endpoints for:
 * - Full article evaluation through the complete pipeline
 * - Quick preview evaluation (no evidence search)
 * - Single claim evaluation
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import cache from '../services/cache';
import {
  runPipeline,
  runQuickPipeline,
  evaluateClaim,
  PipelineInput,
  PipelineOptions,
  PipelineResult,
} from '../services/pipeline';
import { Article, ClassifiedClaim } from '../types/claims';
import { OutputFormat } from '../types/output';

// Cache TTL: 30 minutes for evaluations
const CACHE_TTL = 30 * 60;

/**
 * Generate cache key from article content
 */
function getCacheKey(article: Article, options: Partial<PipelineOptions> = {}): string {
  const content = `${article.title}:${article.content.substring(0, 500)}:${JSON.stringify(options)}`;
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `evaluate:${hash}`;
}

/**
 * Validate article input
 */
function validateArticleInput(body: any): { valid: boolean; error?: string; article?: Article } {
  const { title, content, source, url, author } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { valid: false, error: 'Missing or invalid "title" field' };
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { valid: false, error: 'Missing or invalid "content" field' };
  }

  if (!source || typeof source !== 'string') {
    return { valid: false, error: 'Missing or invalid "source" field' };
  }

  const article: Article = {
    title: title.trim(),
    content: content.trim(),
    source: source.trim(),
    url: typeof url === 'string' ? url.trim() : undefined,
    author: typeof author === 'string' ? author.trim() : undefined,
  };

  return { valid: true, article };
}

/**
 * Validate pipeline options
 */
function validateOptions(body: any): PipelineOptions {
  const options: PipelineOptions = {};

  if (typeof body.maxClaims === 'number' && body.maxClaims > 0 && body.maxClaims <= 20) {
    options.maxClaims = body.maxClaims;
  }

  if (typeof body.maxSearchResults === 'number' && body.maxSearchResults > 0 && body.maxSearchResults <= 50) {
    options.maxSearchResults = body.maxSearchResults;
  }

  const validFormats: OutputFormat[] = ['html', 'markdown', 'json', 'text'];
  if (body.outputFormat && validFormats.includes(body.outputFormat)) {
    options.outputFormat = body.outputFormat;
  }

  if (typeof body.includeRawResults === 'boolean') {
    options.includeRawResults = body.includeRawResults;
  }

  if (typeof body.skipCache === 'boolean') {
    // skipCache is handled separately
  }

  return options;
}

/**
 * Format response for API output
 */
function formatResponse(result: PipelineResult, includeRaw: boolean = false): any {
  const response: any = {
    id: crypto.randomUUID(),

    // Article info
    article: {
      title: result.article.title,
      source: result.article.source,
      url: result.article.url,
    },

    // Summary
    summary: {
      totalClaims: result.summary.totalClaims,
      claimsEvaluated: result.summary.claimsEvaluated,
      claimsByType: result.summary.claimsByType,
      claimsByDomain: result.summary.claimsByDomain,
      consensusDistribution: result.summary.consensusLevelDistribution,
      averageConfidence: result.summary.averageConfidence,
      valuesQuestionsCount: result.summary.valuesQuestionsCount,
      hasActiveDebate: result.summary.hasActiveDabate,
    },

    // Article subjects (excluded from expert pool)
    articleSubjects: result.extractedClaims.articleSubjects,

    // Evaluated claims
    claims: result.evaluatedClaims.map((ec) => ({
      id: ec.claim.id,
      text: ec.claim.text,
      type: ec.claim.type,
      domain: ec.claim.domain,
      isVerifiable: ec.claim.isVerifiable,
      source: {
        name: ec.claim.source.name,
        role: ec.claim.source.role,
        isExcluded: ec.claim.source.isExcludedFromExpertPool,
        exclusionReason: ec.claim.source.exclusionReason,
      },
      consensus: {
        level: ec.consensus.level,
        confidence: ec.consensus.confidence,
        framing: ec.consensus.framingSentence,
      },
      evidence: {
        total: ec.evidence.length,
        supporting: ec.consensus.evidenceSummary.supporting,
        opposing: ec.consensus.evidenceSummary.opposing,
        supportRatio: ec.consensus.evidenceSummary.supportRatio,
      },
      experts: {
        validated: ec.experts.validCount,
        excluded: ec.experts.excludedCount,
        excludedReasons: ec.experts.excludedPersons.map((p) => ({
          name: p.name,
          reason: p.reason,
        })),
      },
      output: {
        format: ec.output.format,
        content: ec.output.content,
        header: ec.output.rendered.header,
      },
      honestyCheck: ec.honestyCheck,
    })),

    // Metadata
    metadata: {
      processedAt: result.metadata.completedAt.toISOString(),
      processingTimeMs: result.metadata.processingTimeMs,
      servicesUsed: result.metadata.servicesUsed,
      warnings: result.metadata.warnings.length > 0 ? result.metadata.warnings : undefined,
      errors: result.metadata.errors.length > 0 ? result.metadata.errors : undefined,
    },
  };

  // Include raw results if requested
  if (includeRaw && result.rawResults) {
    response.raw = result.rawResults;
  }

  return response;
}

/**
 * POST /api/v1/evaluate
 *
 * Full article evaluation through the complete pipeline
 *
 * Request body:
 * - title: string (required)
 * - content: string (required)
 * - source: string (required)
 * - url: string (optional)
 * - author: string (optional)
 * - maxClaims: number (optional, default 5, max 20)
 * - maxSearchResults: number (optional, default 10, max 50)
 * - outputFormat: 'html' | 'markdown' | 'json' | 'text' (optional, default 'markdown')
 * - includeRawResults: boolean (optional, default false)
 * - skipCache: boolean (optional, default false)
 */
export async function evaluateArticle(req: Request, res: Response): Promise<void> {
  console.log('[Evaluate] Full evaluation request received');

  // Validate article input
  const validation = validateArticleInput(req.body);
  if (!validation.valid || !validation.article) {
    res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
    });
    return;
  }

  const article = validation.article;
  const options = validateOptions(req.body);
  const skipCache = req.body.skipCache === true;

  try {
    // Check cache first (unless skipCache)
    const cacheKey = getCacheKey(article, options);
    if (!skipCache) {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        console.log(`[Evaluate] Cache hit for article: "${article.title}"`);
        res.json({ ...cached, cached: true });
        return;
      }
    }

    console.log(`[Evaluate] Running full pipeline for: "${article.title}"`);

    // Run the pipeline
    const input: PipelineInput = { article, options };
    const result = await runPipeline(input);

    // Format response
    const response = formatResponse(result, options.includeRawResults);
    response.cached = false;

    // Cache the result (unless there were errors)
    if (result.metadata.errors.length === 0) {
      await cache.set(cacheKey, response, CACHE_TTL);
    }

    res.json(response);
  } catch (error) {
    console.error('[Evaluate] Pipeline error:', (error as Error).message);

    // Determine appropriate status code
    let statusCode = 500;
    let userMessage = 'Evaluation failed';

    const errorMessage = (error as Error).message;
    if (errorMessage.includes('budget') || errorMessage.includes('cost')) {
      statusCode = 429;
      userMessage = 'Service temporarily paused due to usage limits';
    } else if (errorMessage.includes('API_KEY')) {
      statusCode = 503;
      userMessage = 'Required service not configured';
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
 * POST /api/v1/evaluate/quick
 *
 * Quick evaluation without evidence search
 * Faster but less thorough - good for previews
 *
 * Same request body as /evaluate
 */
export async function evaluateArticleQuick(req: Request, res: Response): Promise<void> {
  console.log('[Evaluate] Quick evaluation request received');

  // Validate article input
  const validation = validateArticleInput(req.body);
  if (!validation.valid || !validation.article) {
    res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
    });
    return;
  }

  const article = validation.article;
  const options = validateOptions(req.body);

  try {
    console.log(`[Evaluate] Running quick pipeline for: "${article.title}"`);

    // Run the quick pipeline (skips evidence search)
    const input: PipelineInput = { article, options };
    const result = await runQuickPipeline(input);

    // Format response
    const response = formatResponse(result, options.includeRawResults);
    response.cached = false;
    response.isQuickEvaluation = true;

    res.json(response);
  } catch (error) {
    console.error('[Evaluate] Quick pipeline error:', (error as Error).message);
    res.status(500).json({
      error: 'Quick evaluation failed',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
}

/**
 * POST /api/v1/evaluate/claim
 *
 * Evaluate a single claim independently
 *
 * Request body:
 * - claim: ClassifiedClaim (required)
 * - articleSubjects: string[] (optional)
 * - outputFormat: 'html' | 'markdown' | 'json' | 'text' (optional)
 */
export async function evaluateSingleClaim(req: Request, res: Response): Promise<void> {
  console.log('[Evaluate] Single claim evaluation request received');

  const { claim, articleSubjects = [] } = req.body;

  // Validate claim input
  if (!claim || typeof claim !== 'object') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid "claim" field',
    });
    return;
  }

  if (!claim.text || typeof claim.text !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Claim must have a "text" field',
    });
    return;
  }

  // Ensure claim has required fields
  const fullClaim: ClassifiedClaim = {
    id: claim.id || `claim_${crypto.randomUUID().substring(0, 8)}`,
    text: claim.text,
    type: claim.type || 'empirical',
    isVerifiable: claim.isVerifiable ?? true,
    verifiabilityReason: claim.verifiabilityReason || 'Claim type allows verification',
    source: claim.source || {
      name: 'Unknown',
      role: 'unknown',
      isExcludedFromExpertPool: false,
    },
    domain: claim.domain || 'general',
    subDomain: claim.subDomain,
  };

  const options = validateOptions(req.body);

  try {
    console.log(`[Evaluate] Evaluating single claim: "${fullClaim.text.substring(0, 50)}..."`);

    const result = await evaluateClaim(fullClaim, articleSubjects, options);

    res.json({
      claim: {
        id: result.claim.id,
        text: result.claim.text,
        type: result.claim.type,
        domain: result.claim.domain,
      },
      consensus: {
        level: result.consensus.level,
        confidence: result.consensus.confidence,
        framing: result.consensus.framingSentence,
        detailedExplanation: result.consensus.detailedExplanation,
      },
      evidence: {
        total: result.evidence.length,
        supporting: result.consensus.evidenceSummary.supporting,
        opposing: result.consensus.evidenceSummary.opposing,
        topSources: result.evidence.slice(0, 3).map((e) => ({
          title: e.citation.title,
          url: e.citation.url,
          tier: e.tier,
          direction: e.direction,
        })),
      },
      output: {
        format: result.output.format,
        content: result.output.content,
      },
      honestyCheck: result.honestyCheck,
    });
  } catch (error) {
    console.error('[Evaluate] Single claim error:', (error as Error).message);
    res.status(500).json({
      error: 'Claim evaluation failed',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
}

/**
 * GET /api/v1/evaluate/health
 *
 * Health check for the evaluation service
 */
export async function evaluateHealth(_req: Request, res: Response): Promise<void> {
  res.json({
    status: 'ok',
    service: 'evaluate',
    timestamp: new Date().toISOString(),
    capabilities: {
      fullEvaluation: true,
      quickEvaluation: true,
      singleClaimEvaluation: true,
    },
  });
}
