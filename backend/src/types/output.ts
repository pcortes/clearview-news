/**
 * Output Generation Types
 * Wave 6 - Honest output generation types
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 8
 *
 * These types define the structure for rendering consensus assessments
 * into honest, accurate output that:
 * - Never overstates certainty
 * - Never hides legitimate debate
 * - Always includes appropriate caveats
 * - Clearly distinguishes values from empirical questions
 */

import { ConsensusLevel, ConfidenceLevel, Citation, ConsensusAssessment, DebatePosition } from './consensus';
import { ValidatedExpert } from './expert';
import { Domain, ClaimType } from './claims';

/**
 * Output format types
 */
export type OutputFormat = 'html' | 'markdown' | 'json' | 'text';

/**
 * Confidence badge styling
 */
export interface ConfidenceBadge {
  text: string;
  level: ConfidenceLevel;
  colorClass: 'green' | 'blue' | 'yellow' | 'orange' | 'gray' | 'purple';
}

/**
 * Header section of the output
 */
export interface OutputHeader {
  emoji: string;
  headline: string;
  confidenceBadge: ConfidenceBadge;
  claimText: string;
}

/**
 * Single citation in the output
 */
export interface OutputCitation {
  title: string;
  authors: string;
  publication: string;
  year: number;
  url: string;
  doi?: string;
  finding?: string;
  tierLabel: string;
  tierLevel: number;
}

/**
 * Evidence summary section
 */
export interface OutputEvidenceSummary {
  totalStudies: number;
  qualityStudies: number;
  metaAnalysisCount: number;
  systematicReviewCount: number;
  supportingCount: number;
  opposingCount: number;
  supportRatio: number;
  summaryText: string;
}

/**
 * Expert voice in the output
 */
export interface OutputExpertVoice {
  name: string;
  credentials: string;
  affiliation: string;
  position: 'supports' | 'opposes' | 'neutral';
  qualityTier: 'top' | 'established' | 'emerging' | 'unverified';
}

/**
 * Debate position for active_debate outputs
 */
export interface OutputDebatePosition {
  label: string;
  summary: string;
  experts: OutputExpertVoice[];
  keyEvidence: OutputCitation[];
  mainArguments: string[];
  strengthLabel: string;
}

/**
 * Debate section for active_debate consensus level
 */
export interface OutputDebateSection {
  positionA: OutputDebatePosition;
  positionB: OutputDebatePosition;
  reasonsForDisagreement: string[];
  isGenuineDebate: boolean;
}

/**
 * Emerging research trends section
 */
export interface OutputEmergingTrends {
  direction: string;
  recentStudies: OutputCitation[];
  caveats: string[];
  summaryText: string;
}

/**
 * Warning/caveat in the output
 */
export interface OutputWarning {
  type: 'caveat' | 'limitation' | 'domain_specific' | 'methodological' | 'values_note';
  text: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Sources list section
 */
export interface OutputSourcesList {
  topSources: OutputCitation[];
  totalSourcesExamined: number;
  sourcesNote?: string;
}

/**
 * Values question specific content
 */
export interface OutputValuesContent {
  whatResearchCanInform: string[];
  valuesInvolved: string[];
  relatedEmpiricalQuestions: string[];
}

/**
 * Complete rendered output for a single claim
 */
export interface RenderedClaimOutput {
  // Identification
  claimId?: string;
  claimText: string;
  claimType: ClaimType;
  domain: Domain;

  // Core sections
  header: OutputHeader;
  framingSentence: string;
  detailedExplanation: string;

  // Evidence section
  evidenceSummary: OutputEvidenceSummary;
  topCitations: OutputCitation[];

  // Conditional sections based on consensus level
  debateSection?: OutputDebateSection;
  emergingTrends?: OutputEmergingTrends;
  valuesContent?: OutputValuesContent;

  // Expert voices (for non-values questions)
  expertVoices?: OutputExpertVoice[];

  // Warnings and caveats
  warnings: OutputWarning[];

  // Sources
  sources: OutputSourcesList;

