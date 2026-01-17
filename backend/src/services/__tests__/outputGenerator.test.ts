/**
 * TDD Tests for Output Generator Service
 * Wave 6 - Tests for honest output generation
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 8
 *
 * Test categories:
 * 1. Honest framing for each consensus level
 * 2. Debate section generation (never hide debate)
 * 3. Certainty language checks (never overstate)
 * 4. Values question handling
 * 5. Warning/caveat generation
 * 6. Citation formatting
 * 7. Format-specific output (Markdown, HTML, JSON, Text)
 * 8. Honesty check validation
 * 9. Full output generation integration
 */

import {
  generateOutput,
  renderClaimOutput,
  generateHeader,
  generateEvidenceSummary,
  generateDebateSection,
  generateEmergingTrends,
  generateValuesContent,
  generateWarnings,
  generateSourcesList,
  generateMarkdownOutput,
  generateHtmlOutput,
  generateTextOutput,
  generateJsonOutput,
  generateConfidenceBadge,
  performHonestyCheck,
  containsOverclaimingLanguage,
  formatAuthors,
  convertCitation,
  getTierLabel,
  getDirectionDisplayText,
  getStrengthLabel,
} from '../outputGenerator';
import {
  ConsensusAssessment,
  ConsensusLevel,
  ConfidenceLevel,
  DirectedEvidence,
  Citation,
  EvidenceBasis,
  DebatePosition,
} from '../../types/consensus';
import { Domain, ClaimType } from '../../types/claims';
import { EvidenceTier } from '../evidenceTier';
import {
  OutputFormat,
  RenderedClaimOutput,
  needsDebateSection,
  needsEmergingTrendsSection,
  needsValuesContentSection,
  allowsCertaintyLanguage,
  requiresUncertaintyLanguage,
} from '../../types/output';

// ═══════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a mock citation
 */
function createMockCitation(
  title: string = 'Test Study',
  year: number = 2023
): Citation {
  return {
    title,
    authors: ['Author A', 'Author B'],
    publication: 'Test Journal',
    year,
    url: 'https://example.com/study',
    doi: '10.1234/test',
    finding: 'This study found significant results.',
  };
}

/**
 * Create mock evidence basis
 */
function createMockBasis(
  qualityStudies: number = 10,
  metaAnalyses: number = 2,
  systematicReviews: number = 1
): EvidenceBasis {
  // For small study counts, adjust meta-analyses and systematic reviews
  const actualMetaAnalyses = Math.min(metaAnalyses, Math.max(0, qualityStudies - 1));
  const actualSystematicReviews = Math.min(systematicReviews, Math.max(0, qualityStudies - actualMetaAnalyses - 1));
  const majorReportCount = qualityStudies > 3 ? 1 : 0;
  const peerReviewedCount = Math.max(0, qualityStudies - actualMetaAnalyses - actualSystematicReviews - majorReportCount);

  return {
    metaAnalyses: Array(actualMetaAnalyses)
      .fill(null)
      .map((_, i) => createMockCitation(`Meta-Analysis ${i + 1}`)),
    systematicReviews: Array(actualSystematicReviews)
      .fill(null)
      .map((_, i) => createMockCitation(`Systematic Review ${i + 1}`)),
    majorReports: majorReportCount > 0 ? [createMockCitation('Major Report')] : [],
    peerReviewedStudies: Array(peerReviewedCount)
      .fill(null)
      .map((_, i) => createMockCitation(`Peer-Reviewed Study ${i + 1}`)),
    totalQualityStudies: qualityStudies,
    totalStudiesExamined: qualityStudies + 5,
  };
}

/**
 * Create mock debate positions
 */
function createMockDebatePositions(): NonNullable<ConsensusAssessment['positions']> {
  return {
    positionA: {
      summary: 'Position A supports the claim',
      supportingExperts: [],
      keyEvidence: [createMockCitation('Supporting Study 1')],
      strengthOfEvidence: 'moderate',
      mainArguments: ['Argument 1', 'Argument 2'],
    },
    positionB: {
      summary: 'Position B opposes the claim',
      supportingExperts: [],
      keyEvidence: [createMockCitation('Opposing Study 1')],
      strengthOfEvidence: 'moderate',
      mainArguments: ['Counter-argument 1', 'Counter-argument 2'],
    },
    reasonsForDisagreement: [
      'Different methodologies',
      'Different interpretations',
    ],
  };
}

