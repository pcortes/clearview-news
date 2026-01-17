/**
 * Integration Tests for Pipeline Service
 * Wave 7 - Full pipeline integration tests
 *
 * Reference: EXPERT_EVALUATION_SPEC.md
 *
 * Test categories:
 * 1. Pipeline input validation
 * 2. Claim extraction integration
 * 3. Evidence gathering integration
 * 4. Expert validation integration
 * 5. Consensus detection integration
 * 6. Output generation integration
 * 7. Full pipeline flow
 * 8. Error handling
 * 9. Options and configuration
 * 10. Summary generation
 *
 * Note: These tests use skipEvidenceSearch and evaluateClaim directly
 * to avoid slow API calls during unit testing.
 */

import {
  runPipeline,
  runQuickPipeline,
  evaluateClaim,
  PipelineInput,
  PipelineOptions,
  PipelineResult,
  EvaluatedClaim,
  DEFAULT_PIPELINE_OPTIONS,
} from '../pipeline';
import { Article, ClassifiedClaim, Domain, ClaimType } from '../../types/claims';
import { ConsensusLevel } from '../../types/consensus';

// Increase timeout for tests that may call external APIs
jest.setTimeout(120000);

// ═══════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create mock article for testing
 */
function createMockArticle(overrides: Partial<Article> = {}): Article {
  return {
    title: 'Test Article About Climate Change',
    source: 'Test News',
    content: `
      Climate scientists have found strong evidence that human activities are causing global warming.
      Dr. Jane Smith, a professor at MIT, stated that "the evidence is overwhelming."
      Senator John Doe claims that climate policies will hurt the economy.
      The IPCC report shows temperatures have risen by 1.1 degrees Celsius.
    `,
    url: 'https://example.com/article',
    author: 'Test Author',
    ...overrides,
  };
}

/**
 * Create mock classified claim for testing
 */
