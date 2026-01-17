/**
 * Integration Tests for Consensus Detector Service
 * Wave 5 - Tests against realistic claim scenarios
 *
 * These tests simulate real-world claims to verify the consensus
 * detection system works correctly in practice.
 *
 * Test scenarios from EXPERT_EVALUATION_SPEC.md:
 * - Climate change (strong consensus)
 * - Vaccine safety (strong consensus)
 * - Death penalty deterrence (active debate)
 * - Social media mental health (active debate)
 * - Abortion ethics (values question)
 * - New supplement claims (insufficient research)
 */

import {
  assessConsensus,
  determineConsensusLevel,
  getSimplifiedResult,
  getConsensusLevelDisplayName,
} from '../consensusDetector';
import {
  ConsensusAssessmentInput,
  DirectedEvidence,
  KNOWN_CONSENSUS_TOPICS,
} from '../../types/consensus';
import { Domain, ClaimType } from '../../types/claims';
import { EvidenceTier } from '../evidenceTier';

// ═══════════════════════════════════════════════════════════════
// TEST FIXTURES - REALISTIC CLAIM SCENARIOS
// ═══════════════════════════════════════════════════════════════

/**
 * Helper to create realistic evidence
 */
function createEvidence(
  title: string,
  authors: string[],
  publication: string,
  year: number,
  tier: EvidenceTier,
  category: string,
  direction: 'supports' | 'opposes' | 'neutral',
  finding: string
): DirectedEvidence {
  return {
    citation: {
      title,
      authors,
      publication,
      year,
      url: `https://doi.org/10.1000/${year}`,
      finding,
    },
    tier,
    category,
    direction,
    keyFinding: finding,
  };
}

/**
 * Climate Change Evidence (Strong Consensus)
 */
const CLIMATE_CHANGE_EVIDENCE: DirectedEvidence[] = [
  createEvidence(
    'IPCC Sixth Assessment Report: Climate Change 2021',
    ['IPCC Working Group I'],
    'IPCC',
    2021,
    1,
    'major_report',
    'supports',
    'It is unequivocal that human influence has warmed the atmosphere, ocean and land.'
  ),
  createEvidence(
    'Quantifying the consensus on anthropogenic global warming',
    ['Cook, J.', 'et al.'],
    'Environmental Research Letters',
    2013,
    1,
    'meta_analysis',
    'supports',
    '97.1% of climate scientists agree on human-caused warming.'
  ),
  createEvidence(
    'Discrepancy in scientific authority and media visibility',
    ['Petersen, A.M.', 'et al.'],
    'Nature Communications',
    2019,
    2,
    'peer_reviewed',
    'supports',
    'Expert consensus on anthropogenic climate change exceeds 99%.'
  ),
  createEvidence(
    'Attribution of Extreme Weather Events',
    ['NAS Committee'],
    'National Academies Press',
    2016,
    1,
    'major_report',
    'supports',
    'Attribution science confirms human influence on extreme weather.'
  ),
  createEvidence(
    'Global temperature reconstruction',
    ['Mann, M.E.', 'et al.'],
    'Nature',
    2008,
    2,
    'peer_reviewed',
    'supports',
    'Recent warming is unprecedented in past 1,300 years.'
  ),
  createEvidence(
    'Ocean heat content increases',
    ['Cheng, L.', 'et al.'],
    'Science',
    2020,
    2,
    'peer_reviewed',
    'supports',
    'Ocean heat content at record highs, consistent with greenhouse forcing.'
  ),
  createEvidence(
    'Glacial retreat worldwide',
    ['Zemp, M.', 'et al.'],
    'Nature',
    2019,
    2,
    'peer_reviewed',
    'supports',
    'Glacier mass loss accelerating beyond natural variability.'
  ),
  createEvidence(
    'Sea level rise observations',
    ['NOAA'],
    'NOAA Technical Report',
    2022,
    1,
    'major_report',
    'supports',
    'Sea level rise accelerating consistent with climate models.'
  ),
  createEvidence(
    'Carbon isotope analysis',
    ['Rubino, M.', 'et al.'],
    'Science',
    2013,
    2,
    'peer_reviewed',
    'supports',
    'Carbon isotope ratios confirm fossil fuel origin of atmospheric CO2.'
  ),
  createEvidence(
    'Climate model validation',
    ['Hausfather, Z.', 'et al.'],
    'Geophysical Research Letters',
    2020,
    2,
    'peer_reviewed',
    'supports',
    'Climate models have accurately predicted warming for 50 years.'
  ),
];

