/**
 * Consensus Detector Service
 * Wave 5 - Consensus detection and assessment
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 6
 *
 * This service assesses the state of scientific knowledge on a claim by:
 * 1. Checking if the claim is a values question (not empirically resolvable)
 * 2. Counting and weighting quality evidence by tier
 * 3. Analyzing the direction of findings (supports/opposes/neutral)
 * 4. Determining consensus level based on agreement ratios
 * 5. Generating honest framing for output
 */

import { ClaimType, Domain } from '../types/claims';
import { EvidenceTier, getTierWeighting } from './evidenceTier';
import {
  ConsensusLevel,
  ConfidenceLevel,
  ConsensusAssessment,
  ConsensusAssessmentInput,
  DirectedEvidence,
  EvidenceBasis,
  DebatePosition,
  Citation,
  ConsensusThresholds,
  DEFAULT_CONSENSUS_THRESHOLDS,
  ConsensusResult,
  FramingTemplate,
  EvidenceDirection,
} from '../types/consensus';
import { ValidatedExpert } from '../types/expert';

// ═══════════════════════════════════════════════════════════════
// FRAMING TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Framing templates for each consensus level
 */
export const FRAMING_TEMPLATES: Record<ConsensusLevel, FramingTemplate> = {
  strong_consensus: {
    headerEmoji: '✓',
    headerText: 'Research Clearly Shows',
    confidenceBadge: 'HIGH CONFIDENCE',
    bodyTemplate:
      'The scientific evidence strongly {direction} this claim. {summary}',
    caveatsTemplate: undefined,
  },

  moderate_consensus: {
    headerEmoji: '◐',
    headerText: 'Most Research Suggests',
    confidenceBadge: 'MODERATE CONFIDENCE',
    bodyTemplate:
      'The majority of research {direction} this claim, though some debate exists. {summary}',
    caveatsTemplate: 'Note: {caveats}',
  },

  active_debate: {
    headerEmoji: '⟷',
    headerText: 'Experts Disagree',
    confidenceBadge: 'CONTESTED',
    bodyTemplate:
      'This is an area of legitimate scientific debate. Qualified experts hold different views. {summary}',
    caveatsTemplate:
      'Important: This is a genuinely contested scientific question.',
  },

  emerging_research: {
    headerEmoji: '◔',
    headerText: 'Early Research Suggests',
    confidenceBadge: 'PRELIMINARY',
    bodyTemplate:
      'This is an emerging area of research. Early findings suggest {direction}, but the evidence is still developing. {summary}',
    caveatsTemplate:
      'Caution: This research is preliminary and conclusions may change.',
  },

  insufficient_research: {
    headerEmoji: '?',
    headerText: 'Insufficient Research',
    confidenceBadge: 'UNKNOWN',
    bodyTemplate:
      'There is not enough peer-reviewed research to evaluate this claim. {summary}',
    caveatsTemplate:
      'Note: Absence of research does not mean the claim is false or true.',
  },

  methodologically_blocked: {
    headerEmoji: '⊘',
    headerText: 'Cannot Be Directly Studied',
    confidenceBadge: 'METHODOLOGICALLY LIMITED',
    bodyTemplate:
      'This claim cannot be directly tested through randomized experiments due to ethical or practical constraints. {summary}',
    caveatsTemplate:
      'Note: Some important questions cannot be answered through controlled experiments.',
  },

  values_question: {
    headerEmoji: '⚖',
    headerText: 'Values Question',
    confidenceBadge: 'NOT EMPIRICAL',
    bodyTemplate:
      'This is a values question that cannot be resolved through scientific research alone. {summary}',
    caveatsTemplate:
      'Note: Science can inform values debates but cannot resolve them.',
  },
};

// ═══════════════════════════════════════════════════════════════
// CLAIM TYPE CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * Claim types that are values questions (not empirically verifiable)
 */
const VALUES_CLAIM_TYPES: ClaimType[] = ['values', 'aesthetic', 'unfalsifiable'];

/**
 * Claim types that may be methodologically blocked
 */
const POTENTIALLY_BLOCKED_CLAIM_TYPES: ClaimType[] = [
  'causal',
  'effectiveness',
];

/**
 * Check if a claim type is a values question
 */
export function isValuesQuestion(claimType: ClaimType): boolean {
  return VALUES_CLAIM_TYPES.includes(claimType);
}

/**
 * Check if a claim type could be methodologically blocked
 */
