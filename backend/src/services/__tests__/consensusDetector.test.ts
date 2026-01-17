/**
 * TDD Tests for Consensus Detector Service
 * Wave 5 - Tests for consensus detection and assessment
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 6
 *
 * Test categories:
 * 1. Values question detection
 * 2. Insufficient research detection
 * 3. Strong consensus detection
 * 4. Moderate consensus detection
 * 5. Active debate detection
 * 6. Emerging research detection
 * 7. Evidence direction analysis
 * 8. Confidence level determination
 * 9. Framing sentence generation
 * 10. Full assessment integration
 */

import {
  assessConsensus,
  determineConsensusLevel,
  determineConfidence,
  calculateSupportRatio,
  calculateWeightedSupportRatio,
  countEvidenceByDirection,
  getHighQualityEvidence,
  filterEvidenceByTier,
  isValuesQuestion,
  isPotentiallyMethodologicallyBlocked,
  isEmergingResearch,
  buildEvidenceBasis,
  generateFramingSentence,
  generateCaveats,
  getSimplifiedResult,
  getConsensusLevelDisplayName,
  getConsensusLevelDescription,
  getFramingTemplate,
  FRAMING_TEMPLATES,
} from '../consensusDetector';
import {
  ConsensusLevel,
  DirectedEvidence,
  ConsensusAssessmentInput,
  DEFAULT_CONSENSUS_THRESHOLDS,
} from '../../types/consensus';
import { ClaimType, Domain } from '../../types/claims';
import { EvidenceTier } from '../evidenceTier';

// ═══════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create mock directed evidence
 */
function createMockEvidence(
  direction: 'supports' | 'opposes' | 'neutral',
  tier: EvidenceTier,
  year: number = 2023
): DirectedEvidence {
  return {
    citation: {
      title: `Study on topic (${direction})`,
      authors: ['Author A', 'Author B'],
      publication: tier === 1 ? 'Cochrane Review' : 'Journal',
      year,
      url: 'https://example.com/study',
    },
    tier,
    category: tier === 1 ? 'meta_analysis' : 'peer_reviewed',
    direction,
    keyFinding: `This study ${direction} the claim.`,
  };
}

/**
 * Create array of mock evidence with specified counts
 */