/**
 * Vaccine Safety Evidence (Strong Consensus)
 */
const VACCINE_SAFETY_EVIDENCE: DirectedEvidence[] = [
  createEvidence(
    'MMR vaccine and autism: systematic review and meta-analysis',
    ['Taylor, L.E.', 'et al.'],
    'Vaccine',
    2014,
    1,
    'meta_analysis',
    'opposes', // Opposes the claim that vaccines cause autism
    'No relationship between vaccination and autism or ASD.'
  ),
  createEvidence(
    'Vaccines are not associated with autism: meta-analysis',
    ['DeStefano, F.', 'et al.'],
    'Vaccine',
    2019,
    1,
    'meta_analysis',
    'opposes',
    'Large-scale studies find no link between vaccines and autism.'
  ),
  createEvidence(
    'MMR vaccination and autism in Danish cohort',
    ['Hviid, A.', 'et al.'],
    'Annals of Internal Medicine',
    2019,
    2,
    'peer_reviewed',
    'opposes',
    'Study of 657,461 children found no increased risk of autism.'
  ),
  createEvidence(
    'Vaccine safety: Cochrane systematic reviews',
    ['Demicheli, V.', 'et al.'],
    'Cochrane Database',
    2012,
    1,
    'systematic_review',
    'opposes',
    'No credible evidence of involvement in autism.'
  ),
  createEvidence(
    'IOM Review: Adverse Effects of Vaccines',
    ['Institute of Medicine'],
    'National Academies Press',
    2011,
    1,
    'major_report',
    'opposes',
    'Evidence convincingly supports a rejection of a causal link.'
  ),
  createEvidence(
    'Global vaccine safety: WHO review',
    ['WHO Global Advisory Committee'],
    'WHO',
    2020,
    1,
    'major_report',
    'opposes',
    'No evidence supports autism-vaccine connection.'
  ),
  createEvidence(
    'Japanese MMR vaccine withdrawal study',
    ['Honda, H.', 'et al.'],
    'Journal of Child Psychology and Psychiatry',
    2005,
    2,
    'peer_reviewed',
    'opposes',
    'Autism rates continued rising after MMR withdrawal.'
  ),
  createEvidence(
    'California vaccination and autism rates',
    ['Schechter, R.', 'Grether, J.K.'],
    'Archives of General Psychiatry',
    2008,
    2,
    'peer_reviewed',
    'opposes',
    'Autism prevalence continued increasing after thimerosal removal.'
  ),
];

/**
 * Death Penalty Deterrence Evidence (Active Debate)
 */
const DEATH_PENALTY_EVIDENCE: DirectedEvidence[] = [
  createEvidence(
    'Deterrence and the Death Penalty',
    ['National Research Council'],
    'National Academies Press',
    2012,
    1,
    'major_report',
    'neutral',
    'Research to date is not informative about whether capital punishment decreases, increases, or has no effect on homicide rates.'
  ),
  createEvidence(
    'Does capital punishment have a deterrent effect?',
    ['Donohue, J.J.', 'Wolfers, J.'],
    'Stanford Law Review',
    2005,
    2,
    'peer_reviewed',
    'opposes',
    'Evidence is too fragile to conclude deterrence exists.'
  ),
  createEvidence(
    'Uses and abuses of empirical evidence in death penalty',
    ['Donohue, J.J.', 'Wolfers, J.'],
    'Stanford Law Review',
    2006,
    2,
    'peer_reviewed',
    'opposes',
    'Pro-deterrence studies have serious methodological flaws.'
  ),
  createEvidence(
    'Is capital punishment morally required?',
    ['Sunstein, C.R.', 'Vermeule, A.'],
    'Stanford Law Review',
    2005,
    2,
    'peer_reviewed',
    'supports',
    'Some studies suggest each execution deters multiple murders.'
  ),
  createEvidence(
    'The deterrent effect of capital punishment',
    ['Dezhbakhsh, H.', 'et al.'],
    'American Law and Economics Review',
    2003,
    2,
    'peer_reviewed',
    'supports',
    'Each execution results in 18 fewer murders.'
  ),
  createEvidence(
    'Execution moratorium and deterrence',
    ['Mocan, N.', 'Gittings, R.K.'],
    'Journal of Law and Economics',
    2003,
    2,
    'peer_reviewed',
    'supports',
    'Executions have a deterrent effect on homicides.'
  ),
  createEvidence(
    'Re-examination of deterrent effect',
    ['Katz, L.', 'et al.'],
    'Journal of Empirical Legal Studies',
    2003,
    2,
    'peer_reviewed',
    'opposes',
    'Deterrence claims not robust to alternative specifications.'
  ),
  createEvidence(
    'Getting off death row',
    ['Fagan, J.'],
    'Ohio State Journal of Criminal Law',
    2006,
    2,
    'peer_reviewed',
    'opposes',
    'Selection and modeling problems undermine deterrence claims.'
  ),
];