/**
 * Create mock emerging trends
 */
function createMockEmergingTrends(): NonNullable<ConsensusAssessment['emergingTrends']> {
  return {
    direction: 'supports',
    recentStudies: [
      createMockCitation('Recent Study 1', 2024),
      createMockCitation('Recent Study 2', 2025),
    ],
    caveats: ['Research is ongoing', 'Early findings require replication'],
  };
}

/**
 * Create a mock consensus assessment
 */
function createMockAssessment(
  level: ConsensusLevel,
  options: Partial<{
    confidence: ConfidenceLevel;
    supportRatio: number;
    qualityStudies: number;
    domain: Domain;
    claimType: ClaimType;
    includePositions: boolean;
    includeEmergingTrends: boolean;
  }> = {}
): ConsensusAssessment {
  const {
    confidence = level === 'strong_consensus' ? 'high' : 'medium',
    supportRatio = 0.9,
    qualityStudies = 10,
    domain = 'medicine',
    claimType = 'causal',
    includePositions = level === 'active_debate',
    includeEmergingTrends = level === 'emerging_research',
  } = options;

  const assessment: ConsensusAssessment = {
    level,
    confidence,
    basis: createMockBasis(qualityStudies),
    evidenceSummary: {
      supporting: Math.round(qualityStudies * supportRatio),
      opposing: Math.round(qualityStudies * (1 - supportRatio)),
      neutral: 0,
      supportRatio,
    },
    framingSentence: getFramingSentenceForLevel(level, supportRatio),
    detailedExplanation: `Based on ${qualityStudies} studies examined.`,
    caveats: getCaveatsForLevel(level),
    domain,
    claimType,
    assessedAt: new Date(),
  };

  if (includePositions) {
    assessment.positions = createMockDebatePositions();
  }

  if (includeEmergingTrends) {
    assessment.emergingTrends = createMockEmergingTrends();
  }

  return assessment;
}

/**
 * Get framing sentence for level
 */
function getFramingSentenceForLevel(level: ConsensusLevel, supportRatio: number): string {
  switch (level) {
    case 'strong_consensus':
      return supportRatio >= 0.5
        ? 'Research clearly shows that this claim is well-supported by scientific evidence.'
        : 'Research clearly shows that this claim is not supported by scientific evidence.';
    case 'moderate_consensus':
      return 'Most research supports this claim, though some debate exists on details.';
    case 'active_debate':
      return 'Experts genuinely disagree on this question.';
    case 'emerging_research':
      return 'Early research suggests support for this claim, but findings may change.';
    case 'insufficient_research':
      return 'Insufficient peer-reviewed research exists to evaluate this claim.';
    case 'methodologically_blocked':
      return 'This claim cannot be directly tested through controlled experiments.';
    case 'values_question':
      return 'This is a values question that cannot be resolved through scientific research alone.';
    default:
      return 'Unable to assess this claim.';
  }
}

/**
 * Get caveats for level
 */
