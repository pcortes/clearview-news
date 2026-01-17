/**
 * Expert Validator Service
 * Wave 4 - Expert validation system
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 7
 *
 * This service validates whether a person cited in an article
 * qualifies as a credible expert for fact-checking purposes.
 *
 * Key principles:
 * 1. Article subjects are NEVER experts for their own claims
 * 2. Politicians are NEVER experts for empirical claims
 * 3. Experts must have relevant credentials and publications
 * 4. Conflicts of interest must be disclosed
 */

import { Domain } from '../types/claims';
import { DOMAIN_CONFIGS } from '../config/domainConfigs';
import {
  ExpertValidation,
  ExpertDisqualifiers,
  PersonMention,
  ExpertValidationInput,
  ValidatedExpert,
  DisqualificationReason,
  BatchValidationResult,
  ExpertQualityIndicators,
} from '../types/expert';

// ═══════════════════════════════════════════════════════════════
// EXCLUSION PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Politicians - NEVER experts for empirical claims
 * These are people making claims, not verifying them
 */
export const POLITICIAN_PATTERNS: RegExp[] = [
  // Federal elected officials
  /\b(president|vice president|senator|representative|congressman|congresswoman)\b/i,
  // State/local officials
  /\b(governor|lieutenant governor|mayor|city council|state legislator|state senator|state representative|assemblyman|assemblywoman|alderman)\b/i,
  // Cabinet and appointed officials
  /\b(secretary of|cabinet|minister|prime minister|ambassador|deputy secretary|undersecretary|assistant secretary)\b/i,
  // Political party roles
  /\b(party chair|campaign|political director|press secretary|chief of staff|white house)\b/i,
  // Congressional leadership
  /\b(majority leader|minority leader|speaker of the house|house speaker|whip)\b/i,
  // International political roles
  /\b(member of parliament|MP|chancellor|premier)\b/i,
  // Former officials (still biased)
  /\b(former (president|senator|governor|representative|congressman))\b/i,
];

/**
 * Advocacy organizations - May cite their claims, but not as expert evidence
 * These organizations exist to promote a position, not to find truth
 */
export const ADVOCACY_ORG_PATTERNS: RegExp[] = [
  // Generic advocacy terms
  /\b(advocacy|activist|campaign|action fund|political action)\b/i,
  // Common advocacy naming patterns
  /\b(citizens for|americans for|alliance for|coalition for|foundation for|center for.*action|.*action center)\b/i,
  // PACs and political organizations
  /\bPAC\b/i,
  /\b(super pac|political action committee)\b/i,
  // Rights organizations (context-dependent but often advocacy)
  /\b(rights organization|justice organization|freedom foundation|liberty foundation)\b/i,
  // Lobbying firms
  /\b(lobbying|lobbyist|government relations|public affairs firm)\b/i,
];

/**
 * Corporate patterns - Exclude for claims about their own products/industry
 * These people have financial incentives that bias their statements
 */
export const CORPORATE_PATTERNS: RegExp[] = [
  // C-suite executives
  /\b(CEO|CFO|COO|CTO|CMO|chief .* officer)\b/i,
  // Communications/PR roles
  /\b(spokesperson|communications director|public relations|PR director|media relations)\b/i,
  // Marketing/Sales leadership
  /\b(vice president of|director of|head of) .*(marketing|communications|sales|business development)\b/i,
  // Investor relations
  /\b(investor relations|shareholder communications)\b/i,
  // Company representatives
  /\b(company representative|corporate representative|official spokesperson)\b/i,
];

/**
 * Lobbyist patterns
 */
export const LOBBYIST_PATTERNS: RegExp[] = [
  /\b(registered lobbyist|lobbyist|lobbying)\b/i,
  /\b(government affairs|government relations)\b/i,
  /\b(advocacy director|policy advocate)\b/i,
];

// ═══════════════════════════════════════════════════════════════
// QUALIFICATION PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Research institutions - INCLUDE these as valid affiliations
 */