/**
 * Social Media Mental Health Evidence (Active Debate)
 */
const SOCIAL_MEDIA_EVIDENCE: DirectedEvidence[] = [
  createEvidence(
    'Increases in depressive symptoms among adolescents',
    ['Twenge, J.M.', 'et al.'],
    'Clinical Psychological Science',
    2018,
    2,
    'peer_reviewed',
    'supports',
    'Screen time correlated with depression and suicidality.'
  ),
  createEvidence(
    'The association between adolescent well-being and digital technology',
    ['Orben, A.', 'Przybylski, A.K.'],
    'Nature Human Behaviour',
    2019,
    2,
    'peer_reviewed',
    'opposes',
    'Effect sizes are small, technology use explains 0.4% of variation.'
  ),
  createEvidence(
    'iGen: Generational differences',
    ['Twenge, J.M.'],
    'Atria Books',
    2017,
    4,
    'expert_opinion',
    'supports',
    'Smartphone generation shows unprecedented mental health decline.'
  ),
  createEvidence(
    'Screens, teens, and psychological well-being',
    ['Przybylski, A.K.', 'Weinstein, N.'],
    'Psychological Science',
    2017,
    2,
    'peer_reviewed',
    'opposes',
    'Moderate use may be beneficial; relationship is non-linear.'
  ),
  createEvidence(
    'Social media use and adolescent mental health',
    ['Valkenburg, P.M.', 'et al.'],
    'Annual Review of Developmental Psychology',
    2022,
    1,
    'systematic_review',
    'neutral',
    'Effects are small and heterogeneous; no simple causal story.'
  ),
  createEvidence(
    'Digital media use in children and adolescents',
    ['Stiglic, N.', 'Viner, R.M.'],
    'BMJ Open',
    2019,
    1,
    'systematic_review',
    'supports',
    'Evidence for associations with depression, though causality uncertain.'
  ),
  createEvidence(
    'Longitudinal social media effects',
    ['Coyne, S.M.', 'et al.'],
    'Computers in Human Behavior',
    2020,
    2,
    'peer_reviewed',
    'opposes',
    'No longitudinal evidence for causal relationship.'
  ),
  createEvidence(
    'The anxious generation critique',
    ['Odgers, C.'],
    'Nature',
    2024,
    2,
    'peer_reviewed',
    'opposes',
    'Evidence does not support strong causal claims about harm.'
  ),
];

/**
 * Abortion Ethics - Values Question (not empirical)
 */
const ABORTION_CLAIM: ConsensusAssessmentInput = {
  claimText: 'Abortion should be illegal',
  claimType: 'values',
  domain: 'general',
  evidence: [], // No empirical evidence applies to values questions
};

/**
 * New Supplement Claim (Insufficient Research)
 */
