/**
 * EvidenceTier Service
 * Wave 3, Agent 10 - Classifies evidence by quality tier
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 5.3
 *
 * Tiers:
 * 1. Highest Quality - Synthesized Evidence (systematic reviews, meta-analyses, major reports)
 * 2. High Quality - Primary Research (peer-reviewed, RCTs)
 * 3. Moderate Quality - Preliminary/Institutional (working papers, preprints, gov stats)
 * 4. Expert Opinion (verified experts only)
 * 5. Not Evidence (politicians, advocates, article subjects)
 */

/**
 * Evidence tier enum
 */
export type EvidenceTier = 1 | 2 | 3 | 4 | 5;

/**
 * Evidence category
 */
export type EvidenceCategory =
  | 'systematic_review'
  | 'meta_analysis'
  | 'major_report'
  | 'peer_reviewed'
  | 'rct'
  | 'working_paper'
  | 'preprint'
  | 'government_stats'
  | 'expert_opinion'
  | 'expert_testimony'
  | 'not_evidence';

/**
 * Source type as provided by caller
 */
export type SourceType =
  | 'systematic_review'
  | 'meta_analysis'
  | 'major_report'
  | 'peer_reviewed'
  | 'rct'
  | 'working_paper'
  | 'preprint'
  | 'government_stats'
  | 'expert_opinion'
  | 'expert_testimony'
  | 'politician_statement'
  | 'advocacy'
  | 'article_subject';

/**
 * Input for evidence classification
 */
export interface EvidenceInput {
  url: string;
  title: string;
  sourceType?: SourceType;
  isVerifiedExpert?: boolean;
  isArticleSubject?: boolean;
}

/**
 * Classification result
 */
export interface EvidenceClassification {
  tier: EvidenceTier;
  category: EvidenceCategory;
  tierDescription: string;
  weight: number;
}

/**
 * Tier descriptions
 */
const TIER_DESCRIPTIONS: Record<EvidenceTier, string> = {
  1: 'Highest quality: systematic reviews, meta-analyses, major institutional reports',
  2: 'High quality: peer-reviewed research, randomized controlled trials',
  3: 'Moderate quality: preliminary research, working papers, government statistics',
  4: 'Expert opinion from verified domain experts',
  5: 'Not evidence: politicians, advocates, or article subjects',
};

/**
 * Tier weightings for consensus calculation
 */
const TIER_WEIGHTS: Record<EvidenceTier, number> = {
  1: 1.0,   // Full weight
  2: 0.8,   // High weight
  3: 0.4,   // Moderate weight
  4: 0.2,   // Low weight
  5: 0.0,   // No weight
};

/**
 * URL patterns for Tier 1 sources
 */
const TIER_1_URL_PATTERNS: { pattern: RegExp; category: EvidenceCategory }[] = [
  { pattern: /cochranelibrary\.com/i, category: 'systematic_review' },
  { pattern: /campbellcollaboration\.org/i, category: 'systematic_review' },
  { pattern: /nap\.nationalacademies\.org/i, category: 'major_report' },
  { pattern: /ipcc\.ch/i, category: 'major_report' },
];

/**
 * URL patterns for Tier 2 sources
 */
const TIER_2_URL_PATTERNS: { pattern: RegExp; category: EvidenceCategory }[] = [
  { pattern: /nature\.com/i, category: 'peer_reviewed' },
  { pattern: /science\.org/i, category: 'peer_reviewed' },
  { pattern: /nejm\.org/i, category: 'peer_reviewed' },
  { pattern: /thelancet\.com/i, category: 'peer_reviewed' },
  { pattern: /jamanetwork\.com/i, category: 'peer_reviewed' },
  { pattern: /bmj\.com/i, category: 'peer_reviewed' },
  { pattern: /pubmed\.gov/i, category: 'peer_reviewed' },
  { pattern: /cell\.com/i, category: 'peer_reviewed' },
  { pattern: /pnas\.org/i, category: 'peer_reviewed' },
];

/**
 * URL patterns for Tier 3 sources
 */
const TIER_3_URL_PATTERNS: { pattern: RegExp; category: EvidenceCategory }[] = [
  { pattern: /nber\.org/i, category: 'working_paper' },
  { pattern: /ssrn\.com/i, category: 'working_paper' },
  { pattern: /arxiv\.org/i, category: 'preprint' },
  { pattern: /medrxiv\.org/i, category: 'preprint' },
  { pattern: /biorxiv\.org/i, category: 'preprint' },
  { pattern: /bls\.gov/i, category: 'government_stats' },
  { pattern: /census\.gov/i, category: 'government_stats' },
  { pattern: /bea\.gov/i, category: 'government_stats' },
  { pattern: /cdc\.gov/i, category: 'government_stats' },
  { pattern: /fbi\.gov/i, category: 'government_stats' },
];