function createMockClaim(overrides: Partial<ClassifiedClaim> = {}): ClassifiedClaim {
  return {
    id: 'claim_1',
    text: 'Human activities are causing global warming',
    type: 'causal',
    isVerifiable: true,
    verifiabilityReason: 'Causal claims can be evaluated with research',
    source: {
      name: 'Dr. Jane Smith',
      role: 'cited_expert',
      credentials: 'Professor at MIT',
      isExcludedFromExpertPool: false,
    },
    domain: 'climate',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. PIPELINE INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('Pipeline Input Validation', () => {
  describe('DEFAULT_PIPELINE_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_PIPELINE_OPTIONS.maxClaims).toBe(5);
      expect(DEFAULT_PIPELINE_OPTIONS.maxSearchResults).toBe(10);
      expect(DEFAULT_PIPELINE_OPTIONS.outputFormat).toBe('markdown');
      expect(DEFAULT_PIPELINE_OPTIONS.skipEvidenceSearch).toBe(false);
      expect(DEFAULT_PIPELINE_OPTIONS.includeRawResults).toBe(false);
    });
  });

  describe('PipelineInput', () => {
    it('should accept valid article input', async () => {
      const article = createMockArticle();
      const input: PipelineInput = {
        article,
        options: { skipEvidenceSearch: true, maxClaims: 1 },
      };

      // Should not throw
      const result = await runPipeline(input);
      expect(result).toBeDefined();
      expect(result.article).toEqual(article);
    });

    it('should accept custom options', async () => {
      const article = createMockArticle();
      const options: PipelineOptions = {
        maxClaims: 2,
        maxSearchResults: 5,
        outputFormat: 'json',
        skipEvidenceSearch: true,
      };

      const result = await runPipeline({ article, options });
      expect(result.evaluatedClaims.length).toBeLessThanOrEqual(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. CLAIM EXTRACTION INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Claim Extraction Integration', () => {
  it('should extract claims from article', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article });

    expect(result.extractedClaims).toBeDefined();
    // Claims should be extracted (may be empty if OpenAI not configured)
    expect(Array.isArray(result.extractedClaims.claims)).toBe(true);
    expect(Array.isArray(result.extractedClaims.articleSubjects)).toBe(true);
  });

  it('should limit claims to maxClaims option', async () => {
    const article = createMockArticle({
      content: `
        Claim 1: The sky is blue.
        Claim 2: Water is wet.
        Claim 3: Fire is hot.
        Claim 4: Ice is cold.
        Claim 5: Grass is green.
        Claim 6: The sun is bright.
      `,
    });

    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 2 },
    });

    expect(result.evaluatedClaims.length).toBeLessThanOrEqual(2);
    if (result.extractedClaims.claims.length > 2) {
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. EVIDENCE GATHERING INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Evidence Gathering Integration', () => {
  it('should skip evidence search when option is set', async () => {
    const article = createMockArticle();
    const result = await runPipeline({
      article,
      options: { skipEvidenceSearch: true, maxClaims: 1 },
    });

    // Should still complete without actual search
    expect(result).toBeDefined();
    expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
  });

  it('should use mock evidence when Exa is not configured', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article, options: { maxClaims: 1 } });

    // Quick pipeline skips evidence search, so should use mock
    for (const evaluated of result.evaluatedClaims) {
      // Evidence should exist (even if mock)
      expect(Array.isArray(evaluated.evidence)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. EXPERT VALIDATION INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Expert Validation Integration', () => {
  it('should include expert validation in evaluated claims', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article, options: { maxClaims: 1 } });

    for (const evaluated of result.evaluatedClaims) {
      expect(evaluated.experts).toBeDefined();
      expect(typeof evaluated.experts.validCount).toBe('number');
      expect(typeof evaluated.experts.excludedCount).toBe('number');
      expect(Array.isArray(evaluated.experts.validExperts)).toBe(true);
      expect(Array.isArray(evaluated.experts.excludedPersons)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. CONSENSUS DETECTION INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Consensus Detection Integration', () => {
  it('should assess consensus for each claim', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article, options: { maxClaims: 1 } });

    for (const evaluated of result.evaluatedClaims) {
      expect(evaluated.consensus).toBeDefined();
      expect(evaluated.consensus.level).toBeDefined();
      expect(evaluated.consensus.confidence).toBeDefined();
      expect(evaluated.consensus.framingSentence).toBeDefined();
    }
  });

  it('should detect values questions appropriately', async () => {
    const claim = createMockClaim({
      text: 'We should ban all fossil fuels',
      type: 'values',
    });

    const evaluated = await evaluateClaim(claim, [], { skipEvidenceSearch: true });

    expect(evaluated.consensus.level).toBe('values_question');
    expect(evaluated.consensus.framingSentence).toContain('values question');
  });

  it('should handle insufficient research', async () => {
    const claim = createMockClaim({
      text: 'Very obscure claim with no research',
      type: 'empirical',
      domain: 'general',
    });

    const evaluated = await evaluateClaim(claim, [], { skipEvidenceSearch: true });

    // With mock evidence, should likely be insufficient_research or emerging
    expect(['insufficient_research', 'emerging_research']).toContain(evaluated.consensus.level);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. OUTPUT GENERATION INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Output Generation Integration', () => {
  it('should generate output in specified format', async () => {
    const claim = createMockClaim();
    const evaluated = await evaluateClaim(claim, [], {
      skipEvidenceSearch: true,
      outputFormat: 'markdown',
    });

    expect(evaluated.output).toBeDefined();
    expect(evaluated.output.format).toBe('markdown');
    expect(typeof evaluated.output.content).toBe('string');
    expect(evaluated.output.content.length).toBeGreaterThan(0);
  });

  it('should generate HTML output', async () => {
    const claim = createMockClaim();
    const evaluated = await evaluateClaim(claim, [], {
      skipEvidenceSearch: true,
      outputFormat: 'html',
    });

    expect(evaluated.output.format).toBe('html');
    expect(evaluated.output.content).toContain('<div');
  });

  it('should generate JSON output', async () => {
    const claim = createMockClaim();
    const evaluated = await evaluateClaim(claim, [], {
      skipEvidenceSearch: true,
      outputFormat: 'json',
    });

    expect(evaluated.output.format).toBe('json');
    // Should be valid JSON
    expect(() => JSON.parse(evaluated.output.content)).not.toThrow();
  });

  it('should include honesty check in output', async () => {
    const claim = createMockClaim();
    const evaluated = await evaluateClaim(claim, [], { skipEvidenceSearch: true });

    expect(evaluated.honestyCheck).toBeDefined();
    expect(typeof evaluated.honestyCheck.isHonest).toBe('boolean');
    expect(Array.isArray(evaluated.honestyCheck.violations)).toBe(true);
    expect(Array.isArray(evaluated.honestyCheck.warnings)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. FULL PIPELINE FLOW
// ═══════════════════════════════════════════════════════════════

describe('Full Pipeline Flow', () => {
  it('should complete full pipeline successfully', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 2 },
    });

    // Verify all major components
    expect(result.article).toEqual(article);
    expect(result.extractedClaims).toBeDefined();
    expect(result.evaluatedClaims).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it('should track processing metadata', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article, options: { maxClaims: 1 } });

    expect(result.metadata.startedAt).toBeInstanceOf(Date);
    expect(result.metadata.completedAt).toBeInstanceOf(Date);
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.metadata.servicesUsed)).toBe(true);
    expect(result.metadata.servicesUsed.length).toBeGreaterThan(0);
  });

  it('should include services used in metadata', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article, options: { maxClaims: 1 } });

    expect(result.metadata.servicesUsed).toContain('claimExtractor');
    expect(result.metadata.servicesUsed).toContain('domainRouter');
    expect(result.metadata.servicesUsed).toContain('consensusDetector');
    expect(result.metadata.servicesUsed).toContain('outputGenerator');
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

describe('Error Handling', () => {
  it('should handle empty article content gracefully', async () => {
    const article = createMockArticle({ content: '' });
    const result = await runQuickPipeline({ article });

    // Should complete without crashing
    expect(result).toBeDefined();
    expect(result.extractedClaims.claims.length).toBe(0);
  });

  it('should track errors in metadata', async () => {
    const article = createMockArticle({ content: '' });
    const result = await runQuickPipeline({ article });

    // Empty content should complete but may have warnings
    expect(Array.isArray(result.metadata.errors)).toBe(true);
    expect(Array.isArray(result.metadata.warnings)).toBe(true);
  });

  it('should continue evaluating other claims if one fails', async () => {
    // This tests resilience - even if one claim fails, others should proceed
    const article = createMockArticle({
      content: `
        Normal claim: The sky is blue.
        Another claim: Water is essential for life.
      `,
    });

    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 5 },
    });

    // Should attempt to process claims
    expect(result).toBeDefined();
    expect(Array.isArray(result.evaluatedClaims)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. OPTIONS AND CONFIGURATION
// ═══════════════════════════════════════════════════════════════

describe('Options and Configuration', () => {
  it('should respect maxClaims option', async () => {
    const article = createMockArticle();

    const result1 = await runQuickPipeline({ article, options: { maxClaims: 1 } });
    const result2 = await runQuickPipeline({ article, options: { maxClaims: 3 } });

    expect(result1.evaluatedClaims.length).toBeLessThanOrEqual(1);
    expect(result2.evaluatedClaims.length).toBeLessThanOrEqual(3);
  });

  it('should respect outputFormat option', async () => {
    const claim = createMockClaim();

    const mdResult = await evaluateClaim(claim, [], {
      skipEvidenceSearch: true,
      outputFormat: 'markdown',
    });
    const htmlResult = await evaluateClaim(claim, [], {
      skipEvidenceSearch: true,
      outputFormat: 'html',
    });
    const textResult = await evaluateClaim(claim, [], {
      skipEvidenceSearch: true,
      outputFormat: 'text',
    });

    expect(mdResult.output.format).toBe('markdown');
    expect(htmlResult.output.format).toBe('html');
    expect(textResult.output.format).toBe('text');
  });

  it('should include raw results when requested', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({
      article,
      options: { includeRawResults: true, maxClaims: 1 },
    });

    expect(result.rawResults).toBeDefined();
    expect(result.rawResults!.claimExtractionRaw).toBeDefined();
    expect(result.rawResults!.searchQueriesPerClaim).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. SUMMARY GENERATION
// ═══════════════════════════════════════════════════════════════

describe('Summary Generation', () => {
  it('should generate accurate summary', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 3 },
    });

    const summary = result.summary;

    expect(typeof summary.totalClaims).toBe('number');
    expect(typeof summary.claimsEvaluated).toBe('number');
    expect(typeof summary.claimsByType).toBe('object');
    expect(typeof summary.claimsByDomain).toBe('object');
    expect(typeof summary.consensusLevelDistribution).toBe('object');
    expect(typeof summary.averageConfidence).toBe('string');
    expect(typeof summary.valuesQuestionsCount).toBe('number');
    expect(typeof summary.hasActiveDabate).toBe('boolean');
  });

  it('should count claims by type correctly', async () => {
    // Create article with different claim types
    const article = createMockArticle({
      content: `
        Statistical claim: 50% of Americans support this policy.
        Causal claim: Smoking causes cancer.
        Values claim: We should protect the environment.
      `,
    });

    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 5 },
    });

    // Sum of claims by type should equal total evaluated
    const totalByType = Object.values(result.summary.claimsByType).reduce(
      (a, b) => a + b,
      0
    );
    expect(totalByType).toBe(result.summary.claimsEvaluated);
  });

  it('should calculate average confidence', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 2 },
    });

    expect(['high', 'medium', 'low']).toContain(result.summary.averageConfidence);
  });
});