export const RESEARCH_INSTITUTION_PATTERNS: RegExp[] = [
  // Universities
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\binstitute of technology\b/i,
  /\bpolytechnic\b/i,
  // Research centers
  /\bresearch (institute|center|centre|laboratory|lab)\b/i,
  /\b(institute|center|centre) (for|of) .*(research|studies|science)\b/i,
  // Medical institutions
  /\bmedical (school|center|centre)\b/i,
  /\bhospital .*(research|institute)\b/i,
  /\b(teaching hospital|academic medical center)\b/i,
  // Law schools (academic)
  /\blaw school\b/i,
  /\bschool of law\b/i,
  // Business schools (academic)
  /\bbusiness school\b/i,
  /\bschool of business\b/i,
  // Government research
  /\bnational (academy|academies|institute|institutes|laboratory|laboratories)\b/i,
  /\bfederal research\b/i,
  // International research orgs
  /\b(CERN|WHO|IMF|World Bank) research\b/i,
];

/**
 * Academic degrees that qualify for expert status
 * Domain-specific credentials are also checked against DOMAIN_CONFIGS
 */
export const DEGREE_PATTERNS: RegExp[] = [
  // Doctorates
  /\bPh\.?D\b\.?/i,
  /\bD\.?Phil\b\.?/i,
  /\bEd\.?D\b\.?/i,
  /\bPsy\.?D\b\.?/i,
  /\bJ\.?S\.?D\b\.?/i,
  /\bSc\.?D\b\.?/i,
  // Medical degrees
  /\bM\.?D\b\.?/i,
  /\bD\.?O\b\.?/i,
  // Law degrees (for legal topics)
  /\bJ\.?D\b\.?/i,
  /\bLL\.?M\b\.?/i,
  /\bLL\.?B\b\.?/i,
  // Academic titles
  /\bDr\./,
  /\bProfessor\b/i,
  /\bProf\./i,
  // Master's degrees (lower weight but still credentialed)
  /\bM\.?S\b\.?/i,
  /\bM\.?A\b\.?/i,
  /\bM\.?P\.?H\b\.?/i,
  /\bM\.?B\.?A\b\.?/i,
  // Professional credentials
  /\bR\.?D\b\.?/i,  // Registered Dietitian
  /\bR\.?N\b\.?/i,  // Registered Nurse
  /\bCPA\b/i,       // Certified Public Accountant
];

/**
 * Academic title patterns that indicate expertise
 */
export const ACADEMIC_TITLE_PATTERNS: RegExp[] = [
  /\b(professor|associate professor|assistant professor|emeritus professor)\b/i,
  /\b(research (fellow|scientist|associate|professor))\b/i,
  /\b(senior (researcher|scientist|fellow))\b/i,
  /\b(postdoctoral (fellow|researcher|associate))\b/i,
  /\b(lecturer|senior lecturer|reader)\b/i,
  /\b(department (chair|head|director))\b/i,
  /\b(lab (director|head|lead))\b/i,
];

// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a person is the subject of the article
 */
export function isArticleSubject(
  personName: string,
  articleSubjects: string[]
): boolean {
  const normalizedName = personName.toLowerCase().trim();

  return articleSubjects.some((subject) => {
    const normalizedSubject = subject.toLowerCase().trim();

    // Exact match
    if (normalizedName === normalizedSubject) return true;

    // Check if one contains the other (handles "John Smith" vs "Smith")
    if (normalizedName.includes(normalizedSubject)) return true;
    if (normalizedSubject.includes(normalizedName)) return true;

    // Check last name match
    const nameParts = normalizedName.split(/\s+/);
    const subjectParts = normalizedSubject.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const subjectLastName = subjectParts[subjectParts.length - 1];
    if (lastName === subjectLastName && lastName.length >= 2) return true;

    return false;
  });
}

/**
 * Check if a person's title/role indicates they are a politician
 */
export function isPolitician(title?: string, affiliation?: string): boolean {
  const textToCheck = `${title || ''} ${affiliation || ''}`.toLowerCase();

  return POLITICIAN_PATTERNS.some((pattern) => pattern.test(textToCheck));
}

/**
 * Check if a person is associated with an advocacy organization
 */
export function isAdvocate(affiliation?: string, role?: string): boolean {
  const textToCheck = `${affiliation || ''} ${role || ''}`.toLowerCase();

  return ADVOCACY_ORG_PATTERNS.some((pattern) => pattern.test(textToCheck));
}

/**
 * Check if a person is a lobbyist
 */
export function isLobbyist(title?: string, affiliation?: string): boolean {
  const textToCheck = `${title || ''} ${affiliation || ''}`.toLowerCase();

  return LOBBYIST_PATTERNS.some((pattern) => pattern.test(textToCheck));
}