/**
 * Title patterns for detecting study types
 */
const TITLE_PATTERNS: { pattern: RegExp; tier: EvidenceTier; category: EvidenceCategory }[] = [
  { pattern: /\bmeta[- ]?analysis\b/i, tier: 1, category: 'meta_analysis' },
  { pattern: /\bsystematic\s+review\b/i, tier: 1, category: 'systematic_review' },
  { pattern: /\bcochrane\s+review\b/i, tier: 1, category: 'systematic_review' },
  { pattern: /\brandomized\s+controlled\s+trial\b/i, tier: 2, category: 'rct' },
  { pattern: /\bRCT\b/, tier: 2, category: 'rct' },
  { pattern: /\bdouble[- ]?blind\b/i, tier: 2, category: 'rct' },
  { pattern: /\bplacebo[- ]?controlled\b/i, tier: 2, category: 'rct' },
];

/**
 * Classify evidence tier based on input
 */
export function classifyEvidenceTier(input: EvidenceInput): EvidenceClassification {
  const { url, title, sourceType, isVerifiedExpert, isArticleSubject } = input;

  // Check for Tier 5 (Not Evidence) first
  if (isArticleSubject) {
    return createClassification(5, 'not_evidence');
  }

  if (sourceType === 'politician_statement' || sourceType === 'advocacy' || sourceType === 'article_subject') {
    return createClassification(5, 'not_evidence');
  }

  // Unverified expert opinions are Tier 5
  if (sourceType === 'expert_opinion' && !isVerifiedExpert) {
    return createClassification(5, 'not_evidence');
  }

  // Check for explicit Tier 4 (Expert Opinion)
  if ((sourceType === 'expert_opinion' || sourceType === 'expert_testimony') && isVerifiedExpert) {
    return createClassification(4, 'expert_opinion');
  }

  // Check for explicit source types
  if (sourceType) {
    switch (sourceType) {
      case 'systematic_review':
        return createClassification(1, 'systematic_review');
      case 'meta_analysis':
        return createClassification(1, 'meta_analysis');
      case 'major_report':
        return createClassification(1, 'major_report');
      case 'peer_reviewed':
        return createClassification(2, 'peer_reviewed');
      case 'rct':
        return createClassification(2, 'rct');
      case 'working_paper':
        return createClassification(3, 'working_paper');
      case 'preprint':
        return createClassification(3, 'preprint');
      case 'government_stats':
        return createClassification(3, 'government_stats');
    }
  }

  // Check title patterns first (can override URL)
  for (const { pattern, tier, category } of TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return createClassification(tier, category);
    }
  }

  // Check URL patterns
  // Tier 1
  for (const { pattern, category } of TIER_1_URL_PATTERNS) {
    if (pattern.test(url)) {
      return createClassification(1, category);
    }
  }

  // Tier 2
  for (const { pattern, category } of TIER_2_URL_PATTERNS) {
    if (pattern.test(url)) {
      return createClassification(2, category);
    }
  }

  // Tier 3
  for (const { pattern, category } of TIER_3_URL_PATTERNS) {
    if (pattern.test(url)) {
      return createClassification(3, category);
    }
  }

  // Default to Tier 5 if we can't determine
  return createClassification(5, 'not_evidence');
}

/**
 * Create classification result
 */
function createClassification(tier: EvidenceTier, category: EvidenceCategory): EvidenceClassification {
  return {
    tier,
    category,
    tierDescription: TIER_DESCRIPTIONS[tier],
    weight: TIER_WEIGHTS[tier],
  };
}

/**
 * Check if evidence is high quality (Tier 1 or 2)
 */
export function isHighQualityEvidence(tier: EvidenceTier): boolean {
  return tier <= 2;
}

/**
 * Get tier description
 */
export function getTierDescription(tier: EvidenceTier): string {
  return TIER_DESCRIPTIONS[tier] || 'Unknown tier';
}

/**
 * Get tier weighting for consensus calculation
 */
export function getTierWeighting(tier: EvidenceTier): number {
  return TIER_WEIGHTS[tier] ?? 0;
}

/**
 * Get all tier descriptions
 */
export function getAllTierDescriptions(): Record<EvidenceTier, string> {
  return { ...TIER_DESCRIPTIONS };
}