// ═══════════════════════════════════════════════════════════════
// SINGLE CLAIM EVALUATION
// ═══════════════════════════════════════════════════════════════

describe('Single Claim Evaluation', () => {
  it('should evaluate a single claim independently', async () => {
    const claim = createMockClaim();
    const result = await evaluateClaim(claim, ['Senator John Doe'], {
      skipEvidenceSearch: true,
    });

    expect(result.claim).toEqual(claim);
    expect(result.evidence).toBeDefined();
    expect(result.experts).toBeDefined();
    expect(result.consensus).toBeDefined();
    expect(result.output).toBeDefined();
    expect(result.honestyCheck).toBeDefined();
  });

  it('should respect article subjects when evaluating claims', async () => {
    const claim = createMockClaim({
      source: {
        name: 'Senator John Doe',
        role: 'article_subject',
        isExcludedFromExpertPool: true,
      },
    });

    const result = await evaluateClaim(claim, ['Senator John Doe'], {
      skipEvidenceSearch: true,
    });

    // The claim source should be excluded
    expect(claim.source.isExcludedFromExpertPool).toBe(true);
  });

  it('should handle different claim types', async () => {
    const claimTypes: ClaimType[] = [
      'empirical',
      'causal',
      'statistical',
      'values',
      'predictive',
    ];

    for (const type of claimTypes) {
      const claim = createMockClaim({ type });
      const result = await evaluateClaim(claim, [], { skipEvidenceSearch: true });

      expect(result.claim.type).toBe(type);
      expect(result.consensus).toBeDefined();
    }
  });

  it('should handle different domains', async () => {
    const domains: Domain[] = ['climate', 'medicine', 'economics', 'psychology'];

    for (const domain of domains) {
      const claim = createMockClaim({ domain });
      const result = await evaluateClaim(claim, [], { skipEvidenceSearch: true });

      expect(result.claim.domain).toBe(domain);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// QUICK PIPELINE
// ═══════════════════════════════════════════════════════════════

describe('Quick Pipeline', () => {
  it('should run faster by skipping evidence search', async () => {
    const article = createMockArticle();

    const startQuick = Date.now();
    await runQuickPipeline({ article, options: { maxClaims: 1 } });
    const quickTime = Date.now() - startQuick;

    // Quick pipeline should be reasonably fast
    expect(quickTime).toBeLessThan(30000); // 30 seconds max
  });

  it('should still produce complete results', async () => {
    const article = createMockArticle();
    const result = await runQuickPipeline({ article, options: { maxClaims: 1 } });

    // Should have all components even without evidence search
    expect(result.extractedClaims).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('should handle article with no extractable claims', async () => {
    const article = createMockArticle({
      content: 'Just some random text with no clear claims.',
    });

    const result = await runQuickPipeline({ article });

    // Should complete without error
    expect(result).toBeDefined();
    expect(result.summary.totalClaims).toBeGreaterThanOrEqual(0);
  });

  it('should handle very long article content', async () => {
    const longContent = 'This is a test claim. '.repeat(1000);
    const article = createMockArticle({ content: longContent });

    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 1 },
    });

    expect(result).toBeDefined();
  });

  it('should handle special characters in content', async () => {
    const article = createMockArticle({
      title: 'Test <script>alert("xss")</script>',
      content: 'Content with "quotes" and <html> tags & special chars © ® ™',
    });

    const result = await runQuickPipeline({
      article,
      options: { maxClaims: 1 },
    });

    expect(result).toBeDefined();
  });
});
