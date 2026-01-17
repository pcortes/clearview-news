/**
 * Pipeline Service
 * Wave 7 - Full pipeline integration
 *
 * Reference: EXPERT_EVALUATION_SPEC.md
 *
 * This service orchestrates the complete article evaluation flow:
 * Article → Claims → Domain → Evidence → Experts → Consensus → Output
 *
 * Integrates:
 * - Wave 1: Claim extraction and classification
 * - Wave 2: Domain routing and search query building
 * - Wave 3: Evidence tier classification
 * - Wave 4: Expert validation
 * - Wave 5: Consensus detection
 * - Wave 6: Honest output generation
 */

import { Article, ClassifiedClaim, Domain, ExtractedClaims } from '../types/claims';
import { ConsensusAssessment, ConsensusAssessmentInput, DirectedEvidence, Citation, EvidenceDirection } from '../types/consensus';
import { PersonMention, ValidatedExpert, BatchValidationResult } from '../types/expert';
import { GeneratedOutput, OutputFormat, RenderedClaimOutput } from '../types/output';

// Import services from Waves 1-6
import { extractClaims } from './claimExtractor';
import { buildSearchQueries, getDomainConfig, getDomainCaveats } from './domainRouter';
import { classifyEvidenceTier, EvidenceTier, EvidenceClassification, EvidenceCategory } from './evidenceTier';
import { validateExperts, shouldExcludeFromExpertPool } from './expertValidator';
import { assessConsensus, getSimplifiedResult } from './consensusDetector';
import { generateOutput, renderClaimOutput, performHonestyCheck } from './outputGenerator';

// External services
import { searchAcademic, isConfigured as isExaConfigured } from './exa';
import { openaiService } from './openai';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Pipeline input - article to evaluate
 */
export interface PipelineInput {
  article: Article;
  options?: PipelineOptions;
}

/**
 * Pipeline options
 */
export interface PipelineOptions {
  /** Maximum claims to evaluate (for cost control) */
  maxClaims?: number;
  /** Maximum search results per claim */
  maxSearchResults?: number;
  /** Output format */
  outputFormat?: OutputFormat;
  /** Skip evidence search (use for testing or quick preview) */
  skipEvidenceSearch?: boolean;
  /** Include raw intermediate results in output */
  includeRawResults?: boolean;
  /** Evaluate claims in parallel (faster but uses more API quota) */
  parallelEvaluation?: boolean;
  /** Max concurrent claim evaluations (if parallel) */
  maxConcurrency?: number;
}

/**
 * Default pipeline options
 */
export const DEFAULT_PIPELINE_OPTIONS: Required<PipelineOptions> = {
  maxClaims: 5,
  maxSearchResults: 10,
  outputFormat: 'markdown',
  skipEvidenceSearch: false,
  includeRawResults: false,
  parallelEvaluation: true,  // Default to parallel for speed
  maxConcurrency: 3,         // Limit to avoid rate limits
};

/**
 * Evaluated claim with full assessment
 */
export interface EvaluatedClaim {
  claim: ClassifiedClaim;
  evidence: DirectedEvidence[];
  experts: BatchValidationResult;
  consensus: ConsensusAssessment;
  output: GeneratedOutput;
  honestyCheck: {
    isHonest: boolean;
    violations: string[];
    warnings: string[];
  };
}

/**
 * Pipeline result
 */
export interface PipelineResult {
  /** Original article */
  article: Article;
  /** Extracted claims */
  extractedClaims: ExtractedClaims;
  /** Evaluated claims with assessments */
  evaluatedClaims: EvaluatedClaim[];
  /** Summary of all claim evaluations */
  summary: PipelineSummary;
  /** Processing metadata */
  metadata: PipelineMetadata;
  /** Raw intermediate results (if requested) */
  rawResults?: RawPipelineResults;
}

/**
 * Summary across all claims
 */