/**
 * Check if a person is a corporate spokesperson
 */
export function isCorporateSpokesperson(
  title?: string,
  role?: string
): boolean {
  const textToCheck = `${title || ''} ${role || ''}`.toLowerCase();

  return CORPORATE_PATTERNS.some((pattern) => pattern.test(textToCheck));
}

/**
 * Check if a person is at a research institution
 */
export function isAtResearchInstitution(affiliation?: string): boolean {
  if (!affiliation) return false;

  return RESEARCH_INSTITUTION_PATTERNS.some((pattern) =>
    pattern.test(affiliation)
  );
}

/**
 * Extract credentials from a person's description
 */
export function extractCredentials(
  credentials?: string,
  title?: string
): string[] {
  const textToCheck = `${credentials || ''} ${title || ''}`;
  const found: string[] = [];

  DEGREE_PATTERNS.forEach((pattern) => {
    const match = textToCheck.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  });

  return [...new Set(found)]; // Remove duplicates
}

/**
 * Check if credentials are relevant to the claim domain
 */
export function hasRelevantCredentials(
  credentials: string[],
  domain: Domain
): boolean {
  const domainConfig = DOMAIN_CONFIGS[domain];
  if (!domainConfig) return false;

  const typicalCreds = domainConfig.expertIdentification.typicalCredentials;

  // Check if any found credential matches the typical credentials for this domain
  return credentials.some((cred) => {
    const normalizedCred = cred.replace(/\./g, '').toUpperCase();
    return typicalCreds.some((typical) => {
      const normalizedTypical = typical.replace(/[\.\(\)]/g, '').toUpperCase();
      // Handle cases like "PhD" matching "PhD" or "Ph.D"
      return (
        normalizedCred.includes(normalizedTypical) ||
        normalizedTypical.includes(normalizedCred)
      );
    });
  });
}

/**
 * Check if a person has an academic title
 */
