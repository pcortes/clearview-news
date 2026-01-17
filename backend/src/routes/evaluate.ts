/**
 * Evaluate Routes
 * Wave 7 - Route definitions for full pipeline evaluation
 *
 * Reference: EXPERT_EVALUATION_SPEC.md
 */

import { Router } from 'express';
import {
  evaluateArticle,
  evaluateArticleQuick,
  evaluateSingleClaim,
  evaluateHealth,
} from '../controllers/evaluateController';

const router = Router();

/**
 * GET /api/v1/evaluate/health
 * Health check for the evaluation service
 */
router.get('/health', evaluateHealth);

/**
 * POST /api/v1/evaluate
 * Full article evaluation through the complete pipeline
 *
 * Request body:
 * - title: string (required)
 * - content: string (required)
 * - source: string (required)
 * - url?: string
 * - author?: string
 * - maxClaims?: number (1-20, default 5)
 * - maxSearchResults?: number (1-50, default 10)
 * - outputFormat?: 'html' | 'markdown' | 'json' | 'text'
 * - includeRawResults?: boolean
 * - skipCache?: boolean
 *
 * Response:
 * - id: string
 * - article: { title, source, url }
 * - summary: { totalClaims, claimsEvaluated, ... }
 * - articleSubjects: string[]
 * - claims: EvaluatedClaim[]
 * - metadata: { processedAt, processingTimeMs, ... }
 */
router.post('/', evaluateArticle);

/**
 * POST /api/v1/evaluate/quick
 * Quick evaluation without evidence search (faster but less thorough)
 *
 * Same request/response format as POST /evaluate
 * Response includes isQuickEvaluation: true
 */
router.post('/quick', evaluateArticleQuick);

/**
 * POST /api/v1/evaluate/claim
 * Evaluate a single claim independently
 *
 * Request body:
 * - claim: ClassifiedClaim (required)
 *   - text: string (required)
 *   - type?: ClaimType (default 'empirical')
 *   - domain?: Domain (default 'general')
 *   - source?: ClaimSource
 * - articleSubjects?: string[]
 * - outputFormat?: 'html' | 'markdown' | 'json' | 'text'
 *
 * Response:
 * - claim: { id, text, type, domain }
 * - consensus: { level, confidence, framing, detailedExplanation }
 * - evidence: { total, supporting, opposing, topSources }
 * - output: { format, content }
 * - honestyCheck: { isHonest, violations, warnings }
 */
router.post('/claim', evaluateSingleClaim);

export default router;