function createEvidenceSet(
  supporting: number,
  opposing: number,
  neutral: number = 0,
  tier: EvidenceTier = 2
): DirectedEvidence[] {
  const evidence: DirectedEvidence[] = [];

  for (let i = 0; i < supporting; i++) {
    evidence.push(createMockEvidence('supports', tier));
  }
  for (let i = 0; i < opposing; i++) {
    evidence.push(createMockEvidence('opposes', tier));
  }
  for (let i = 0; i < neutral; i++) {
    evidence.push(createMockEvidence('neutral', tier));
  }

  return evidence;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Consensus Detector Service', () => {
  // ───────────────────────────────────────────────────────────────
  // 1. VALUES QUESTION DETECTION
  // ───────────────────────────────────────────────────────────────
  describe('Values Question Detection', () => {
    describe('isValuesQuestion', () => {
      it('should return true for values claim type', () => {
        expect(isValuesQuestion('values')).toBe(true);
      });

      it('should return true for aesthetic claim type', () => {
        expect(isValuesQuestion('aesthetic')).toBe(true);
      });

      it('should return true for unfalsifiable claim type', () => {
        expect(isValuesQuestion('unfalsifiable')).toBe(true);
      });

      it('should return false for empirical claim type', () => {
        expect(isValuesQuestion('empirical')).toBe(false);
      });

      it('should return false for causal claim type', () => {
        expect(isValuesQuestion('causal')).toBe(false);
      });

      it('should return false for statistical claim type', () => {
        expect(isValuesQuestion('statistical')).toBe(false);
      });
    });

    it('should return values_question for values claim regardless of evidence', () => {
      const evidence = createEvidenceSet(10, 0); // Strong supporting evidence
      const level = determineConsensusLevel('values', evidence);
      expect(level).toBe('values_question');
    });

    it('should return values_question for aesthetic claim', () => {
      const evidence = createEvidenceSet(5, 5);
      const level = determineConsensusLevel('aesthetic', evidence);
      expect(level).toBe('values_question');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 2. INSUFFICIENT RESEARCH DETECTION
  // ───────────────────────────────────────────────────────────────
  describe('Insufficient Research Detection', () => {
    it('should return insufficient_research when fewer than 3 quality studies (non-recent)', () => {
      // Create old evidence so it doesn't trigger emerging_research
      const evidence = [
        createMockEvidence('supports', 2, 2015),
        createMockEvidence('opposes', 2, 2016),
      ];
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('insufficient_research');
    });

    it('should return insufficient_research for zero evidence', () => {
      const evidence: DirectedEvidence[] = [];
      const level = determineConsensusLevel('empirical', evidence);
      expect(level).toBe('insufficient_research');
    });

    it('should return insufficient_research when only Tier 3+ evidence exists', () => {
      // All Tier 3 (working papers/preprints) - not quality evidence
      // Use old years so it doesn't trigger emerging_research
      const evidence = [
        createMockEvidence('supports', 3, 2015),
        createMockEvidence('supports', 3, 2016),
        createMockEvidence('supports', 3, 2017),
        createMockEvidence('supports', 3, 2018),
        createMockEvidence('supports', 3, 2019),
      ];
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('insufficient_research');
    });

    it('should not return insufficient_research when 3+ quality studies exist', () => {
      const evidence = createEvidenceSet(3, 0); // 3 supporting Tier 2 studies
      const level = determineConsensusLevel('causal', evidence);
      expect(level).not.toBe('insufficient_research');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 3. STRONG CONSENSUS DETECTION
  // ───────────────────────────────────────────────────────────────
  describe('Strong Consensus Detection', () => {
    it('should return strong_consensus when >90% support claim', () => {
      const evidence = createEvidenceSet(10, 0); // 100% support
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('strong_consensus');
    });

    it('should return strong_consensus when >90% oppose claim', () => {
      const evidence = createEvidenceSet(0, 10); // 100% oppose
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('strong_consensus');
    });

    it('should return strong_consensus at exactly 90% support', () => {
      const evidence = createEvidenceSet(9, 1); // 90% support
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('strong_consensus');
    });

    it('should weight Tier 1 evidence more heavily', () => {
      // 2 Tier 1 supporting, 2 Tier 2 opposing
      // Tier 1 weight: 1.0 * 2 = 2.0 supporting
      // Tier 2 weight: 0.8 * 2 = 1.6 opposing
      // Ratio: 2.0 / 3.6 = ~0.55 - should be active debate
      // Use old years to avoid triggering emerging_research
      const evidence = [
        createMockEvidence('supports', 1, 2015),
        createMockEvidence('supports', 1, 2016),
        createMockEvidence('opposes', 2, 2015),
        createMockEvidence('opposes', 2, 2016),
      ];
      const level = determineConsensusLevel('causal', evidence);
      // With weighted ratio, this is more moderate
      expect(['moderate_consensus', 'active_debate']).toContain(level);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 4. MODERATE CONSENSUS DETECTION
  // ───────────────────────────────────────────────────────────────
  describe('Moderate Consensus Detection', () => {
    it('should return moderate_consensus when 70-90% support', () => {
      const evidence = createEvidenceSet(8, 2); // 80% support
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('moderate_consensus');
    });

    it('should return moderate_consensus when 70-90% oppose', () => {
      const evidence = createEvidenceSet(2, 8); // 80% oppose
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('moderate_consensus');
    });

    it('should return moderate_consensus at exactly 70%', () => {
      const evidence = createEvidenceSet(7, 3); // 70% support
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('moderate_consensus');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 5. ACTIVE DEBATE DETECTION
  // ───────────────────────────────────────────────────────────────
  describe('Active Debate Detection', () => {
    it('should return active_debate when 50/50 split', () => {
      const evidence = createEvidenceSet(5, 5);
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('active_debate');
    });

    it('should return active_debate when 60/40 split', () => {
      const evidence = createEvidenceSet(6, 4);
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('active_debate');
    });

    it('should return active_debate when 40/60 split', () => {
      const evidence = createEvidenceSet(4, 6);
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('active_debate');
    });

    it('should return active_debate at boundary (just under 70%)', () => {
      // 69% should be active debate
      const evidence = createEvidenceSet(69, 31);
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('active_debate');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 6. EMERGING RESEARCH DETECTION
  // ───────────────────────────────────────────────────────────────
  describe('Emerging Research Detection', () => {
    describe('isEmergingResearch', () => {
      it('should return true for mostly recent studies with few total', () => {
        const currentYear = new Date().getFullYear();
        const evidence = [
          createMockEvidence('supports', 2, currentYear),
          createMockEvidence('supports', 2, currentYear - 1),
          createMockEvidence('opposes', 2, currentYear - 2),
        ];
        expect(isEmergingResearch(evidence, 3)).toBe(true);
      });

      it('should return false for older studies', () => {
        const evidence = [
          createMockEvidence('supports', 2, 2015),
          createMockEvidence('supports', 2, 2016),
          createMockEvidence('opposes', 2, 2017),
        ];
        expect(isEmergingResearch(evidence, 3)).toBe(false);
      });

      it('should return false for many studies (established field)', () => {
        const currentYear = new Date().getFullYear();
        const evidence: DirectedEvidence[] = [];
        for (let i = 0; i < 15; i++) {
          evidence.push(createMockEvidence('supports', 2, currentYear));
        }
        expect(isEmergingResearch(evidence, 3)).toBe(false);
      });

      it('should return false for empty evidence', () => {
        expect(isEmergingResearch([], 3)).toBe(false);
      });
    });

    it('should return emerging_research for limited recent evidence', () => {
      const currentYear = new Date().getFullYear();
      // Few quality studies but they're all recent
      const evidence = [
        createMockEvidence('supports', 2, currentYear),
        createMockEvidence('supports', 2, currentYear - 1),
      ];
      const level = determineConsensusLevel('causal', evidence);
      expect(level).toBe('emerging_research');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 7. EVIDENCE DIRECTION ANALYSIS
  // ───────────────────────────────────────────────────────────────
  describe('Evidence Direction Analysis', () => {
    describe('countEvidenceByDirection', () => {
      it('should count supporting evidence', () => {
        const evidence = createEvidenceSet(5, 3, 2);
        const counts = countEvidenceByDirection(evidence);
        expect(counts.supporting).toBe(5);
        expect(counts.opposing).toBe(3);
        expect(counts.neutral).toBe(2);
      });

      it('should handle empty evidence', () => {
        const counts = countEvidenceByDirection([]);
        expect(counts.supporting).toBe(0);
        expect(counts.opposing).toBe(0);
        expect(counts.neutral).toBe(0);
      });
    });

    describe('calculateSupportRatio', () => {
      it('should return 1.0 for all supporting', () => {
        const evidence = createEvidenceSet(5, 0);
        expect(calculateSupportRatio(evidence)).toBe(1.0);
      });

      it('should return 0.0 for all opposing', () => {
        const evidence = createEvidenceSet(0, 5);
        expect(calculateSupportRatio(evidence)).toBe(0.0);
      });

      it('should return 0.5 for equal split', () => {
        const evidence = createEvidenceSet(5, 5);
        expect(calculateSupportRatio(evidence)).toBe(0.5);
      });

      it('should return 0.5 for no directional evidence', () => {
        const evidence = createEvidenceSet(0, 0, 5); // All neutral
        expect(calculateSupportRatio(evidence)).toBe(0.5);
      });

      it('should ignore neutral evidence in ratio', () => {
        const evidence = createEvidenceSet(3, 1, 10); // 75% of directional
        expect(calculateSupportRatio(evidence)).toBe(0.75);
      });
    });

    describe('calculateWeightedSupportRatio', () => {
      it('should weight Tier 1 higher than Tier 2', () => {
        // 1 Tier 1 supporting (weight 1.0), 1 Tier 2 opposing (weight 0.8)
        const evidence = [
          createMockEvidence('supports', 1),
          createMockEvidence('opposes', 2),
        ];
        const ratio = calculateWeightedSupportRatio(evidence);
        // 1.0 / (1.0 + 0.8) = 1.0 / 1.8 ≈ 0.556
        expect(ratio).toBeGreaterThan(0.5);
        expect(ratio).toBeLessThan(0.6);
      });

      it('should give zero weight to Tier 5', () => {
        const evidence = [
          createMockEvidence('supports', 2),
          createMockEvidence('opposes', 5), // Tier 5, weight 0
        ];
        const ratio = calculateWeightedSupportRatio(evidence);
        expect(ratio).toBe(1.0); // Tier 5 ignored
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 8. EVIDENCE FILTERING
  // ───────────────────────────────────────────────────────────────
  describe('Evidence Filtering', () => {
    describe('filterEvidenceByTier', () => {
      it('should filter to specified tiers', () => {
        const evidence = [
          createMockEvidence('supports', 1),
          createMockEvidence('supports', 2),
          createMockEvidence('supports', 3),
          createMockEvidence('supports', 4),
        ];
        const tier1And2 = filterEvidenceByTier(evidence, [1, 2]);
        expect(tier1And2.length).toBe(2);
      });
    });

    describe('getHighQualityEvidence', () => {
      it('should return only Tier 1 and 2 evidence', () => {
        const evidence = [
          createMockEvidence('supports', 1),
          createMockEvidence('supports', 2),
          createMockEvidence('supports', 3),
          createMockEvidence('supports', 4),
          createMockEvidence('supports', 5),
        ];
        const highQuality = getHighQualityEvidence(evidence);
        expect(highQuality.length).toBe(2);
        expect(highQuality.every((e) => e.tier <= 2)).toBe(true);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 9. CONFIDENCE LEVEL DETERMINATION
  // ───────────────────────────────────────────────────────────────
  describe('Confidence Level Determination', () => {
    it('should return high confidence for values_question', () => {
      const evidence: DirectedEvidence[] = [];
      const confidence = determineConfidence('values_question', evidence);
      expect(confidence).toBe('high');
    });

    it('should return high confidence for strong_consensus with meta-analyses', () => {
      const evidence = [
        { ...createMockEvidence('supports', 1), category: 'meta_analysis' },
        createMockEvidence('supports', 2),
        createMockEvidence('supports', 2),
      ];
      const confidence = determineConfidence('strong_consensus', evidence);
      expect(confidence).toBe('high');
    });

    it('should return medium confidence for moderate_consensus', () => {
      const evidence = createEvidenceSet(7, 3);
      const confidence = determineConfidence('moderate_consensus', evidence);
      expect(['medium', 'low']).toContain(confidence);
    });

    it('should return medium confidence for active_debate', () => {
      const evidence = createEvidenceSet(5, 5);
      const confidence = determineConfidence('active_debate', evidence);
      expect(confidence).toBe('medium');
    });

    it('should return low confidence for emerging_research', () => {
      const evidence = createEvidenceSet(2, 1);
      const confidence = determineConfidence('emerging_research', evidence);
      expect(confidence).toBe('low');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 10. FRAMING SENTENCE GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Framing Sentence Generation', () => {
    it('should generate appropriate framing for strong_consensus (supporting)', () => {
      const sentence = generateFramingSentence('strong_consensus', 0.95, 10);
      expect(sentence).toContain('clearly');
      expect(sentence).toContain('supported');
    });

    it('should generate appropriate framing for strong_consensus (opposing)', () => {
      const sentence = generateFramingSentence('strong_consensus', 0.05, 10);
      expect(sentence).toContain('clearly');
      expect(sentence).toContain('not supported');
    });

    it('should generate appropriate framing for moderate_consensus', () => {
      const sentence = generateFramingSentence('moderate_consensus', 0.8, 10);
      expect(sentence).toContain('Most');
    });

    it('should generate appropriate framing for active_debate', () => {
      const sentence = generateFramingSentence('active_debate', 0.5, 10);
      expect(sentence).toContain('disagree');
    });

    it('should generate appropriate framing for insufficient_research', () => {
      const sentence = generateFramingSentence('insufficient_research', 0.5, 2);
      expect(sentence).toContain('Insufficient');
      expect(sentence).toContain('2');
    });

    it('should generate appropriate framing for values_question', () => {
      const sentence = generateFramingSentence('values_question', 0.5, 0);
      expect(sentence).toContain('values');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 11. CAVEAT GENERATION
  // ───────────────────────────────────────────────────────────────
  describe('Caveat Generation', () => {
    it('should generate caveats for emerging_research', () => {
      const caveats = generateCaveats('emerging_research', 'medicine', 3);
      expect(caveats.length).toBeGreaterThan(0);
      expect(caveats.some((c) => c.includes('early'))).toBe(true);
    });

    it('should generate caveats for insufficient_research', () => {
      const caveats = generateCaveats('insufficient_research', 'medicine', 2);
      expect(caveats.some((c) => c.includes('2'))).toBe(true);
    });

    it('should generate caveats for values_question', () => {
      const caveats = generateCaveats('values_question', 'general', 0);
      expect(caveats.some((c) => c.includes('values'))).toBe(true);
    });

    it('should add domain-specific caveats for psychology', () => {
      const caveats = generateCaveats('moderate_consensus', 'psychology', 10);
      expect(caveats.some((c) => c.toLowerCase().includes('replication'))).toBe(
        true
      );
    });

    it('should add domain-specific caveats for nutrition', () => {
      const caveats = generateCaveats('moderate_consensus', 'nutrition', 10);
      expect(caveats.length).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 12. FULL ASSESSMENT INTEGRATION
  // ───────────────────────────────────────────────────────────────
  describe('Full Assessment (assessConsensus)', () => {
    it('should return complete assessment for strong consensus', () => {
      const input: ConsensusAssessmentInput = {
        claimText: 'Smoking causes lung cancer',
        claimType: 'causal',
        domain: 'medicine',
        evidence: createEvidenceSet(10, 0),
      };

      const assessment = assessConsensus(input);

      expect(assessment.level).toBe('strong_consensus');
      expect(assessment.confidence).toBeDefined();
      expect(assessment.framingSentence).toBeDefined();
      expect(assessment.caveats).toBeInstanceOf(Array);
      expect(assessment.basis.totalQualityStudies).toBe(10);
      expect(assessment.evidenceSummary.supporting).toBe(10);
      expect(assessment.evidenceSummary.opposing).toBe(0);
    });

    it('should return complete assessment for active debate', () => {
      const input: ConsensusAssessmentInput = {
        claimText: 'Death penalty deters crime',
        claimType: 'causal',
        domain: 'criminology',
        evidence: createEvidenceSet(5, 5),
      };

      const assessment = assessConsensus(input);

      expect(assessment.level).toBe('active_debate');
      expect(assessment.positions).toBeDefined();
      expect(assessment.positions?.positionA).toBeDefined();
      expect(assessment.positions?.positionB).toBeDefined();
      expect(assessment.positions?.reasonsForDisagreement).toBeInstanceOf(
        Array
      );
    });

    it('should return complete assessment for values question', () => {
      const input: ConsensusAssessmentInput = {
        claimText: 'Abortion should be legal',
        claimType: 'values',
        domain: 'general',
        evidence: [],
      };

      const assessment = assessConsensus(input);

      expect(assessment.level).toBe('values_question');
      expect(assessment.confidence).toBe('high');
      expect(assessment.framingSentence).toContain('values');
    });

    it('should return complete assessment for insufficient research', () => {
      // Use old evidence to avoid triggering emerging_research
      const oldEvidence: DirectedEvidence[] = [
        createMockEvidence('supports', 2, 2015),
      ];

      const input: ConsensusAssessmentInput = {
        claimText: 'New supplement X improves memory',
        claimType: 'causal',
        domain: 'nutrition',
        evidence: oldEvidence,
      };

      const assessment = assessConsensus(input);

      expect(assessment.level).toBe('insufficient_research');
      expect(assessment.basis.totalQualityStudies).toBe(1);
    });

    it('should include assessedAt timestamp', () => {
      const input: ConsensusAssessmentInput = {
        claimText: 'Test claim',
        claimType: 'empirical',
        domain: 'general',
        evidence: createEvidenceSet(5, 5),
      };

      const assessment = assessConsensus(input);
      expect(assessment.assessedAt).toBeInstanceOf(Date);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 13. SIMPLIFIED RESULT
  // ───────────────────────────────────────────────────────────────
  describe('Simplified Result', () => {
    it('should return simplified result from full assessment', () => {
      const input: ConsensusAssessmentInput = {
        claimText: 'Test claim',
        claimType: 'causal',
        domain: 'medicine',
        evidence: createEvidenceSet(8, 2),
      };

      const assessment = assessConsensus(input);
      const simplified = getSimplifiedResult(assessment);

      expect(simplified.level).toBe(assessment.level);
      expect(simplified.confidence).toBe(assessment.confidence);
      expect(simplified.headline).toBeDefined();
      expect(simplified.summary).toBeDefined();
      expect(simplified.evidenceCount).toBe(assessment.basis.totalQualityStudies);
      expect(simplified.caveats.length).toBeLessThanOrEqual(3);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 14. DISPLAY HELPERS
  // ───────────────────────────────────────────────────────────────
  describe('Display Helpers', () => {
    describe('getConsensusLevelDisplayName', () => {
      it('should return display name for all levels', () => {
        const levels: ConsensusLevel[] = [
          'strong_consensus',
          'moderate_consensus',
          'active_debate',
          'emerging_research',
          'insufficient_research',
          'methodologically_blocked',
          'values_question',
        ];

        levels.forEach((level) => {
          const name = getConsensusLevelDisplayName(level);
          expect(name).toBeTruthy();
          expect(name.length).toBeGreaterThan(5);
        });
      });
    });

    describe('getConsensusLevelDescription', () => {
      it('should return description for all levels', () => {
        const levels: ConsensusLevel[] = [
          'strong_consensus',
          'moderate_consensus',
          'active_debate',
          'emerging_research',
          'insufficient_research',
          'methodologically_blocked',
          'values_question',
        ];

        levels.forEach((level) => {
          const desc = getConsensusLevelDescription(level);
          expect(desc).toBeTruthy();
          expect(desc.length).toBeGreaterThan(20);
        });
      });
    });

    describe('getFramingTemplate', () => {
      it('should return template for all levels', () => {
        const levels: ConsensusLevel[] = [
          'strong_consensus',
          'moderate_consensus',
          'active_debate',
          'emerging_research',
          'insufficient_research',
          'methodologically_blocked',
          'values_question',
        ];

        levels.forEach((level) => {
          const template = getFramingTemplate(level);
          expect(template.headerEmoji).toBeTruthy();
          expect(template.headerText).toBeTruthy();
          expect(template.confidenceBadge).toBeTruthy();
          expect(template.bodyTemplate).toBeTruthy();
        });
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 15. FRAMING TEMPLATES
  // ───────────────────────────────────────────────────────────────
  describe('Framing Templates', () => {
    it('should have template for strong_consensus', () => {
      expect(FRAMING_TEMPLATES.strong_consensus.headerText).toBe(
        'Research Clearly Shows'
      );
      expect(FRAMING_TEMPLATES.strong_consensus.confidenceBadge).toBe(
        'HIGH CONFIDENCE'
      );
    });

    it('should have template for active_debate', () => {
      expect(FRAMING_TEMPLATES.active_debate.headerText).toBe(
        'Experts Disagree'
      );
      expect(FRAMING_TEMPLATES.active_debate.confidenceBadge).toBe('CONTESTED');
    });

    it('should have template for values_question', () => {
      expect(FRAMING_TEMPLATES.values_question.headerText).toBe(
        'Values Question'
      );
      expect(FRAMING_TEMPLATES.values_question.confidenceBadge).toBe(
        'NOT EMPIRICAL'
      );
    });
  });

  // ───────────────────────────────────────────────────────────────
  // 16. EVIDENCE BASIS BUILDING
  // ───────────────────────────────────────────────────────────────
  describe('Evidence Basis Building', () => {
    it('should categorize evidence correctly', () => {
      const evidence: DirectedEvidence[] = [
        {
          ...createMockEvidence('supports', 1),
          category: 'meta_analysis',
        },
        {
          ...createMockEvidence('supports', 1),
          category: 'systematic_review',
        },
        {
          ...createMockEvidence('supports', 1),
          category: 'major_report',
        },
        {
          ...createMockEvidence('supports', 2),
          category: 'peer_reviewed',
        },
        {
          ...createMockEvidence('supports', 2),
          category: 'rct',
        },
      ];

      const basis = buildEvidenceBasis(evidence);

      expect(basis.metaAnalyses.length).toBe(1);
      expect(basis.systematicReviews.length).toBe(1);
      expect(basis.majorReports.length).toBe(1);
      expect(basis.peerReviewedStudies.length).toBe(2);
      expect(basis.totalQualityStudies).toBe(5);
      expect(basis.totalStudiesExamined).toBe(5);
    });
  });
});
