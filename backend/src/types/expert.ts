/**
 * Expert Validation Types
 * Wave 4 - Expert validation system types
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 7
 */

import { Domain } from './claims';

/**
 * Expert disqualification reasons
 */
export type DisqualificationReason =
  | 'article_subject'       // Person the article is about
  | 'politician'            // Elected official or political appointee
  | 'lobbyist'              // Registered lobbyist
  | 'advocate'              // Works for advocacy organization
  | 'corporate_spokesperson'// Speaking for company interests
  | 'undisclosed_conflict'  // Known conflict of interest not disclosed
  | 'missing_credentials'   // Lacks required academic credentials
  | 'irrelevant_field'      // Credentials not relevant to claim domain
  | 'no_publications';      // No relevant peer-reviewed publications

/**
 * Expert validation disqualifiers
 */
export interface ExpertDisqualifiers {
  isArticleSubject: boolean;
  isPolitician: boolean;
  isLobbyist: boolean;
  isAdvocate: boolean;
  isCorporateSpokesperson: boolean;
  hasUndisclosedConflict: boolean;
}

/**
 * Expert quality indicators from academic databases
 */
export interface ExpertQualityIndicators {
  hIndex?: number;
  totalCitations?: number;
  relevantPublicationCount?: number;
  institutionRanking?: number;
  yearsInField?: number;
  recentPublications?: number; // Publications in last 5 years
}

/**
 * Result of expert validation
 */
export interface ExpertValidation {
  // Required qualifications
  hasRelevantDegree: boolean;
  hasRelevantPublications: boolean;
  isAtResearchInstitution: boolean;

  // Disqualifying factors
  disqualifiers: ExpertDisqualifiers;

  // Quality indicators (optional, from Semantic Scholar)
  qualityIndicators: ExpertQualityIndicators;

  // Final determination
  isValidExpert: boolean;
  validationReason: string;
  confidenceScore: number; // 0-1 scale

  // Detailed breakdown
  credentialsFound?: string[];
  affiliationFound?: string;
  publicationsFound?: number;
}

/**
 * Person mention in an article for validation
 */
export interface PersonMention {
  name: string;
  title?: string;
  credentials?: string;
  affiliation?: string;
  role?: string;
  quote?: string;
}

/**
 * Expert validation input
 */
export interface ExpertValidationInput {
  person: PersonMention;
  articleSubjects: string[];
  claimDomain: Domain;
  claimText?: string;
}

/**
 * Validated expert for use in evidence synthesis
 */
export interface ValidatedExpert {
  name: string;
  credentials: string;
  affiliation: string;
  domain: Domain;
  validation: ExpertValidation;
  qualityTier: 'top' | 'established' | 'emerging' | 'unverified';
}

/**
 * Expert search result from academic databases
 */
export interface AcademicAuthorResult {
  authorId: string;
  name: string;
  affiliations: string[];
  homepage?: string;
  paperCount: number;
  citationCount: number;
  hIndex: number;
  topPapers?: {
    title: string;
    year: number;
    citationCount: number;
    venue?: string;
  }[];
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  validExperts: ValidatedExpert[];
  excludedPersons: {
    name: string;
    reason: DisqualificationReason;
    explanation: string;
  }[];
  totalProcessed: number;
  validCount: number;
  excludedCount: number;
}
