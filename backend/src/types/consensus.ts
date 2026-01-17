/**
 * Consensus Detection Types
 * Wave 5 - Consensus detection and assessment types
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 6
 */

import { Domain, ClaimType } from './claims';
import { EvidenceTier } from '../services/evidenceTier';
import { ValidatedExpert } from './expert';

/**
 * Consensus levels representing the state of scientific knowledge
 */
export type ConsensusLevel =
  // Ground truth available
  | 'strong_consensus'        // >90% agreement, robust evidence (climate, vaccines)
  | 'moderate_consensus'      // 70-90% agreement, some debate on details

  // Ground truth contested
  | 'active_debate'           // Legitimate expert disagreement
  | 'emerging_research'       // Too new, consensus forming

  // Ground truth unavailable
  | 'insufficient_research'   // Not enough quality studies
  | 'methodologically_blocked'// Can't be ethically/practically studied
  | 'values_question';        // Not an empirical question

/**
 * Confidence level in the consensus assessment
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Direction of evidence relative to the claim
 */
export type EvidenceDirection = 'supports' | 'opposes' | 'neutral' | 'mixed';

/**
 * Citation reference for evidence
 */
export interface Citation {
  title: string;
  authors: string[];
  publication: string;
  year: number;
  doi?: string;
  url: string;
  finding?: string;
}

/**
 * Evidence source with direction indicator
 */
export interface DirectedEvidence {
  citation: Citation;
  tier: EvidenceTier;
  category: string;
  direction: EvidenceDirection;
  keyFinding: string;
  sampleSize?: number;
  effectSize?: string;
  confidence?: string;
}

/**
 * Position in a scientific debate
 */
export interface DebatePosition {
  summary: string;
  supportingExperts: ValidatedExpert[];
  keyEvidence: Citation[];
  strengthOfEvidence: 'strong' | 'moderate' | 'weak';
  mainArguments: string[];
}

/**
 * Evidence basis for consensus assessment
 */
export interface EvidenceBasis {
  systematicReviews: Citation[];
  metaAnalyses: Citation[];
  majorReports: Citation[];
  peerReviewedStudies: Citation[];
  totalQualityStudies: number;
  totalStudiesExamined: number;
}

/**
 * Full consensus assessment result
 */
export interface ConsensusAssessment {
  // Core assessment
  level: ConsensusLevel;
  confidence: ConfidenceLevel;

  // Evidence basis
  basis: EvidenceBasis;

  // Direction summary
  evidenceSummary: {
    supporting: number;
    opposing: number;
    neutral: number;
    supportRatio: number;
  };

  // For contested/debated topics (active_debate level)
  positions?: {
    positionA: DebatePosition;
    positionB: DebatePosition;
    reasonsForDisagreement: string[];
  };

  // For emerging research
  emergingTrends?: {
    direction: EvidenceDirection;
    recentStudies: Citation[];
    caveats: string[];
  };

  // Output framing
  framingSentence: string;
  detailedExplanation: string;
  caveats: string[];

  // Metadata
  domain: Domain;
  claimType: ClaimType;
  assessedAt: Date;
}

/**
 * Input for consensus assessment
 */
export interface ConsensusAssessmentInput {
  claimText: string;
  claimType: ClaimType;
  domain: Domain;
  evidence: DirectedEvidence[];
  articleSubjects?: string[];
}

/**
 * Simplified consensus result for display
 */
export interface ConsensusResult {
  level: ConsensusLevel;
  confidence: ConfidenceLevel;
  headline: string;
  summary: string;
  evidenceCount: number;
  topSources: Citation[];
  caveats: string[];
}

/**
 * Framing templates by consensus level
 */
export interface FramingTemplate {
  headerEmoji: string;
  headerText: string;
  confidenceBadge: string;
  bodyTemplate: string;
  caveatsTemplate?: string;
}

/**
 * Consensus thresholds for determination
 */
export interface ConsensusThresholds {
  strongConsensusRatio: number;     // Default: 0.9 (90%)
  moderateConsensusRatio: number;   // Default: 0.7 (70%)
  minimumQualityStudies: number;    // Default: 3
  minimumTotalStudies: number;      // Default: 5
  emergingResearchYears: number;    // Default: 3 (studies within last 3 years)
}

/**
 * Default thresholds
 */
export const DEFAULT_CONSENSUS_THRESHOLDS: ConsensusThresholds = {
  strongConsensusRatio: 0.9,
  moderateConsensusRatio: 0.7,
  minimumQualityStudies: 3,
  minimumTotalStudies: 5,
  emergingResearchYears: 3,
};

/**
 * Known topics with established consensus (for validation)
 */
export type KnownConsensusTopics = {
  topic: string;
  expectedLevel: ConsensusLevel;
  domain: Domain;
  notes: string;
};

/**
 * Well-established consensus topics for testing/validation
 */
export const KNOWN_CONSENSUS_TOPICS: KnownConsensusTopics[] = [
  {
    topic: 'human-caused climate change',
    expectedLevel: 'strong_consensus',
    domain: 'climate',
    notes: 'IPCC reports, 97%+ scientific agreement',
  },
  {
    topic: 'vaccine safety (MMR does not cause autism)',
    expectedLevel: 'strong_consensus',
    domain: 'medicine',
    notes: 'Multiple large studies, Cochrane reviews',
  },
  {
    topic: 'evolution by natural selection',
    expectedLevel: 'strong_consensus',
    domain: 'general',
    notes: 'Foundational biological theory with overwhelming evidence',
  },
  {
    topic: 'smoking causes lung cancer',
    expectedLevel: 'strong_consensus',
    domain: 'medicine',
    notes: 'Decades of research, Surgeon General reports',
  },
  {
    topic: 'death penalty deterrence',
    expectedLevel: 'active_debate',
    domain: 'criminology',
    notes: 'NRC 2012 report found studies not informative',
  },
  {
    topic: 'social media effects on teen mental health',
    expectedLevel: 'active_debate',
    domain: 'psychology',
    notes: 'Legitimate expert disagreement (Twenge vs. Orben)',
  },
  {
    topic: 'optimal macronutrient ratios for weight loss',
    expectedLevel: 'active_debate',
    domain: 'nutrition',
    notes: 'Multiple viable approaches with supporting evidence',
  },
  {
    topic: 'abortion ethics',
    expectedLevel: 'values_question',
    domain: 'general',
    notes: 'Fundamentally a values/ethics question, not empirical',
  },
  {
    topic: 'whether taxes should be higher',
    expectedLevel: 'values_question',
    domain: 'economics',
    notes: 'Policy preference, not empirical question',
  },
];
