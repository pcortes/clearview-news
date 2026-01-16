/**
 * Claim Types - Based on EXPERT_EVALUATION_SPEC.md Part 3
 */

// Fully verifiable - can reach ground truth
// Partially verifiable - components can be checked
// Not empirically verifiable
export type ClaimType =
  // Fully verifiable
  | 'empirical'           // Direct observations or measurements
  | 'causal'              // X causes/leads to/results in Y
  | 'statistical'         // Numbers, percentages, rates
  | 'historical'          // Past events, dates, sequences
  | 'scientific_consensus'// Claims about what scientists/experts believe
  // Partially verifiable
  | 'predictive'          // Future outcomes (can check mechanisms, past predictions)
  | 'comparative'         // X vs Y (can check if criteria are specified)
  | 'effectiveness'       // Does X work (can check with defined metrics)
  // Not empirically verifiable
  | 'values'              // Moral/ethical claims, "should" statements
  | 'aesthetic'           // Taste, preference, subjective quality
  | 'definitional'        // Semantic arguments about meaning
  | 'unfalsifiable';      // Claims structured to avoid testing

/**
 * Academic domains for routing to appropriate sources
 */
export type Domain =
  | 'medicine'
  | 'climate'
  | 'economics'
  | 'criminology'
  | 'psychology'
  | 'nutrition'
  | 'politicalScience'
  | 'technology'
  | 'education'
  | 'general';

/**
 * Source role in the article
 */
export type SourceRole =
  | 'article_subject'   // Person the article is about
  | 'cited_expert'      // Expert cited for their opinion
  | 'article_author'    // Author of the article
  | 'unknown';          // Cannot determine

/**
 * Source of a claim
 */
export interface ClaimSource {
  name: string;
  role: SourceRole;
  credentials?: string;
  affiliation?: string;
  isExcludedFromExpertPool: boolean;
  exclusionReason?: string;
}

/**
 * A classified claim extracted from an article
 */
export interface ClassifiedClaim {
  id: string;
  text: string;
  type: ClaimType;
  isVerifiable: boolean;
  verifiabilityReason: string;
  source: ClaimSource;
  domain: Domain;
  subDomain?: string;
  // For partially verifiable claims
  verifiableComponents?: string[];
  unverifiableComponents?: string[];
}

/**
 * Result of claim extraction from an article
 */
export interface ExtractedClaims {
  articleSubjects: string[];
  claims: ClassifiedClaim[];
}

/**
 * Article input for claim extraction
 */
export interface Article {
  title: string;
  source: string;
  content: string;
  author?: string;
  url?: string;
}

/**
 * Claim classification result
 */
export interface ClaimClassification {
  type: ClaimType;
  isVerifiable: boolean;
  verifiabilityReason: string;
  domain: Domain;
  subDomain?: string;
}

/**
 * Verifiability categories
 */
export const VERIFIABLE_CLAIM_TYPES: ClaimType[] = [
  'empirical',
  'causal',
  'statistical',
  'historical',
  'scientific_consensus',
];

export const PARTIALLY_VERIFIABLE_CLAIM_TYPES: ClaimType[] = [
  'predictive',
  'comparative',
  'effectiveness',
];

export const NON_VERIFIABLE_CLAIM_TYPES: ClaimType[] = [
  'values',
  'aesthetic',
  'definitional',
  'unfalsifiable',
];

/**
 * Check if a claim type is verifiable
 */
export function isClaimTypeVerifiable(type: ClaimType): boolean {
  return VERIFIABLE_CLAIM_TYPES.includes(type);
}

/**
 * Check if a claim type is partially verifiable
 */
export function isClaimTypePartiallyVerifiable(type: ClaimType): boolean {
  return PARTIALLY_VERIFIABLE_CLAIM_TYPES.includes(type);
}

/**
 * Check if a claim type is non-verifiable
 */
export function isClaimTypeNonVerifiable(type: ClaimType): boolean {
  return NON_VERIFIABLE_CLAIM_TYPES.includes(type);
}