export function isPotentiallyMethodologicallyBlocked(
  claimType: ClaimType
): boolean {
  return POTENTIALLY_BLOCKED_CLAIM_TYPES.includes(claimType);
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Filter evidence by tier
 */
export function filterEvidenceByTier(
  evidence: DirectedEvidence[],
  tiers: EvidenceTier[]
): DirectedEvidence[] {
  return evidence.filter((e) => tiers.includes(e.tier));
}

/**
 * Get high-quality evidence (Tier 1 and 2)
 */
export function getHighQualityEvidence(
  evidence: DirectedEvidence[]
): DirectedEvidence[] {
  return filterEvidenceByTier(evidence, [1, 2]);
}

/**
 * Count evidence by direction
 */
export function countEvidenceByDirection(evidence: DirectedEvidence[]): {
  supporting: number;
  opposing: number;
  neutral: number;
  mixed: number;
} {
  return {
    supporting: evidence.filter((e) => e.direction === 'supports').length,
    opposing: evidence.filter((e) => e.direction === 'opposes').length,
    neutral: evidence.filter((e) => e.direction === 'neutral').length,
    mixed: evidence.filter((e) => e.direction === 'mixed').length,
  };
}

/**
 * Calculate support ratio (excluding neutral/mixed)
 */
export function calculateSupportRatio(evidence: DirectedEvidence[]): number {
  const counts = countEvidenceByDirection(evidence);
  const totalDirectional = counts.supporting + counts.opposing;

  if (totalDirectional === 0) {
    return 0.5; // No directional evidence, return neutral
  }

  return counts.supporting / totalDirectional;
}

/**
 * Calculate weighted support ratio using tier weights
 */
export function calculateWeightedSupportRatio(
  evidence: DirectedEvidence[]
): number {
  let supportWeight = 0;
  let opposeWeight = 0;

  for (const e of evidence) {
    const weight = getTierWeighting(e.tier);
    if (e.direction === 'supports') {
      supportWeight += weight;
    } else if (e.direction === 'opposes') {
      opposeWeight += weight;
    }
  }

  const totalWeight = supportWeight + opposeWeight;
  if (totalWeight === 0) {
    return 0.5;
  }

  return supportWeight / totalWeight;
}

/**
 * Build evidence basis from directed evidence
 */
export function buildEvidenceBasis(evidence: DirectedEvidence[]): EvidenceBasis {
  const systematicReviews: Citation[] = [];
  const metaAnalyses: Citation[] = [];
  const majorReports: Citation[] = [];
  const peerReviewedStudies: Citation[] = [];

  for (const e of evidence) {
    if (e.category === 'systematic_review') {
      systematicReviews.push(e.citation);
    } else if (e.category === 'meta_analysis') {
      metaAnalyses.push(e.citation);
    } else if (e.category === 'major_report') {
      majorReports.push(e.citation);
    } else if (e.category === 'peer_reviewed' || e.category === 'rct') {
      peerReviewedStudies.push(e.citation);
    }
  }

  const qualityStudies = getHighQualityEvidence(evidence);

  return {
    systematicReviews,
    metaAnalyses,
    majorReports,
    peerReviewedStudies,
    totalQualityStudies: qualityStudies.length,
    totalStudiesExamined: evidence.length,
  };
}

/**
 * Check if research is primarily recent (emerging)
 */
export function isEmergingResearch(
  evidence: DirectedEvidence[],
  yearsThreshold: number = 3
): boolean {
  const currentYear = new Date().getFullYear();
  const recentEvidence = evidence.filter(
    (e) => currentYear - e.citation.year <= yearsThreshold
  );

  // If most evidence is recent and there's not much total, it's emerging
  return (
    evidence.length > 0 &&
    evidence.length < 10 &&
    recentEvidence.length / evidence.length >= 0.7
  );
}

// ═══════════════════════════════════════════════════════════════
// CONSENSUS DETERMINATION
// ═══════════════════════════════════════════════════════════════

/**
 * Determine consensus level from evidence
 */
export function determineConsensusLevel(
  claimType: ClaimType,
  evidence: DirectedEvidence[],
  thresholds: ConsensusThresholds = DEFAULT_CONSENSUS_THRESHOLDS
): ConsensusLevel {
  // Check for values question first
  if (isValuesQuestion(claimType)) {
    return 'values_question';
  }

  const qualityEvidence = getHighQualityEvidence(evidence);

  // Check for insufficient research
  if (qualityEvidence.length < thresholds.minimumQualityStudies) {
    // Check if it's emerging research (must have some evidence and be recent)
    if (
      evidence.length > 0 &&
      qualityEvidence.length > 0 &&
      isEmergingResearch(evidence)
    ) {
      return 'emerging_research';
    }
    return 'insufficient_research';
  }

  // Calculate support ratio
  const supportRatio = calculateWeightedSupportRatio(qualityEvidence);

  // Check for strong consensus (either direction)
  if (supportRatio >= thresholds.strongConsensusRatio) {
    return 'strong_consensus';
  }
  if (supportRatio <= 1 - thresholds.strongConsensusRatio) {
    return 'strong_consensus'; // Strong consensus AGAINST
  }

  // Check for moderate consensus
  if (supportRatio >= thresholds.moderateConsensusRatio) {
    return 'moderate_consensus';
  }
  if (supportRatio <= 1 - thresholds.moderateConsensusRatio) {
    return 'moderate_consensus'; // Moderate consensus AGAINST
  }

  // Check if it's emerging research
  if (isEmergingResearch(evidence)) {
    return 'emerging_research';
  }

  // Otherwise, it's active debate
  return 'active_debate';
}

/**
 * Determine confidence level
 */
export function determineConfidence(
  consensusLevel: ConsensusLevel,
  evidence: DirectedEvidence[]
): ConfidenceLevel {
  const qualityEvidence = getHighQualityEvidence(evidence);
  const basis = buildEvidenceBasis(evidence);

  // Values questions always have high confidence in the assessment
  if (consensusLevel === 'values_question') {
    return 'high';
  }

  // Strong consensus with meta-analyses = high confidence
  if (consensusLevel === 'strong_consensus') {
    if (basis.metaAnalyses.length > 0 || basis.systematicReviews.length > 0) {
      return 'high';
    }
    if (qualityEvidence.length >= 10) {
      return 'high';
    }
    return 'medium';
  }

  // Moderate consensus
  if (consensusLevel === 'moderate_consensus') {
    if (qualityEvidence.length >= 10) {
      return 'medium';
    }
    return 'low';
  }

  // Active debate - medium confidence in the assessment that it IS debated
  if (consensusLevel === 'active_debate') {
    return 'medium';
  }

  // Emerging/insufficient - low confidence
  return 'low';
}

/**
 * Get direction word for framing
 */
export function getDirectionWord(
  supportRatio: number,
  consensusLevel: ConsensusLevel
): string {
  if (consensusLevel === 'values_question') {
    return '';
  }

  if (supportRatio >= 0.7) {
    return 'supports';
  }
  if (supportRatio <= 0.3) {
    return 'does not support';
  }
  return 'is mixed on';
}

/**
 * Generate framing sentence
 */
export function generateFramingSentence(
  consensusLevel: ConsensusLevel,
  supportRatio: number,
  qualityStudyCount: number
): string {
  const template = FRAMING_TEMPLATES[consensusLevel];
  const direction = getDirectionWord(supportRatio, consensusLevel);

  switch (consensusLevel) {
    case 'strong_consensus':
      return supportRatio >= 0.5
        ? 'Research clearly shows that this claim is well-supported by scientific evidence.'
        : 'Research clearly shows that this claim is not supported by scientific evidence.';

    case 'moderate_consensus':
      return supportRatio >= 0.5
        ? `Most research supports this claim, though some debate exists on details.`
        : `Most research does not support this claim, though some studies disagree.`;

    case 'active_debate':
      return 'Experts genuinely disagree on this question. Qualified researchers hold different views based on interpretation of evidence.';

    case 'emerging_research':
      return `Early research ${direction} this claim, but findings may change as more studies are conducted.`;

    case 'insufficient_research':
      return `Insufficient peer-reviewed research exists to evaluate this claim (only ${qualityStudyCount} quality studies found).`;

    case 'methodologically_blocked':
      return 'This claim cannot be directly tested through controlled experiments due to ethical or practical constraints.';

    case 'values_question':
      return 'This is a values question that cannot be resolved through scientific research alone.';

    default:
      return 'Unable to assess the scientific consensus on this claim.';
  }
}

/**
 * Generate caveats based on consensus level and domain
 */
export function generateCaveats(
  consensusLevel: ConsensusLevel,
  domain: Domain,
  qualityStudyCount: number
): string[] {
  const caveats: string[] = [];

  // Level-specific caveats
  switch (consensusLevel) {
    case 'emerging_research':
      caveats.push('Research is still early-stage and conclusions may change');
      caveats.push(
        'Limited number of studies available for comprehensive analysis'
      );
      break;
    case 'insufficient_research':
      caveats.push(`Only ${qualityStudyCount} high-quality studies found`);
      caveats.push(
        'Absence of evidence is not evidence of absence'
      );
      break;
    case 'active_debate':
      caveats.push(
        'This represents genuine scientific disagreement, not a lack of knowledge'
      );
      caveats.push('Different conclusions may stem from different methodologies or assumptions');
      break;
    case 'values_question':
      caveats.push(
        'This is fundamentally a values question, not an empirical one'
      );
      caveats.push(
        'Empirical research can inform but not determine value judgments'
      );
      caveats.push(
        'Related empirical questions may be separately verifiable'
      );
      break;
  }

  // Domain-specific caveats
  const DOMAIN_CAVEATS: Record<Domain, string[]> = {
    psychology: ['Replication concerns exist in this field'],
    nutrition: [
      'Nutrition research is challenging due to confounding factors',
      'Industry funding may influence some studies',
    ],
    economics: ['Economic predictions depend on assumptions that may vary'],
    politicalScience: ['Results may vary across political contexts'],
    medicine: [],
    climate: [],
    criminology: [],
    technology: ['Rapidly evolving field; findings may become outdated'],
    education: [],
    general: [],
  };

  if (DOMAIN_CAVEATS[domain]) {
    caveats.push(...DOMAIN_CAVEATS[domain]);
  }

  return caveats;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ASSESSMENT FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Assess consensus on a claim based on evidence
 */
export function assessConsensus(
  input: ConsensusAssessmentInput,
  thresholds: ConsensusThresholds = DEFAULT_CONSENSUS_THRESHOLDS
): ConsensusAssessment {
  const { claimText, claimType, domain, evidence } = input;

  // Determine consensus level
  const level = determineConsensusLevel(claimType, evidence, thresholds);

  // Build evidence basis
  const basis = buildEvidenceBasis(evidence);

  // Calculate evidence direction summary
  const qualityEvidence = getHighQualityEvidence(evidence);
  const counts = countEvidenceByDirection(qualityEvidence);
  const supportRatio = calculateWeightedSupportRatio(qualityEvidence);

  // Determine confidence
  const confidence = determineConfidence(level, evidence);

  // Generate framing
  const framingSentence = generateFramingSentence(
    level,
    supportRatio,
    basis.totalQualityStudies
  );

  // Generate caveats
  const caveats = generateCaveats(level, domain, basis.totalQualityStudies);

  // Build detailed explanation
  const detailedExplanation = buildDetailedExplanation(
    level,
    basis,
    counts,
    supportRatio
  );

  // Build positions for active debate
  let positions: ConsensusAssessment['positions'];
  if (level === 'active_debate') {
    positions = buildDebatePositions(evidence, supportRatio);
  }

  // Build emerging trends for emerging research
  let emergingTrends: ConsensusAssessment['emergingTrends'];
  if (level === 'emerging_research') {
    emergingTrends = buildEmergingTrends(evidence);
  }

  return {
    level,
    confidence,
    basis,
    evidenceSummary: {
      supporting: counts.supporting,
      opposing: counts.opposing,
      neutral: counts.neutral,
      supportRatio,
    },
    positions,
    emergingTrends,
    framingSentence,
    detailedExplanation,
    caveats,
    domain,
    claimType,
    assessedAt: new Date(),
  };
}

/**
 * Build detailed explanation
 */
function buildDetailedExplanation(
  level: ConsensusLevel,
  basis: EvidenceBasis,
  counts: ReturnType<typeof countEvidenceByDirection>,
  supportRatio: number
): string {
  const parts: string[] = [];

  // Evidence count summary
  parts.push(
    `Based on ${basis.totalStudiesExamined} sources examined (${basis.totalQualityStudies} high-quality).`
  );

  // Top-tier evidence summary
  if (basis.metaAnalyses.length > 0) {
    parts.push(`${basis.metaAnalyses.length} meta-analyses found.`);
  }
  if (basis.systematicReviews.length > 0) {
    parts.push(`${basis.systematicReviews.length} systematic reviews found.`);
  }

  // Direction summary (unless values question)
  if (level !== 'values_question') {
    if (counts.supporting > 0 || counts.opposing > 0) {
      parts.push(
        `Of directional studies: ${counts.supporting} supporting, ${counts.opposing} opposing.`
      );
    }
  }

  return parts.join(' ');
}

/**
 * Build debate positions for active_debate consensus
 */
function buildDebatePositions(
  evidence: DirectedEvidence[],
  supportRatio: number
): ConsensusAssessment['positions'] {
  const supporting = evidence.filter((e) => e.direction === 'supports');
  const opposing = evidence.filter((e) => e.direction === 'opposes');

  return {
    positionA: {
      summary: 'Position supporting the claim',
      supportingExperts: [], // Would be populated from expert validation
      keyEvidence: supporting.slice(0, 3).map((e) => e.citation),
      strengthOfEvidence: supporting.length >= 5 ? 'moderate' : 'weak',
      mainArguments: supporting.slice(0, 3).map((e) => e.keyFinding),
    },
    positionB: {
      summary: 'Position opposing the claim',
      supportingExperts: [],
      keyEvidence: opposing.slice(0, 3).map((e) => e.citation),
      strengthOfEvidence: opposing.length >= 5 ? 'moderate' : 'weak',
      mainArguments: opposing.slice(0, 3).map((e) => e.keyFinding),
    },
    reasonsForDisagreement: [
      'Different interpretations of the same data',
      'Methodological differences in study design',
      'Different outcome measures or definitions',
    ],
  };
}

/**
 * Build emerging trends for emerging_research consensus
 */
function buildEmergingTrends(
  evidence: DirectedEvidence[]
): ConsensusAssessment['emergingTrends'] {
  const currentYear = new Date().getFullYear();
  const recentEvidence = evidence.filter(
    (e) => currentYear - e.citation.year <= 3
  );

  const supportRatio = calculateSupportRatio(recentEvidence);
  let direction: EvidenceDirection;
  if (supportRatio >= 0.6) {
    direction = 'supports';
  } else if (supportRatio <= 0.4) {
    direction = 'opposes';
  } else {
    direction = 'mixed';
  }

  return {
    direction,
    recentStudies: recentEvidence.slice(0, 5).map((e) => e.citation),
    caveats: [
      'Research is ongoing and consensus may shift',
      'Early findings require replication',
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// SIMPLIFIED OUTPUT
// ═══════════════════════════════════════════════════════════════

/**
 * Get simplified consensus result for display
 */
export function getSimplifiedResult(
  assessment: ConsensusAssessment
): ConsensusResult {
  const template = FRAMING_TEMPLATES[assessment.level];

  // Get top sources
  const topSources: Citation[] = [
    ...assessment.basis.metaAnalyses.slice(0, 2),
    ...assessment.basis.systematicReviews.slice(0, 2),
    ...assessment.basis.peerReviewedStudies.slice(0, 2),
  ].slice(0, 5);

  return {
    level: assessment.level,
    confidence: assessment.confidence,
    headline: template.headerText,
    summary: assessment.framingSentence,
    evidenceCount: assessment.basis.totalQualityStudies,
    topSources,
    caveats: assessment.caveats.slice(0, 3),
  };
}

/**
 * Get framing template for a consensus level
 */
export function getFramingTemplate(level: ConsensusLevel): FramingTemplate {
  return FRAMING_TEMPLATES[level];
}

/**
 * Get consensus level display name
 */
export function getConsensusLevelDisplayName(level: ConsensusLevel): string {
  const displayNames: Record<ConsensusLevel, string> = {
    strong_consensus: 'Strong Scientific Consensus',
    moderate_consensus: 'Moderate Consensus',
    active_debate: 'Active Scientific Debate',
    emerging_research: 'Emerging Research',
    insufficient_research: 'Insufficient Research',
    methodologically_blocked: 'Methodologically Limited',
    values_question: 'Values Question',
  };

  return displayNames[level];
}

/**
 * Get consensus level short description
 */
export function getConsensusLevelDescription(level: ConsensusLevel): string {
  const descriptions: Record<ConsensusLevel, string> = {
    strong_consensus:
      'Over 90% of high-quality research agrees on this question.',
    moderate_consensus:
      'Most research (70-90%) agrees, with some ongoing debate.',
    active_debate:
      'Qualified experts genuinely disagree based on available evidence.',
    emerging_research:
      'Research is new and consensus is still forming.',
    insufficient_research:
      'Not enough quality studies exist to draw conclusions.',
    methodologically_blocked:
      'This question cannot be ethically or practically studied directly.',
    values_question:
      'This is a values question that science cannot resolve.',
  };

  return descriptions[level];
}