function getCaveatsForLevel(level: ConsensusLevel): string[] {
  switch (level) {
    case 'active_debate':
      return ['This represents genuine scientific disagreement'];
    case 'emerging_research':
      return ['Research is still early-stage', 'Conclusions may change'];
    case 'insufficient_research':
      return ['Not enough quality studies', 'Absence of evidence is not evidence of absence'];
    case 'values_question':
      return ['This is fundamentally a values question', 'Empirical research can inform but not determine value judgments'];
    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Output Generator Service', () => {
  // ───────────────────────────────────────────────────────────────
  // 1. TYPE GUARDS
  // ───────────────────────────────────────────────────────────────
  describe('Type Guards', () => {
    describe('needsDebateSection', () => {
      it('should return true for active_debate', () => {
        expect(needsDebateSection('active_debate')).toBe(true);
      });

      it('should return false for other levels', () => {
        expect(needsDebateSection('strong_consensus')).toBe(false);
        expect(needsDebateSection('moderate_consensus')).toBe(false);
        expect(needsDebateSection('values_question')).toBe(false);
      });
    });

    describe('needsEmergingTrendsSection', () => {
      it('should return true for emerging_research', () => {
        expect(needsEmergingTrendsSection('emerging_research')).toBe(true);
      });

      it('should return false for other levels', () => {
        expect(needsEmergingTrendsSection('strong_consensus')).toBe(false);
        expect(needsEmergingTrendsSection('active_debate')).toBe(false);
      });
    });

    describe('needsValuesContentSection', () => {
      it('should return true for values_question', () => {
        expect(needsValuesContentSection('values_question')).toBe(true);
      });

      it('should return false for other levels', () => {
        expect(needsValuesContentSection('strong_consensus')).toBe(false);
        expect(needsValuesContentSection('active_debate')).toBe(false);
      });
    });

    describe('allowsCertaintyLanguage', () => {
      it('should return true only for strong_consensus', () => {
        expect(allowsCertaintyLanguage('strong_consensus')).toBe(true);
        expect(allowsCertaintyLanguage('moderate_consensus')).toBe(false);
        expect(allowsCertaintyLanguage('active_debate')).toBe(false);
        expect(allowsCertaintyLanguage('values_question')).toBe(false);
      });
    });

    describe('requiresUncertaintyLanguage', () => {
      it('should return true for uncertain levels', () => {
        expect(requiresUncertaintyLanguage('active_debate')).toBe(true);
        expect(requiresUncertaintyLanguage('emerging_research')).toBe(true);
        expect(requiresUncertaintyLanguage('insufficient_research')).toBe(true);
        expect(requiresUncertaintyLanguage('methodologically_blocked')).toBe(true);
      });

      it('should return false for certain levels', () => {
        expect(requiresUncertaintyLanguage('strong_consensus')).toBe(false);
        expect(requiresUncertaintyLanguage('moderate_consensus')).toBe(false);
        expect(requiresUncertaintyLanguage('values_question')).toBe(false);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 2. HELPER FUNCTIONS
  // ───────────────────────────────────────────────────────────────
  describe('Helper Functions', () => {
    describe('formatAuthors', () => {
      it('should format single author', () => {
        expect(formatAuthors(['John Doe'])).toBe('John Doe');
      });

      it('should format two authors with "and"', () => {
        expect(formatAuthors(['John Doe', 'Jane Smith'])).toBe('John Doe and Jane Smith');
      });

      it('should format three+ authors with "et al."', () => {
        expect(formatAuthors(['Doe', 'Smith', 'Jones'])).toBe('Doe et al.');
      });

      it('should handle empty array', () => {
        expect(formatAuthors([])).toBe('Unknown authors');
      });
    });

    describe('getTierLabel', () => {
      it('should return correct labels for each tier', () => {
        expect(getTierLabel(1)).toBe('Systematic Review/Meta-Analysis');
        expect(getTierLabel(2)).toBe('Peer-Reviewed Study');
        expect(getTierLabel(3)).toBe('Working Paper/Preprint');
        expect(getTierLabel(4)).toBe('Expert Opinion');
        expect(getTierLabel(5)).toBe('Not Evidence');
      });
    });

    describe('getDirectionDisplayText', () => {
      it('should return correct text for each direction', () => {
        expect(getDirectionDisplayText('supports')).toBe('supports the claim');
        expect(getDirectionDisplayText('opposes')).toBe('does not support the claim');
        expect(getDirectionDisplayText('neutral')).toBe('is inconclusive');
        expect(getDirectionDisplayText('mixed')).toBe('shows mixed results');
      });
    });

    describe('getStrengthLabel', () => {
      it('should return correct labels', () => {
        expect(getStrengthLabel('strong')).toBe('Strong Evidence');
        expect(getStrengthLabel('moderate')).toBe('Moderate Evidence');
        expect(getStrengthLabel('weak')).toBe('Limited Evidence');
      });
    });

    describe('containsOverclaimingLanguage', () => {
      it('should detect overclaiming words', () => {
        expect(containsOverclaimingLanguage('This proves the claim')).toBe(true);
        expect(containsOverclaimingLanguage('This is definitely true')).toBe(true);
        expect(containsOverclaimingLanguage('Conclusively proven')).toBe(true);
      });

      it('should not flag appropriate language', () => {
        expect(containsOverclaimingLanguage('Research suggests this claim')).toBe(false);
        expect(containsOverclaimingLanguage('Evidence supports this')).toBe(false);
        expect(containsOverclaimingLanguage('Most studies agree')).toBe(false);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 3. CITATION FORMATTING
  // ───────────────────────────────────────────────────────────────
  describe('Citation Formatting', () => {
    describe('convertCitation', () => {
      it('should convert citation to output format', () => {
        const citation = createMockCitation('Test Study', 2023);
        const output = convertCitation(citation, 2);

        expect(output.title).toBe('Test Study');
        expect(output.year).toBe(2023);
        expect(output.tierLabel).toBe('Peer-Reviewed Study');
        expect(output.tierLevel).toBe(2);
        expect(output.authors).toBe('Author A and Author B');
      });

      it('should include finding if present', () => {
        const citation = createMockCitation();
        const output = convertCitation(citation);

        expect(output.finding).toBeDefined();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 4. HEADER GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Header Generation', () => {
    describe('generateConfidenceBadge', () => {
      it('should generate correct badge for strong_consensus', () => {
        const badge = generateConfidenceBadge('strong_consensus', 'high');
        expect(badge.text).toContain('HIGH');
        expect(badge.colorClass).toBe('green');
      });

      it('should generate correct badge for values_question', () => {
        const badge = generateConfidenceBadge('values_question', 'high');
        expect(badge.text).toBe('NOT EMPIRICAL');
        expect(badge.colorClass).toBe('purple');
      });

      it('should generate correct badge for active_debate', () => {
        const badge = generateConfidenceBadge('active_debate', 'medium');
        expect(badge.text).toBe('CONTESTED');
        expect(badge.colorClass).toBe('yellow');
      });

      it('should generate correct badge for insufficient_research', () => {
        const badge = generateConfidenceBadge('insufficient_research', 'low');
        expect(badge.text).toBe('UNKNOWN');
        expect(badge.colorClass).toBe('gray');
      });
    });

    describe('generateHeader', () => {
      it('should generate header with correct emoji for strong_consensus', () => {
        const assessment = createMockAssessment('strong_consensus');
        const header = generateHeader(assessment, 'Test claim');

        expect(header.emoji).toBe('✓');
        expect(header.headline).toBe('Research Clearly Shows');
        expect(header.claimText).toBe('Test claim');
      });

      it('should generate header with correct emoji for active_debate', () => {
        const assessment = createMockAssessment('active_debate');
        const header = generateHeader(assessment, 'Test claim');

        expect(header.emoji).toBe('⟷');
        expect(header.headline).toBe('Experts Disagree');
      });

      it('should generate header with correct emoji for values_question', () => {
        const assessment = createMockAssessment('values_question', { claimType: 'values' });
        const header = generateHeader(assessment, 'Test claim');

        expect(header.emoji).toBe('⚖');
        expect(header.headline).toBe('Values Question');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 5. EVIDENCE SUMMARY GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Evidence Summary Generation', () => {
    it('should generate summary for strong_consensus', () => {
      const assessment = createMockAssessment('strong_consensus', { qualityStudies: 15 });
      const summary = generateEvidenceSummary(assessment);

      expect(summary.qualityStudies).toBe(15);
      expect(summary.summaryText).toContain('overwhelming evidence');
    });

    it('should generate summary for insufficient_research', () => {
      const assessment = createMockAssessment('insufficient_research', { qualityStudies: 2 });
      const summary = generateEvidenceSummary(assessment);

      expect(summary.summaryText).toContain('More research is needed');
    });

    it('should generate summary for values_question', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const summary = generateEvidenceSummary(assessment);

      expect(summary.summaryText).toContain('values question');
    });

    it('should generate summary for active_debate', () => {
      const assessment = createMockAssessment('active_debate', { supportRatio: 0.5 });
      const summary = generateEvidenceSummary(assessment);

      expect(summary.summaryText).toContain('both sides');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 6. DEBATE SECTION GENERATION (NEVER HIDE DEBATE)
  // ───────────────────────────────────────────────────────────────
  describe('Debate Section Generation', () => {
    it('should generate debate section for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const debateSection = generateDebateSection(assessment);

      expect(debateSection).toBeDefined();
      expect(debateSection?.positionA).toBeDefined();
      expect(debateSection?.positionB).toBeDefined();
      expect(debateSection?.reasonsForDisagreement.length).toBeGreaterThan(0);
      expect(debateSection?.isGenuineDebate).toBe(true);
    });

    it('should NOT generate debate section for strong_consensus', () => {
      const assessment = createMockAssessment('strong_consensus');
      const debateSection = generateDebateSection(assessment);

      expect(debateSection).toBeUndefined();
    });

    it('should include both positions with arguments', () => {
      const assessment = createMockAssessment('active_debate');
      const debateSection = generateDebateSection(assessment);

      expect(debateSection?.positionA.mainArguments.length).toBeGreaterThan(0);
      expect(debateSection?.positionB.mainArguments.length).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 7. EMERGING TRENDS GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Emerging Trends Generation', () => {
    it('should generate emerging trends for emerging_research', () => {
      const assessment = createMockAssessment('emerging_research');
      const trends = generateEmergingTrends(assessment);

      expect(trends).toBeDefined();
      expect(trends?.recentStudies.length).toBeGreaterThan(0);
      expect(trends?.caveats.length).toBeGreaterThan(0);
    });

    it('should NOT generate emerging trends for strong_consensus', () => {
      const assessment = createMockAssessment('strong_consensus');
      const trends = generateEmergingTrends(assessment);

      expect(trends).toBeUndefined();
    });

    it('should include direction display text', () => {
      const assessment = createMockAssessment('emerging_research');
      const trends = generateEmergingTrends(assessment);

      expect(trends?.direction).toBeDefined();
      expect(trends?.summaryText).toContain('preliminary');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 8. VALUES CONTENT GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Values Content Generation', () => {
    it('should generate values content for values_question', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const valuesContent = generateValuesContent(assessment, 'Should we do X?');

      expect(valuesContent).toBeDefined();
      expect(valuesContent?.whatResearchCanInform.length).toBeGreaterThan(0);
      expect(valuesContent?.valuesInvolved.length).toBeGreaterThan(0);
    });

    it('should NOT generate values content for empirical claims', () => {
      const assessment = createMockAssessment('strong_consensus');
      const valuesContent = generateValuesContent(assessment, 'Test claim');

      expect(valuesContent).toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 9. WARNINGS GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Warnings Generation', () => {
    it('should generate warnings for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const warnings = generateWarnings(assessment);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.text.includes('contested'))).toBe(true);
    });

    it('should generate warnings for values_question', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const warnings = generateWarnings(assessment);

      expect(warnings.some((w) => w.type === 'values_note')).toBe(true);
    });

    it('should generate critical warning for insufficient_research', () => {
      const assessment = createMockAssessment('insufficient_research', { qualityStudies: 2 });
      const warnings = generateWarnings(assessment);

      expect(warnings.some((w) => w.severity === 'critical')).toBe(true);
    });

    it('should categorize warnings by type', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const warnings = generateWarnings(assessment);

      const types = warnings.map((w) => w.type);
      expect(types).toContain('values_note');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 10. SOURCES LIST GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Sources List Generation', () => {
    it('should generate sources list with top sources', () => {
      const assessment = createMockAssessment('strong_consensus', { qualityStudies: 10 });
      const sources = generateSourcesList(assessment, 5);

      expect(sources.topSources.length).toBeLessThanOrEqual(5);
      expect(sources.totalSourcesExamined).toBeGreaterThan(0);
    });

    it('should prioritize higher-tier sources', () => {
      const assessment = createMockAssessment('strong_consensus');
      const sources = generateSourcesList(assessment, 3);

      // First sources should be meta-analyses and systematic reviews
      const tierLevels = sources.topSources.map((s) => s.tierLevel);
      expect(tierLevels[0]).toBe(1); // Tier 1 first
    });

    it('should include sources note when truncated', () => {
      const assessment = createMockAssessment('strong_consensus', { qualityStudies: 20 });
      const sources = generateSourcesList(assessment, 3);

      expect(sources.sourcesNote).toBeDefined();
      expect(sources.sourcesNote).toContain('Showing');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 11. HONESTY CHECKS
  // ───────────────────────────────────────────────────────────────
  describe('Honesty Checks', () => {
    it('should pass for properly generated strong_consensus output', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');
      const check = performHonestyCheck(assessment, output);

      expect(check.isHonest).toBe(true);
      expect(check.violations.length).toBe(0);
    });

    it('should pass for active_debate with debate section', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      const check = performHonestyCheck(assessment, output);

      expect(check.isHonest).toBe(true);
    });

    it('should fail if active_debate lacks debate section', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      // Manually remove debate section to simulate violation
      output.debateSection = undefined;
      const check = performHonestyCheck(assessment, output);

      expect(check.isHonest).toBe(false);
      expect(check.violations.some((v) => v.includes('debate'))).toBe(true);
    });

    it('should fail if values_question lacks values content', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const output = renderClaimOutput(assessment, 'Test claim');
      // Manually remove values content to simulate violation
      output.valuesContent = undefined;
      const check = performHonestyCheck(assessment, output);

      expect(check.isHonest).toBe(false);
      expect(check.violations.some((v) => v.includes('values'))).toBe(true);
    });

    it('should fail if insufficient_research lacks warnings', () => {
      const assessment = createMockAssessment('insufficient_research', { qualityStudies: 2 });
      const output = renderClaimOutput(assessment, 'Test claim');
      // Manually remove warnings to simulate violation
      output.warnings = [];
      const check = performHonestyCheck(assessment, output);

      expect(check.isHonest).toBe(false);
      expect(check.violations.some((v) => v.includes('caveats'))).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 12. RENDER CLAIM OUTPUT
  // ───────────────────────────────────────────────────────────────
  describe('Render Claim Output', () => {
    it('should render complete output for strong_consensus', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Vaccines are safe');

      expect(output.claimText).toBe('Vaccines are safe');
      expect(output.consensusLevel).toBe('strong_consensus');
      expect(output.header.emoji).toBe('✓');
      expect(output.evidenceSummary.qualityStudies).toBe(10);
      expect(output.topCitations.length).toBeGreaterThan(0);
    });

    it('should render complete output for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Social media harms teens');

      expect(output.consensusLevel).toBe('active_debate');
      expect(output.debateSection).toBeDefined();
      expect(output.debateSection?.isGenuineDebate).toBe(true);
    });

    it('should render complete output for values_question', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const output = renderClaimOutput(assessment, 'Abortion should be legal');

      expect(output.consensusLevel).toBe('values_question');
      expect(output.valuesContent).toBeDefined();
      expect(output.header.confidenceBadge.text).toBe('NOT EMPIRICAL');
    });

    it('should include metadata', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.assessedAt).toBeInstanceOf(Date);
      expect(output.domain).toBe('medicine');
      expect(output.claimType).toBe('causal');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 13. FORMAT-SPECIFIC OUTPUT: MARKDOWN
  // ───────────────────────────────────────────────────────────────
  describe('Markdown Output', () => {
    it('should generate valid markdown for strong_consensus', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');
      const markdown = generateMarkdownOutput(output);

      expect(markdown).toContain('## ✓');
      expect(markdown).toContain('**[HIGH CONFIDENCE]**');
      expect(markdown).toContain('> Test claim');
      expect(markdown).toContain('### Evidence Summary');
      expect(markdown).toContain('### Key Sources');
    });

    it('should include debate section in markdown for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      const markdown = generateMarkdownOutput(output);

      expect(markdown).toContain('### Scientific Debate');
      expect(markdown).toContain('Position A');
      expect(markdown).toContain('Position B');
      expect(markdown).toContain('**Why Experts Disagree:**');
    });

    it('should include values section in markdown for values_question', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const output = renderClaimOutput(assessment, 'Test claim');
      const markdown = generateMarkdownOutput(output);

      expect(markdown).toContain('### This is a Values Question');
      expect(markdown).toContain('**What research CAN inform:**');
      expect(markdown).toContain('**Values involved:**');
    });

    it('should include warnings section', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      const markdown = generateMarkdownOutput(output);

      expect(markdown).toContain('### Important Notes');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 14. FORMAT-SPECIFIC OUTPUT: HTML
  // ───────────────────────────────────────────────────────────────
  describe('HTML Output', () => {
    it('should generate valid HTML structure', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');
      const html = generateHtmlOutput(output);

      expect(html).toContain('<div class="consensus-output');
      expect(html).toContain('<header class="output-header">');
      expect(html).toContain('</div>');
    });

    it('should include consensus level class', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');
      const html = generateHtmlOutput(output);

      expect(html).toContain('consensus-strong_consensus');
    });

    it('should escape HTML in claim text', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test <script>alert("xss")</script>');
      const html = generateHtmlOutput(output);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should include debate section HTML for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      const html = generateHtmlOutput(output);

      expect(html).toContain('class="debate-section"');
      expect(html).toContain('class="position position-a"');
      expect(html).toContain('class="position position-b"');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 15. FORMAT-SPECIFIC OUTPUT: TEXT
  // ───────────────────────────────────────────────────────────────
  describe('Text Output', () => {
    it('should generate plain text output', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');
      const text = generateTextOutput(output);

      expect(text).toContain('✓ Research Clearly Shows');
      expect(text).toContain('[HIGH CONFIDENCE]');
      expect(text).toContain('Claim: Test claim');
      expect(text).toContain('EVIDENCE SUMMARY:');
    });

    it('should include debate in text for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      const text = generateTextOutput(output);

      expect(text).toContain('SCIENTIFIC DEBATE:');
      expect(text).toContain('Position A:');
      expect(text).toContain('Position B:');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 16. FORMAT-SPECIFIC OUTPUT: JSON
  // ───────────────────────────────────────────────────────────────
  describe('JSON Output', () => {
    it('should generate valid JSON', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');
      const json = generateJsonOutput(output);

      const parsed = JSON.parse(json);
      expect(parsed.claimText).toBe('Test claim');
      expect(parsed.consensusLevel).toBe('strong_consensus');
    });

    it('should include all required fields', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');
      const json = generateJsonOutput(output);

      const parsed = JSON.parse(json);
      expect(parsed.header).toBeDefined();
      expect(parsed.evidenceSummary).toBeDefined();
      expect(parsed.warnings).toBeDefined();
      expect(parsed.debateSection).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 17. FULL OUTPUT GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Full Output Generation (generateOutput)', () => {
    it('should generate complete output with metadata', () => {
      const assessment = createMockAssessment('strong_consensus');
      const result = generateOutput(assessment, 'Test claim', { format: 'markdown' });

      expect(result.format).toBe('markdown');
      expect(result.content).toBeTruthy();
      expect(result.rendered).toBeDefined();
      expect(result.metadata.consensusLevel).toBe('strong_consensus');
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate HTML output when requested', () => {
      const assessment = createMockAssessment('strong_consensus');
      const result = generateOutput(assessment, 'Test claim', { format: 'html' });

      expect(result.format).toBe('html');
      expect(result.content).toContain('<div');
    });

    it('should generate JSON output when requested', () => {
      const assessment = createMockAssessment('strong_consensus');
      const result = generateOutput(assessment, 'Test claim', { format: 'json' });

      expect(result.format).toBe('json');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it('should generate text output when requested', () => {
      const assessment = createMockAssessment('strong_consensus');
      const result = generateOutput(assessment, 'Test claim', { format: 'text' });

      expect(result.format).toBe('text');
      expect(result.content).not.toContain('<div');
      expect(result.content).not.toContain('##');
    });

    it('should default to markdown format', () => {
      const assessment = createMockAssessment('strong_consensus');
      const result = generateOutput(assessment, 'Test claim');

      expect(result.format).toBe('markdown');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 18. HONEST FRAMING BY CONSENSUS LEVEL
  // ───────────────────────────────────────────────────────────────
  describe('Honest Framing by Consensus Level', () => {
    it('should frame strong_consensus with certainty', () => {
      const assessment = createMockAssessment('strong_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.header.headline).toBe('Research Clearly Shows');
      expect(output.framingSentence).toContain('clearly');
    });

    it('should frame moderate_consensus with appropriate hedging', () => {
      const assessment = createMockAssessment('moderate_consensus');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.header.headline).toBe('Most Research Suggests');
      expect(output.framingSentence).toContain('Most');
    });

    it('should frame active_debate as contested', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.header.headline).toBe('Experts Disagree');
      expect(output.header.confidenceBadge.text).toBe('CONTESTED');
    });

    it('should frame emerging_research as preliminary', () => {
      const assessment = createMockAssessment('emerging_research');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.header.headline).toBe('Early Research Suggests');
      expect(output.header.confidenceBadge.text).toBe('PRELIMINARY');
    });

    it('should frame insufficient_research as unknown', () => {
      const assessment = createMockAssessment('insufficient_research', { qualityStudies: 2 });
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.header.headline).toBe('Insufficient Research');
      expect(output.header.confidenceBadge.text).toBe('UNKNOWN');
    });

    it('should frame values_question as non-empirical', () => {
      const assessment = createMockAssessment('values_question', { claimType: 'values' });
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.header.headline).toBe('Values Question');
      expect(output.header.confidenceBadge.text).toBe('NOT EMPIRICAL');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 19. NEVER HIDE LEGITIMATE DEBATE
  // ───────────────────────────────────────────────────────────────
  describe('Never Hide Legitimate Debate', () => {
    it('should always include debate section for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Social media harms teens');

      expect(output.debateSection).toBeDefined();
      expect(output.debateSection?.isGenuineDebate).toBe(true);
    });

    it('should present both positions fairly', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.debateSection?.positionA.label).toBeDefined();
      expect(output.debateSection?.positionB.label).toBeDefined();
      expect(output.debateSection?.positionA.mainArguments.length).toBeGreaterThan(0);
      expect(output.debateSection?.positionB.mainArguments.length).toBeGreaterThan(0);
    });

    it('should explain reasons for disagreement', () => {
      const assessment = createMockAssessment('active_debate');
      const output = renderClaimOutput(assessment, 'Test claim');

      expect(output.debateSection?.reasonsForDisagreement.length).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 20. NEVER OVERSTATE CERTAINTY
  // ───────────────────────────────────────────────────────────────
  describe('Never Overstate Certainty', () => {
    it('should not use certainty language for active_debate', () => {
      const assessment = createMockAssessment('active_debate');
      const output = generateOutput(assessment, 'Test claim', { format: 'text' });

      expect(containsOverclaimingLanguage(output.content)).toBe(false);
    });

    it('should not use certainty language for emerging_research', () => {
      const assessment = createMockAssessment('emerging_research');
      const output = generateOutput(assessment, 'Test claim', { format: 'text' });

      expect(containsOverclaimingLanguage(output.content)).toBe(false);
    });

    it('should not use certainty language for insufficient_research', () => {
      const assessment = createMockAssessment('insufficient_research', { qualityStudies: 2 });
      const output = generateOutput(assessment, 'Test claim', { format: 'text' });

      expect(containsOverclaimingLanguage(output.content)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 21. REAL-WORLD EXAMPLE TEST CASES
  // ───────────────────────────────────────────────────────────────
  describe('Real-World Example Test Cases', () => {
    it('should handle climate change claim (strong consensus)', () => {
      const assessment = createMockAssessment('strong_consensus', {
        domain: 'climate',
        qualityStudies: 100,
        supportRatio: 0.97,
      });
      const output = renderClaimOutput(assessment, 'Human activities cause global warming');

      expect(output.consensusLevel).toBe('strong_consensus');
      expect(output.header.emoji).toBe('✓');
      expect(output.warnings.length).toBeLessThanOrEqual(2);
    });

    it('should handle death penalty deterrence claim (active debate)', () => {
      const assessment = createMockAssessment('active_debate', {
        domain: 'criminology',
        supportRatio: 0.5,
      });
      const output = renderClaimOutput(assessment, 'Death penalty deters crime');

      expect(output.consensusLevel).toBe('active_debate');
      expect(output.debateSection).toBeDefined();
      expect(output.header.headline).toBe('Experts Disagree');
    });

    it('should handle abortion ethics claim (values question)', () => {
      const assessment = createMockAssessment('values_question', {
        claimType: 'values',
        domain: 'general',
      });
      const output = renderClaimOutput(assessment, 'Abortion should be legal');

      expect(output.consensusLevel).toBe('values_question');
      expect(output.valuesContent).toBeDefined();
      expect(output.header.confidenceBadge.text).toBe('NOT EMPIRICAL');
    });

    it('should handle new supplement claim (insufficient research)', () => {
      const assessment = createMockAssessment('insufficient_research', {
        domain: 'nutrition',
        qualityStudies: 2,
      });
      const output = renderClaimOutput(assessment, 'Supplement X improves memory');

      expect(output.consensusLevel).toBe('insufficient_research');
      expect(output.warnings.some((w) => w.severity === 'critical')).toBe(true);
    });
  });
});