const SUPPLEMENT_EVIDENCE: DirectedEvidence[] = [
  createEvidence(
    'Pilot study of novel compound X',
    ['Smith, J.', 'et al.'],
    'Journal of Dietary Supplements',
    2024,
    3,
    'working_paper',
    'supports',
    'Small pilot (n=20) showed promising results.'
  ),
  createEvidence(
    'In vitro effects of compound X',
    ['Lee, K.', 'et al.'],
    'Biochemistry Letters',
    2023,
    3,
    'preprint',
    'supports',
    'Cell culture studies suggest mechanism of action.'
  ),
];

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Consensus Detector Integration Tests', () => {
  // ───────────────────────────────────────────────────────────────
  // STRONG CONSENSUS: CLIMATE CHANGE
  // ───────────────────────────────────────────────────────────────
  describe('Climate Change (Strong Consensus)', () => {
    const input: ConsensusAssessmentInput = {
      claimText: 'Human activities are causing global warming',
      claimType: 'causal',
      domain: 'climate',
      evidence: CLIMATE_CHANGE_EVIDENCE,
    };

    it('should assess as strong_consensus', () => {
      const assessment = assessConsensus(input);
      expect(assessment.level).toBe('strong_consensus');
    });

    it('should have high confidence', () => {
      const assessment = assessConsensus(input);
      expect(assessment.confidence).toBe('high');
    });

    it('should identify IPCC and meta-analyses as key sources', () => {
      const assessment = assessConsensus(input);
      expect(assessment.basis.majorReports.length).toBeGreaterThan(0);
      expect(assessment.basis.metaAnalyses.length).toBeGreaterThan(0);
    });

    it('should generate appropriate framing', () => {
      const assessment = assessConsensus(input);
      expect(assessment.framingSentence).toContain('clearly');
    });

    it('should show 100% support ratio', () => {
      const assessment = assessConsensus(input);
      expect(assessment.evidenceSummary.supportRatio).toBe(1.0);
    });

    it('should provide simplified result', () => {
      const assessment = assessConsensus(input);
      const simplified = getSimplifiedResult(assessment);
      expect(simplified.headline).toBe('Research Clearly Shows');
      expect(simplified.confidence).toBe('high');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // STRONG CONSENSUS: VACCINE SAFETY
  // ───────────────────────────────────────────────────────────────
  describe('Vaccine Safety (Strong Consensus Against Autism Link)', () => {
    const input: ConsensusAssessmentInput = {
      claimText: 'Vaccines cause autism',
      claimType: 'causal',
      domain: 'medicine',
      evidence: VACCINE_SAFETY_EVIDENCE,
    };

    it('should assess as strong_consensus (against the claim)', () => {
      const assessment = assessConsensus(input);
      expect(assessment.level).toBe('strong_consensus');
    });

    it('should show evidence opposing the claim', () => {
      const assessment = assessConsensus(input);
      expect(assessment.evidenceSummary.opposing).toBeGreaterThan(0);
      expect(assessment.evidenceSummary.supporting).toBe(0);
    });

    it('should have support ratio near 0 (all oppose)', () => {
      const assessment = assessConsensus(input);
      expect(assessment.evidenceSummary.supportRatio).toBe(0);
    });

    it('should generate framing showing claim is NOT supported', () => {
      const assessment = assessConsensus(input);
      expect(assessment.framingSentence).toContain('not supported');
    });

    it('should include Cochrane reviews and IOM reports', () => {
      const assessment = assessConsensus(input);
      expect(assessment.basis.systematicReviews.length).toBeGreaterThan(0);
      expect(assessment.basis.majorReports.length).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // ACTIVE DEBATE: DEATH PENALTY DETERRENCE
  // ───────────────────────────────────────────────────────────────
  describe('Death Penalty Deterrence (Active Debate)', () => {
    const input: ConsensusAssessmentInput = {
      claimText: 'The death penalty deters crime',
      claimType: 'causal',
      domain: 'criminology',
      evidence: DEATH_PENALTY_EVIDENCE,
    };

    it('should assess as active_debate', () => {
      const assessment = assessConsensus(input);
      expect(assessment.level).toBe('active_debate');
    });

    it('should have medium confidence in the debate assessment', () => {
      const assessment = assessConsensus(input);
      expect(assessment.confidence).toBe('medium');
    });

    it('should have both supporting and opposing evidence', () => {
      const assessment = assessConsensus(input);
      expect(assessment.evidenceSummary.supporting).toBeGreaterThan(0);
      expect(assessment.evidenceSummary.opposing).toBeGreaterThan(0);
    });

    it('should include debate positions', () => {
      const assessment = assessConsensus(input);
      expect(assessment.positions).toBeDefined();
      expect(assessment.positions?.positionA).toBeDefined();
      expect(assessment.positions?.positionB).toBeDefined();
    });

    it('should include reasons for disagreement', () => {
      const assessment = assessConsensus(input);
      expect(assessment.positions?.reasonsForDisagreement).toBeInstanceOf(
        Array
      );
      expect(assessment.positions?.reasonsForDisagreement.length).toBeGreaterThan(0);
    });

    it('should generate appropriate framing', () => {
      const assessment = assessConsensus(input);
      expect(assessment.framingSentence).toContain('disagree');
    });

    it('should include NRC report in basis', () => {
      const assessment = assessConsensus(input);
      // NRC report title is "Deterrence and the Death Penalty"
      // Authors include "National Research Council"
      const hasNRC = assessment.basis.majorReports.some(
        (r) =>
          r.title.includes('Deterrence and the Death Penalty') ||
          r.authors.some((a) => a.includes('National Research Council'))
      );
      expect(hasNRC).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // ACTIVE DEBATE: SOCIAL MEDIA MENTAL HEALTH
  // ───────────────────────────────────────────────────────────────
  describe('Social Media Mental Health (Active Debate)', () => {
    const input: ConsensusAssessmentInput = {
      claimText: 'Social media causes teen depression',
      claimType: 'causal',
      domain: 'psychology',
      evidence: SOCIAL_MEDIA_EVIDENCE,
    };

    it('should assess as active_debate', () => {
      const assessment = assessConsensus(input);
      expect(assessment.level).toBe('active_debate');
    });

    it('should have both Twenge and Orben perspectives represented', () => {
      const assessment = assessConsensus(input);
      expect(assessment.evidenceSummary.supporting).toBeGreaterThan(0);
      expect(assessment.evidenceSummary.opposing).toBeGreaterThan(0);
    });

    it('should include replication concerns caveat for psychology', () => {
      const assessment = assessConsensus(input);
      const hasReplicationCaveat = assessment.caveats.some((c) =>
        c.toLowerCase().includes('replication')
      );
      expect(hasReplicationCaveat).toBe(true);
    });

    it('should generate framing acknowledging debate', () => {
      const assessment = assessConsensus(input);
      expect(assessment.framingSentence).toContain('disagree');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // VALUES QUESTION: ABORTION ETHICS
  // ───────────────────────────────────────────────────────────────
  describe('Abortion Ethics (Values Question)', () => {
    it('should assess as values_question', () => {
      const assessment = assessConsensus(ABORTION_CLAIM);
      expect(assessment.level).toBe('values_question');
    });

    it('should have high confidence (in the values assessment)', () => {
      const assessment = assessConsensus(ABORTION_CLAIM);
      expect(assessment.confidence).toBe('high');
    });

    it('should generate appropriate framing', () => {
      const assessment = assessConsensus(ABORTION_CLAIM);
      expect(assessment.framingSentence).toContain('values');
    });

    it('should include caveat about values vs empirical', () => {
      const assessment = assessConsensus(ABORTION_CLAIM);
      const hasCaveat = assessment.caveats.some(
        (c) =>
          c.includes('values') ||
          c.includes('empirical') ||
          c.includes('inform')
      );
      expect(hasCaveat).toBe(true);
    });

    it('should show zero quality studies', () => {
      const assessment = assessConsensus(ABORTION_CLAIM);
      expect(assessment.basis.totalQualityStudies).toBe(0);
    });

    it('should have proper display name', () => {
      const name = getConsensusLevelDisplayName('values_question');
      expect(name).toBe('Values Question');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // INSUFFICIENT RESEARCH: NEW SUPPLEMENT
  // ───────────────────────────────────────────────────────────────
  describe('New Supplement Claim (Insufficient Research)', () => {
    const input: ConsensusAssessmentInput = {
      claimText: 'Supplement X improves memory in healthy adults',
      claimType: 'causal',
      domain: 'nutrition',
      evidence: SUPPLEMENT_EVIDENCE,
    };

    it('should assess as insufficient_research or emerging_research', () => {
      const assessment = assessConsensus(input);
      expect(['insufficient_research', 'emerging_research']).toContain(
        assessment.level
      );
    });

    it('should note limited evidence', () => {
      const assessment = assessConsensus(input);
      expect(assessment.basis.totalQualityStudies).toBeLessThan(3);
    });

    it('should include caveat about limited studies', () => {
      const assessment = assessConsensus(input);
      const hasLimitedStudiesCaveat = assessment.caveats.some(
        (c) =>
          c.includes('studies') ||
          c.includes('limited') ||
          c.includes('early') ||
          c.includes('absence')
      );
      expect(hasLimitedStudiesCaveat).toBe(true);
    });

    it('should generate appropriate framing', () => {
      const assessment = assessConsensus(input);
      expect(
        assessment.framingSentence.includes('Insufficient') ||
          assessment.framingSentence.includes('Early')
      ).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // KNOWN CONSENSUS TOPICS VALIDATION
  // ───────────────────────────────────────────────────────────────
  describe('Known Consensus Topics', () => {
    it('should have expected levels for known topics', () => {
      // This tests that our logic aligns with known expert assessments
      KNOWN_CONSENSUS_TOPICS.forEach((topic) => {
        // We can't directly test without evidence, but we can verify
        // the expected levels make sense
        expect([
          'strong_consensus',
          'moderate_consensus',
          'active_debate',
          'emerging_research',
          'insufficient_research',
          'values_question',
          'methodologically_blocked',
        ]).toContain(topic.expectedLevel);
      });
    });

    it('should include climate change as strong consensus', () => {
      const climateTopic = KNOWN_CONSENSUS_TOPICS.find((t) =>
        t.topic.includes('climate')
      );
      expect(climateTopic?.expectedLevel).toBe('strong_consensus');
    });

    it('should include vaccine safety as strong consensus', () => {
      const vaccineTopic = KNOWN_CONSENSUS_TOPICS.find((t) =>
        t.topic.includes('vaccine')
      );
      expect(vaccineTopic?.expectedLevel).toBe('strong_consensus');
    });

    it('should include death penalty as active debate', () => {
      const deathPenaltyTopic = KNOWN_CONSENSUS_TOPICS.find((t) =>
        t.topic.includes('death penalty')
      );
      expect(deathPenaltyTopic?.expectedLevel).toBe('active_debate');
    });

    it('should include abortion as values question', () => {
      const abortionTopic = KNOWN_CONSENSUS_TOPICS.find((t) =>
        t.topic.includes('abortion')
      );
      expect(abortionTopic?.expectedLevel).toBe('values_question');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // EDGE CASES
  // ───────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should handle mixed evidence from multiple tiers', () => {
      const mixedEvidence: DirectedEvidence[] = [
        createEvidence(
          'Meta-analysis',
          ['A'],
          'Journal',
          2020,
          1,
          'meta_analysis',
          'supports',
          'Meta-analysis supports claim'
        ),
        createEvidence(
          'RCT',
          ['B'],
          'Journal',
          2021,
          2,
          'rct',
          'opposes',
          'RCT shows no effect'
        ),
        createEvidence(
          'Working paper',
          ['C'],
          'NBER',
          2022,
          3,
          'working_paper',
          'supports',
          'Working paper supports'
        ),
        createEvidence(
          'Expert opinion',
          ['D'],
          'Interview',
          2023,
          4,
          'expert_opinion',
          'opposes',
          'Expert is skeptical'
        ),
      ];

      const input: ConsensusAssessmentInput = {
        claimText: 'Test claim',
        claimType: 'causal',
        domain: 'general',
        evidence: mixedEvidence,
      };

      const assessment = assessConsensus(input);
      expect(assessment).toBeDefined();
      expect(assessment.basis.totalStudiesExamined).toBe(4);
    });

    it('should handle all neutral evidence', () => {
      const neutralEvidence: DirectedEvidence[] = [
        createEvidence(
          'Study 1',
          ['A'],
          'Journal',
          2020,
          2,
          'peer_reviewed',
          'neutral',
          'Results inconclusive'
        ),
        createEvidence(
          'Study 2',
          ['B'],
          'Journal',
          2021,
          2,
          'peer_reviewed',
          'neutral',
          'No clear direction'
        ),
        createEvidence(
          'Study 3',
          ['C'],
          'Journal',
          2022,
          2,
          'peer_reviewed',
          'neutral',
          'Mixed findings'
        ),
      ];

      const input: ConsensusAssessmentInput = {
        claimText: 'Test claim',
        claimType: 'causal',
        domain: 'general',
        evidence: neutralEvidence,
      };

      const assessment = assessConsensus(input);
      // With all neutral, support ratio should be 0.5
      expect(assessment.evidenceSummary.supportRatio).toBe(0.5);
    });

    it('should properly categorize claim types', () => {
      const empiricalInput: ConsensusAssessmentInput = {
        claimText: 'Water boils at 100C at sea level',
        claimType: 'empirical',
        domain: 'general',
        evidence: [],
      };

      const assessment = assessConsensus(empiricalInput);
      expect(assessment.claimType).toBe('empirical');
      expect(assessment.level).toBe('insufficient_research');
    });
  });
});