  // Metadata
  consensusLevel: ConsensusLevel;
  confidenceLevel: ConfidenceLevel;
  assessedAt: Date;
}

/**
 * Options for output generation
 */
export interface OutputGeneratorOptions {
  format: OutputFormat;
  includeMetadata?: boolean;
  includeDebateDetails?: boolean;
  maxCitations?: number;
  maxExperts?: number;
  maxCaveats?: number;
}

/**
 * Default output options
 */
export const DEFAULT_OUTPUT_OPTIONS: OutputGeneratorOptions = {
  format: 'markdown',
  includeMetadata: true,
  includeDebateDetails: true,
  maxCitations: 5,
  maxExperts: 3,
  maxCaveats: 5,
};

/**
 * Generated output container
 */
export interface GeneratedOutput {
  format: OutputFormat;
  content: string;
  rendered: RenderedClaimOutput;
  metadata: {
    generatedAt: Date;
    assessmentDate: Date;
    consensusLevel: ConsensusLevel;
    confidenceLevel: ConfidenceLevel;
    domain: Domain;
  };
}

/**
 * Confidence badge mapping by level
 */
export const CONFIDENCE_BADGE_MAP: Record<ConfidenceLevel, ConfidenceBadge> = {
  high: {
    text: 'HIGH CONFIDENCE',
    level: 'high',
    colorClass: 'green',
  },
  medium: {
    text: 'MODERATE CONFIDENCE',
    level: 'medium',
    colorClass: 'yellow',
  },
  low: {
    text: 'LOW CONFIDENCE',
    level: 'low',
    colorClass: 'orange',
  },
};

/**
 * Consensus level to color class mapping
 */
export const CONSENSUS_COLOR_MAP: Record<ConsensusLevel, ConfidenceBadge['colorClass']> = {
  strong_consensus: 'green',
  moderate_consensus: 'blue',
  active_debate: 'yellow',
  emerging_research: 'orange',
  insufficient_research: 'gray',
  methodologically_blocked: 'gray',
  values_question: 'purple',
};

/**
 * Warning severity by consensus level
 */
export const DEFAULT_WARNING_SEVERITY: Record<ConsensusLevel, OutputWarning['severity']> = {
  strong_consensus: 'info',
  moderate_consensus: 'info',
  active_debate: 'warning',
  emerging_research: 'warning',
  insufficient_research: 'critical',
  methodologically_blocked: 'warning',
  values_question: 'info',
};

/**
 * Honesty requirements for output generation
 * These are rules that must be followed to maintain honest reporting
 */
export interface HonestyRequirements {
  // Must never hide legitimate debate
  mustShowDebateIfActiveDebate: boolean;
  // Must never overstate certainty
  mustNotOverstateCertainty: boolean;
  // Must include caveats when appropriate
  mustIncludeCaveats: boolean;
  // Must distinguish values from empirical questions
  mustIdentifyValuesQuestions: boolean;
  // Must not cite article subjects as experts
  mustExcludeArticleSubjects: boolean;
}

/**
 * Default honesty requirements (all true - these are mandatory)
 */
export const HONESTY_REQUIREMENTS: HonestyRequirements = {
  mustShowDebateIfActiveDebate: true,
  mustNotOverstateCertainty: true,
  mustIncludeCaveats: true,
  mustIdentifyValuesQuestions: true,
  mustExcludeArticleSubjects: true,
};

/**
 * Honesty check result
 */
export interface HonestyCheckResult {
  isHonest: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Type guard for checking if output needs debate section
 */
export function needsDebateSection(level: ConsensusLevel): boolean {
  return level === 'active_debate';
}

/**
 * Type guard for checking if output needs emerging trends section
 */
export function needsEmergingTrendsSection(level: ConsensusLevel): boolean {
  return level === 'emerging_research';
}

/**
 * Type guard for checking if output needs values content section
 */
export function needsValuesContentSection(level: ConsensusLevel): boolean {
  return level === 'values_question';
}

/**
 * Type guard for checking if consensus level allows certainty language
 */
export function allowsCertaintyLanguage(level: ConsensusLevel): boolean {
  return level === 'strong_consensus';
}

/**
 * Type guard for checking if consensus level requires uncertainty language
 */
export function requiresUncertaintyLanguage(level: ConsensusLevel): boolean {
  return (
    level === 'active_debate' ||
    level === 'emerging_research' ||
    level === 'insufficient_research' ||
    level === 'methodologically_blocked'
  );
}