export interface PipelineSummary {
  totalClaims: number;
  claimsEvaluated: number;
  claimsByType: Record<string, number>;
  claimsByDomain: Record<string, number>;
  consensusLevelDistribution: Record<string, number>;
  averageConfidence: string;
  valuesQuestionsCount: number;
  hasActiveDabate: boolean;
}

/**
 * Processing metadata
 */
export interface PipelineMetadata {
  startedAt: Date;
  completedAt: Date;
  processingTimeMs: number;
  servicesUsed: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Raw intermediate results for debugging
 */
export interface RawPipelineResults {
  claimExtractionRaw: ExtractedClaims;
  searchQueriesPerClaim: Record<string, string[]>;
  searchResultsPerClaim: Record<string, any[]>;
  evidenceClassifications: Record<string, EvidenceClassification[]>;
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE GATHERING
// ═══════════════════════════════════════════════════════════════

/**
 * Extract a year from text or use current year
 */
function extractYearFromText(text: string): number {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }
  return new Date().getFullYear();
}

/**
 * Determine evidence direction from search result content
 * Uses simple heuristics - in production this would use LLM analysis
 */
function inferEvidenceDirection(snippet: string, claimText: string): EvidenceDirection {
  const lowerSnippet = snippet.toLowerCase();
  const lowerClaim = claimText.toLowerCase();

  // Look for negation patterns
  const negationPatterns = [
    /\b(no evidence|not support|does not|did not|failed to|insufficient|inconclusive)\b/,
    /\b(contrary to|refute|disprove|reject|oppose)\b/,
    /\b(no (significant |meaningful )?(effect|difference|impact|relationship))\b/,
  ];

  // Look for support patterns
  const supportPatterns = [
    /\b(evidence (supports|shows|indicates|demonstrates))\b/,
    /\b(found (that|a)|showed (that|a)|demonstrated)\b/,
    /\b(significant (effect|difference|impact|relationship))\b/,
    /\b(consistent with|confirms|supports)\b/,
  ];

  // Look for mixed/debate patterns
  const mixedPatterns = [
    /\b(mixed (results|evidence|findings))\b/,
    /\b(debate|contested|controversial)\b/,
    /\b(some (studies|research) (show|find).*while (other|some))\b/,
  ];

  for (const pattern of mixedPatterns) {
    if (pattern.test(lowerSnippet)) {
      return 'mixed';
    }
  }

  for (const pattern of negationPatterns) {
    if (pattern.test(lowerSnippet)) {
      return 'opposes';
    }
  }

  for (const pattern of supportPatterns) {
    if (pattern.test(lowerSnippet)) {
      return 'supports';
    }
  }

  return 'neutral';
}

/**
 * Convert search result to directed evidence
 */
function convertToDirectedEvidence(
  searchResult: { title: string; url: string; snippet: string; publishedDate?: string },
  claimText: string
): DirectedEvidence {
  // Classify the evidence tier
  const classification = classifyEvidenceTier({
    url: searchResult.url,
    title: searchResult.title,
  });

  // Infer direction from snippet
  const direction = inferEvidenceDirection(searchResult.snippet, claimText);

  // Extract year
  const year = searchResult.publishedDate
    ? extractYearFromText(searchResult.publishedDate)
    : extractYearFromText(searchResult.snippet);

  // Build citation
  const citation: Citation = {
    title: searchResult.title,
    authors: [], // Would be extracted from actual metadata
    publication: new URL(searchResult.url).hostname.replace('www.', ''),
    year,
    url: searchResult.url,
    finding: searchResult.snippet.substring(0, 200),
  };

  return {
    citation,
    tier: classification.tier,
    category: classification.category,
    direction,
    keyFinding: searchResult.snippet.substring(0, 300),
  };
}

/**
 * Gather evidence for a claim using Exa search
 */
async function gatherEvidence(
  claim: ClassifiedClaim,
  maxResults: number = 10
): Promise<DirectedEvidence[]> {
  // Build search queries based on domain
  const queries = buildSearchQueries(claim);

  // Take first 2 queries to avoid excessive API calls
  const searchQueries = queries.slice(0, 2);

  const allResults: DirectedEvidence[] = [];

  for (const query of searchQueries) {
    try {
      const response = await searchAcademic(query, Math.ceil(maxResults / 2));
      const evidence = response.results.map((result) =>
        convertToDirectedEvidence(result, claim.text)
      );
      allResults.push(...evidence);
    } catch (error) {
      console.warn(`[Pipeline] Search failed for query "${query}":`, (error as Error).message);
    }
  }

  // Dedupe by URL
  const seenUrls = new Set<string>();
  const deduped = allResults.filter((e) => {
    if (seenUrls.has(e.citation.url)) return false;
    seenUrls.add(e.citation.url);
    return true;
  });

  return deduped.slice(0, maxResults);
}

/**
 * Create mock evidence for testing when Exa is not configured
 */
function createMockEvidence(claim: ClassifiedClaim): DirectedEvidence[] {
  // Return minimal mock evidence for testing
  return [
    {
      citation: {
        title: `Research on: ${claim.text.substring(0, 50)}`,
        authors: ['Mock Author et al.'],
        publication: 'Mock Journal',
        year: 2024,
        url: 'https://example.com/mock-study',
        finding: 'Mock finding for testing purposes.',
      },
      tier: 2,
      category: 'peer_reviewed',
      direction: 'neutral',
      keyFinding: 'Mock finding for testing purposes.',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// EXPERT EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract potential expert mentions from claim source
 */
function extractExpertMentions(claim: ClassifiedClaim): PersonMention[] {
  const mentions: PersonMention[] = [];

  // Add claim source if present
  if (claim.source && claim.source.name && claim.source.name !== 'Unknown') {
    mentions.push({
      name: claim.source.name,
      title: claim.source.role,
      credentials: claim.source.credentials,
      affiliation: claim.source.affiliation,
      role: claim.source.role,
    });
  }

  return mentions;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate a single claim through the full pipeline
 */
async function evaluateSingleClaim(
  claim: ClassifiedClaim,
  articleSubjects: string[],
  options: Required<PipelineOptions>
): Promise<EvaluatedClaim> {
  // Step 1: Gather evidence (Wave 2 + 3)
  let evidence: DirectedEvidence[];
  if (options.skipEvidenceSearch || !isExaConfigured()) {
    evidence = createMockEvidence(claim);
  } else {
    evidence = await gatherEvidence(claim, options.maxSearchResults);
  }

  // Step 2: Extract and validate experts (Wave 4)
  const expertMentions = extractExpertMentions(claim);
  const experts = validateExperts(expertMentions, articleSubjects, claim.domain);

  // Step 3: Assess consensus (Wave 5)
  const consensusInput: ConsensusAssessmentInput = {
    claimText: claim.text,
    claimType: claim.type,
    domain: claim.domain,
    evidence,
    articleSubjects,
  };
  const consensus = assessConsensus(consensusInput);

  // Step 4: Generate output (Wave 6)
  const output = generateOutput(consensus, claim.text, {
    format: options.outputFormat,
    includeMetadata: true,
  });

  // Step 5: Perform honesty check
  const honestyCheck = performHonestyCheck(consensus, output.rendered);

  return {
    claim,
    evidence,
    experts,
    consensus,
    output,
    honestyCheck,
  };
}

/**
 * Build pipeline summary from evaluated claims
 */
function buildSummary(
  extractedClaims: ExtractedClaims,
  evaluatedClaims: EvaluatedClaim[]
): PipelineSummary {
  const claimsByType: Record<string, number> = {};
  const claimsByDomain: Record<string, number> = {};
  const consensusLevelDistribution: Record<string, number> = {};
  let valuesQuestionsCount = 0;
  let hasActiveDebate = false;
  let totalConfidence = 0;

  for (const evaluated of evaluatedClaims) {
    // Count by type
    const type = evaluated.claim.type;
    claimsByType[type] = (claimsByType[type] || 0) + 1;

    // Count by domain
    const domain = evaluated.claim.domain;
    claimsByDomain[domain] = (claimsByDomain[domain] || 0) + 1;

    // Count by consensus level
    const level = evaluated.consensus.level;
    consensusLevelDistribution[level] = (consensusLevelDistribution[level] || 0) + 1;

    // Track values questions and debates
    if (level === 'values_question') {
      valuesQuestionsCount++;
    }
    if (level === 'active_debate') {
      hasActiveDebate = true;
    }

    // Track confidence
    const confidenceValue = evaluated.consensus.confidence === 'high' ? 3 :
      evaluated.consensus.confidence === 'medium' ? 2 : 1;
    totalConfidence += confidenceValue;
  }

  const avgConfidenceValue = evaluatedClaims.length > 0
    ? totalConfidence / evaluatedClaims.length
    : 0;
  const averageConfidence = avgConfidenceValue >= 2.5 ? 'high' :
    avgConfidenceValue >= 1.5 ? 'medium' : 'low';

  return {
    totalClaims: extractedClaims.claims.length,
    claimsEvaluated: evaluatedClaims.length,
    claimsByType,
    claimsByDomain,
    consensusLevelDistribution,
    averageConfidence,
    valuesQuestionsCount,
    hasActiveDabate: hasActiveDebate,
  };
}

/**
 * Run the complete evaluation pipeline on an article
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const startedAt = new Date();
  const options = { ...DEFAULT_PIPELINE_OPTIONS, ...input.options };
  const warnings: string[] = [];
  const errors: string[] = [];
  const servicesUsed: string[] = ['claimExtractor'];

  // Step 1: Extract claims (Wave 1)
  console.log('[Pipeline] Step 1: Extracting claims from article...');
  let extractedClaims: ExtractedClaims;
  try {
    extractedClaims = await extractClaims(input.article);
  } catch (error) {
    errors.push(`Claim extraction failed: ${(error as Error).message}`);
    // Return early with empty results
    return {
      article: input.article,
      extractedClaims: { articleSubjects: [], claims: [] },
      evaluatedClaims: [],
      summary: {
        totalClaims: 0,
        claimsEvaluated: 0,
        claimsByType: {},
        claimsByDomain: {},
        consensusLevelDistribution: {},
        averageConfidence: 'low',
        valuesQuestionsCount: 0,
        hasActiveDabate: false,
      },
      metadata: {
        startedAt,
        completedAt: new Date(),
        processingTimeMs: Date.now() - startedAt.getTime(),
        servicesUsed,
        warnings,
        errors,
      },
    };
  }

  console.log(`[Pipeline] Extracted ${extractedClaims.claims.length} claims, ${extractedClaims.articleSubjects.length} article subjects`);

  // Limit claims if needed
  const claimsToEvaluate = extractedClaims.claims.slice(0, options.maxClaims);
  if (extractedClaims.claims.length > options.maxClaims) {
    warnings.push(`Evaluating only first ${options.maxClaims} of ${extractedClaims.claims.length} claims`);
  }

  // Step 2-6: Evaluate each claim
  servicesUsed.push('domainRouter', 'evidenceTier', 'expertValidator', 'consensusDetector', 'outputGenerator');
  if (isExaConfigured() && !options.skipEvidenceSearch) {
    servicesUsed.push('exa');
  }

  const evaluatedClaims: EvaluatedClaim[] = [];
  const rawSearchQueries: Record<string, string[]> = {};
  const rawSearchResults: Record<string, any[]> = {};

  // Store raw queries if requested (this is fast, do it upfront)
  if (options.includeRawResults) {
    for (const claim of claimsToEvaluate) {
      rawSearchQueries[claim.id] = buildSearchQueries(claim);
    }
  }

  // Evaluate claims - parallel or sequential based on options
  if (options.parallelEvaluation && claimsToEvaluate.length > 1) {
    console.log(`[Pipeline] Evaluating ${claimsToEvaluate.length} claims in parallel (max ${options.maxConcurrency} concurrent)...`);

    // Process in batches to respect concurrency limit
    const batches: ClassifiedClaim[][] = [];
    for (let i = 0; i < claimsToEvaluate.length; i += options.maxConcurrency) {
      batches.push(claimsToEvaluate.slice(i, i + options.maxConcurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (claim) => {
        try {
          console.log(`[Pipeline] Evaluating: "${claim.text.substring(0, 40)}..."`);
          return await evaluateSingleClaim(claim, extractedClaims.articleSubjects, options);
        } catch (error) {
          const errorMsg = `Claim "${claim.id}" evaluation failed: ${(error as Error).message}`;
          console.error(`[Pipeline] ${errorMsg}`);
          errors.push(errorMsg);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        if (result) {
          evaluatedClaims.push(result);
          if (!result.honestyCheck.isHonest) {
            warnings.push(`Claim "${result.claim.id}" has honesty violations: ${result.honestyCheck.violations.join('; ')}`);
          }
        }
      }
    }
  } else {
    // Sequential evaluation
    for (let i = 0; i < claimsToEvaluate.length; i++) {
      const claim = claimsToEvaluate[i];
      console.log(`[Pipeline] Evaluating claim ${i + 1}/${claimsToEvaluate.length}: "${claim.text.substring(0, 50)}..."`);

      try {
        const evaluated = await evaluateSingleClaim(
          claim,
          extractedClaims.articleSubjects,
          options
        );
        evaluatedClaims.push(evaluated);

        if (!evaluated.honestyCheck.isHonest) {
          warnings.push(`Claim "${claim.id}" has honesty violations: ${evaluated.honestyCheck.violations.join('; ')}`);
        }
      } catch (error) {
        const errorMsg = `Claim "${claim.id}" evaluation failed: ${(error as Error).message}`;
        console.error(`[Pipeline] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
  }

  // Build summary
  const summary = buildSummary(extractedClaims, evaluatedClaims);

  const completedAt = new Date();

  // Build result
  const result: PipelineResult = {
    article: input.article,
    extractedClaims,
    evaluatedClaims,
    summary,
    metadata: {
      startedAt,
      completedAt,
      processingTimeMs: completedAt.getTime() - startedAt.getTime(),
      servicesUsed,
      warnings,
      errors,
    },
  };

  // Include raw results if requested
  if (options.includeRawResults) {
    result.rawResults = {
      claimExtractionRaw: extractedClaims,
      searchQueriesPerClaim: rawSearchQueries,
      searchResultsPerClaim: rawSearchResults,
      evidenceClassifications: {},
    };
  }

  console.log(`[Pipeline] Completed. Evaluated ${evaluatedClaims.length}/${claimsToEvaluate.length} claims in ${result.metadata.processingTimeMs}ms`);

  return result;
}

/**
 * Quick evaluation - just extract claims without full evidence search
 * Useful for fast preview or when API limits are a concern
 */
export async function runQuickPipeline(input: PipelineInput): Promise<PipelineResult> {
  return runPipeline({
    ...input,
    options: {
      ...input.options,
      skipEvidenceSearch: true,
      maxClaims: input.options?.maxClaims ?? 10,
    },
  });
}

/**
 * Evaluate a single claim independently (useful for incremental evaluation)
 */
export async function evaluateClaim(
  claim: ClassifiedClaim,
  articleSubjects: string[],
  options?: Partial<PipelineOptions>
): Promise<EvaluatedClaim> {
  const fullOptions = { ...DEFAULT_PIPELINE_OPTIONS, ...options };
  return evaluateSingleClaim(claim, articleSubjects, fullOptions);
}

// Export types for consumers
export type { DirectedEvidence, ConsensusAssessment, ValidatedExpert, GeneratedOutput };