export function hasAcademicTitle(title?: string): boolean {
  if (!title) return false;

  return ACADEMIC_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

/**
 * Check all disqualifying factors for a person
 */
export function checkDisqualifiers(
  person: PersonMention,
  articleSubjects: string[]
): ExpertDisqualifiers {
  return {
    isArticleSubject: isArticleSubject(person.name, articleSubjects),
    isPolitician: isPolitician(person.title, person.affiliation),
    isLobbyist: isLobbyist(person.title, person.affiliation),
    isAdvocate: isAdvocate(person.affiliation, person.role),
    isCorporateSpokesperson: isCorporateSpokesperson(person.title, person.role),
    hasUndisclosedConflict: false, // Would need separate check
  };
}

/**
 * Get the primary disqualification reason if any
 */
export function getDisqualificationReason(
  disqualifiers: ExpertDisqualifiers
): DisqualificationReason | null {
  if (disqualifiers.isArticleSubject) return 'article_subject';
  if (disqualifiers.isPolitician) return 'politician';
  if (disqualifiers.isLobbyist) return 'lobbyist';
  if (disqualifiers.isAdvocate) return 'advocate';
  if (disqualifiers.isCorporateSpokesperson) return 'corporate_spokesperson';
  if (disqualifiers.hasUndisclosedConflict) return 'undisclosed_conflict';
  return null;
}

/**
 * Generate a human-readable explanation for disqualification
 */
export function getDisqualificationExplanation(
  reason: DisqualificationReason
): string {
  const explanations: Record<DisqualificationReason, string> = {
    article_subject:
      'This person is the subject of the article. Their claims are being fact-checked, not used as evidence.',
    politician:
      'Politicians are claimants, not independent experts. Their statements reflect political positions, not scientific assessment.',
    lobbyist:
      'Lobbyists represent specific interests and cannot serve as independent experts.',
    advocate:
      'Advocacy organizations exist to promote positions, not provide objective expertise.',
    corporate_spokesperson:
      'Corporate representatives speak for company interests and may have conflicts of interest.',
    undisclosed_conflict:
      'This person has a known conflict of interest that was not disclosed.',
    missing_credentials:
      'This person lacks the academic credentials typically required for expertise in this domain.',
    irrelevant_field:
      "This person's credentials are not relevant to the domain of this claim.",
    no_publications:
      'This person has no peer-reviewed publications in the relevant field.',
  };

  return explanations[reason];
}

// ═══════════════════════════════════════════════════════════════
// LLM-BASED EXPERT VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Prompt for LLM-based expert validation
 * Uses GPT-5's knowledge of institutions, credentials, and academic prestige
 */
export const EXPERT_VALIDATION_PROMPT = `You are validating whether a person qualifies as a credible expert for fact-checking purposes.

PERSON TO VALIDATE:
Name: {name}
Title: {title}
Credentials: {credentials}
Affiliation: {affiliation}
Claim Domain: {domain}

EXPERT TIERS (classify into one):

**TOP TIER** - Unquestionable expertise
- Examples: Nobel laureates, National Academy members, department chairs at R1 universities
- h-index typically 40+, thousands of citations
- Published seminal work in the field
- e.g., "Anthony Fauci on infectious disease", "Paul Krugman on trade economics"

**ESTABLISHED** - Clear credentialed expert
- Examples: Tenured professors at research universities, senior researchers at major institutions
- Regular peer-reviewed publications in the domain
- e.g., "Associate Professor of Economics at UC Berkeley", "Senior Fellow at Brookings"

**EMERGING** - Early-career with relevant credentials
- Examples: Assistant professors, postdocs, recent PhDs at recognized institutions
- Beginning publication record
- e.g., "Assistant Professor at State University", "Postdoctoral Fellow at NIH"

**UNVERIFIED** - Cannot confirm expertise
- Missing credentials, unknown institution, or credentials don't match domain
- e.g., "Dr. Smith" with no affiliation, economist commenting on virology

DISQUALIFYING FACTORS (automatic rejection):
- Politicians (elected officials, political appointees)
- Lobbyists or advocates
- Corporate spokespersons speaking about their industry
- Article subjects (their claims are being evaluated, not used as evidence)

OUTPUT JSON:
{
  "tier": "top" | "established" | "emerging" | "unverified",
  "isValidExpert": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "institutionPrestige": "high" | "medium" | "low" | "unknown",
  "credentialsRelevance": "highly_relevant" | "somewhat_relevant" | "not_relevant" | "unknown",
  "knownPublications": boolean,
  "warnings": ["any concerns"]
}

Be conservative - when in doubt, classify as "unverified". It's better to miss a valid expert than to cite an invalid one.`;

/**
 * LLM-based expert validation result
 */
export interface LLMExpertValidation {
  tier: 'top' | 'established' | 'emerging' | 'unverified';
  isValidExpert: boolean;
  confidence: number;
  reasoning: string;
  institutionPrestige: 'high' | 'medium' | 'low' | 'unknown';
  credentialsRelevance: 'highly_relevant' | 'somewhat_relevant' | 'not_relevant' | 'unknown';
  knownPublications: boolean;
  warnings: string[];
}

/**
 * Validate expert using LLM (GPT-5)
 * Faster than API calls, leverages model's knowledge of institutions
 *
 * @param person - Person to validate
 * @param domain - Claim domain for relevance checking
 * @param llmComplete - Function to call LLM (injected for testability)
 */
export async function validateExpertWithLLM(
  person: PersonMention,
  domain: Domain,
  articleSubjects: string[],
  llmComplete: (prompt: string) => Promise<string>
): Promise<LLMExpertValidation> {
  // Quick disqualifier check first (no LLM needed)
  const quickCheck = shouldExcludeFromExpertPool(person, articleSubjects);
  if (quickCheck.exclude) {
    return {
      tier: 'unverified',
      isValidExpert: false,
      confidence: 1.0,
      reasoning: getDisqualificationExplanation(quickCheck.reason!),
      institutionPrestige: 'unknown',
      credentialsRelevance: 'not_relevant',
      knownPublications: false,
      warnings: [`Disqualified: ${quickCheck.reason}`],
    };
  }

  // Build prompt
  const prompt = EXPERT_VALIDATION_PROMPT
    .replace('{name}', person.name || 'Unknown')
    .replace('{title}', person.title || 'Not provided')
    .replace('{credentials}', person.credentials || 'Not provided')
    .replace('{affiliation}', person.affiliation || 'Not provided')
    .replace('{domain}', domain);

  try {
    const response = await llmComplete(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as LLMExpertValidation;

    // Validate and normalize
    const validTiers = ['top', 'established', 'emerging', 'unverified'];
    if (!validTiers.includes(parsed.tier)) {
      parsed.tier = 'unverified';
    }

    return {
      tier: parsed.tier,
      isValidExpert: parsed.isValidExpert ?? (parsed.tier !== 'unverified'),
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      reasoning: parsed.reasoning || 'No reasoning provided',
      institutionPrestige: parsed.institutionPrestige || 'unknown',
      credentialsRelevance: parsed.credentialsRelevance || 'unknown',
      knownPublications: parsed.knownPublications ?? false,
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    // Fallback to heuristic validation on LLM failure
    console.warn('[ExpertValidator] LLM validation failed, using heuristics:', (error as Error).message);
    const heuristicResult = validateExpert({ person, articleSubjects, claimDomain: domain });

    return {
      tier: heuristicResult.isValidExpert ? 'emerging' : 'unverified',
      isValidExpert: heuristicResult.isValidExpert,
      confidence: heuristicResult.confidenceScore,
      reasoning: heuristicResult.validationReason,
      institutionPrestige: heuristicResult.isAtResearchInstitution ? 'medium' : 'unknown',
      credentialsRelevance: heuristicResult.hasRelevantDegree ? 'somewhat_relevant' : 'unknown',
      knownPublications: heuristicResult.hasRelevantPublications,
      warnings: ['Fallback to heuristic validation'],
    };
  }
}

/**
 * Batch validate experts using LLM (single call for efficiency)
 */
export async function validateExpertsWithLLM(
  persons: PersonMention[],
  domain: Domain,
  articleSubjects: string[],
  llmComplete: (prompt: string) => Promise<string>
): Promise<Map<string, LLMExpertValidation>> {
  const results = new Map<string, LLMExpertValidation>();

  // For small batches, validate individually
  // TODO: For larger batches, could combine into single prompt
  for (const person of persons) {
    const result = await validateExpertWithLLM(person, domain, articleSubjects, llmComplete);
    results.set(person.name, result);
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// HEURISTIC VALIDATION (FAST, NO API CALLS)
// ═══════════════════════════════════════════════════════════════

/**
 * Validate whether a person qualifies as an expert for a specific claim
 * Uses fast heuristic checks - no external API calls
 *
 * @param input - Validation input containing person, article subjects, and claim domain
 * @returns ExpertValidation result
 */
export function validateExpert(input: ExpertValidationInput): ExpertValidation {
  const { person, articleSubjects, claimDomain } = input;

  // Check disqualifying factors first (these are absolute)
  const disqualifiers = checkDisqualifiers(person, articleSubjects);
  const disqualificationReason = getDisqualificationReason(disqualifiers);

  if (disqualificationReason) {
    return {
      hasRelevantDegree: false,
      hasRelevantPublications: false,
      isAtResearchInstitution: false,
      disqualifiers,
      qualityIndicators: {},
      isValidExpert: false,
      validationReason: getDisqualificationExplanation(disqualificationReason),
      confidenceScore: 1.0, // High confidence in disqualification
    };
  }

  // Check positive qualifications
  const credentials = extractCredentials(person.credentials, person.title);
  const hasRelevantDegree =
    credentials.length > 0 && hasRelevantCredentials(credentials, claimDomain);
  const atResearchInstitution = isAtResearchInstitution(person.affiliation);
  const hasAcadTitle = hasAcademicTitle(person.title);

  // Note: hasRelevantPublications would ideally be checked via Semantic Scholar
  // For now, we use a heuristic based on affiliation and title
  const hasRelevantPublications = atResearchInstitution && hasAcadTitle;

  // Calculate confidence score
  let confidenceScore = 0;
  if (hasRelevantDegree) confidenceScore += 0.4;
  if (atResearchInstitution) confidenceScore += 0.3;
  if (hasRelevantPublications) confidenceScore += 0.2;
  if (hasAcadTitle) confidenceScore += 0.1;

  // Determine if valid expert
  // Must have at least relevant degree OR be at research institution with academic title
  const isValidExpert =
    (hasRelevantDegree && atResearchInstitution) ||
    (hasRelevantDegree && hasRelevantPublications) ||
    (atResearchInstitution && hasAcadTitle);

  // Generate validation reason
  let validationReason: string;
  if (isValidExpert) {
    const reasons: string[] = [];
    if (hasRelevantDegree)
      reasons.push(`has relevant credentials (${credentials.join(', ')})`);
    if (atResearchInstitution)
      reasons.push(`affiliated with research institution`);
    if (hasRelevantPublications) reasons.push(`has relevant publications`);
    validationReason = `Valid expert: ${reasons.join(', ')}`;
  } else {
    const missing: string[] = [];
    if (!hasRelevantDegree) missing.push('relevant academic credentials');
    if (!atResearchInstitution) missing.push('research institution affiliation');
    if (!hasRelevantPublications) missing.push('verified publications');
    validationReason = `Not validated: Missing ${missing.join(', ')}`;
  }

  return {
    hasRelevantDegree,
    hasRelevantPublications,
    isAtResearchInstitution: atResearchInstitution,
    disqualifiers,
    qualityIndicators: {},
    isValidExpert,
    validationReason,
    confidenceScore,
    credentialsFound: credentials,
    affiliationFound: person.affiliation,
  };
}

/**
 * Determine the quality tier of a validated expert
 */
export function getExpertQualityTier(
  validation: ExpertValidation,
  qualityIndicators?: ExpertQualityIndicators
): 'top' | 'established' | 'emerging' | 'unverified' {
  if (!validation.isValidExpert) return 'unverified';

  // If we have academic metrics from Semantic Scholar
  if (qualityIndicators) {
    if (
      qualityIndicators.hIndex &&
      qualityIndicators.hIndex >= 40 &&
      qualityIndicators.totalCitations &&
      qualityIndicators.totalCitations >= 5000
    ) {
      return 'top';
    }
    if (
      qualityIndicators.hIndex &&
      qualityIndicators.hIndex >= 15 &&
      qualityIndicators.totalCitations &&
      qualityIndicators.totalCitations >= 500
    ) {
      return 'established';
    }
    if (
      qualityIndicators.relevantPublicationCount &&
      qualityIndicators.relevantPublicationCount >= 3
    ) {
      return 'emerging';
    }
  }

  // Fallback based on validation confidence
  if (validation.confidenceScore >= 0.8) return 'established';
  if (validation.confidenceScore >= 0.5) return 'emerging';
  return 'unverified';
}

/**
 * Validate multiple experts and return results
 */
export function validateExperts(
  persons: PersonMention[],
  articleSubjects: string[],
  claimDomain: Domain
): BatchValidationResult {
  const validExperts: ValidatedExpert[] = [];
  const excludedPersons: {
    name: string;
    reason: DisqualificationReason;
    explanation: string;
  }[] = [];

  for (const person of persons) {
    const validation = validateExpert({
      person,
      articleSubjects,
      claimDomain,
    });

    if (validation.isValidExpert) {
      validExperts.push({
        name: person.name,
        credentials: validation.credentialsFound?.join(', ') || '',
        affiliation: validation.affiliationFound || '',
        domain: claimDomain,
        validation,
        qualityTier: getExpertQualityTier(validation),
      });
    } else {
      const reason = getDisqualificationReason(validation.disqualifiers);
      if (reason) {
        excludedPersons.push({
          name: person.name,
          reason,
          explanation: getDisqualificationExplanation(reason),
        });
      } else {
        // Not disqualified but not validated either (missing credentials)
        excludedPersons.push({
          name: person.name,
          reason: 'missing_credentials',
          explanation: validation.validationReason,
        });
      }
    }
  }

  return {
    validExperts,
    excludedPersons,
    totalProcessed: persons.length,
    validCount: validExperts.length,
    excludedCount: excludedPersons.length,
  };
}

/**
 * Quick check if a person should be excluded without full validation
 */
export function shouldExcludeFromExpertPool(
  person: PersonMention,
  articleSubjects: string[]
): { exclude: boolean; reason?: DisqualificationReason } {
  if (isArticleSubject(person.name, articleSubjects)) {
    return { exclude: true, reason: 'article_subject' };
  }
  if (isPolitician(person.title, person.affiliation)) {
    return { exclude: true, reason: 'politician' };
  }
  if (isLobbyist(person.title, person.affiliation)) {
    return { exclude: true, reason: 'lobbyist' };
  }
  if (isAdvocate(person.affiliation, person.role)) {
    return { exclude: true, reason: 'advocate' };
  }
  if (isCorporateSpokesperson(person.title, person.role)) {
    return { exclude: true, reason: 'corporate_spokesperson' };
  }
  return { exclude: false };
}
