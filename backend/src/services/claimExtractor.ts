/**
 * ClaimExtractor Service
 * Wave 1, Agent 2 - Extracts and classifies claims from articles
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 3
 */

import { openaiService } from './openai';
import {
  Article,
  ExtractedClaims,
  ClassifiedClaim,
  ClaimType,
  Domain,
  SourceRole,
  ClaimSource,
  VERIFIABLE_CLAIM_TYPES,
  PARTIALLY_VERIFIABLE_CLAIM_TYPES,
} from '../types/claims';

/**
 * Claim extraction prompt based on EXPERT_EVALUATION_SPEC.md
 */
const CLAIM_EXTRACTION_PROMPT = `
You are extracting factual claims from a news article for fact-checking.

ARTICLE:
Title: {title}
Source: {source}
Content: {content}

INSTRUCTIONS:

1. Extract each discrete factual claim (not opinions, rhetoric, or values statements)

2. For each claim, determine:
   - The exact claim text
   - Claim type: empirical, causal, statistical, historical, scientific_consensus,
     predictive, comparative, effectiveness, values, aesthetic, definitional, unfalsifiable
   - Who made this claim (name and role)
   - Whether they are the SUBJECT of this article
   - The academic domain this claim falls under
   - Whether this claim is empirically verifiable

3. CRITICAL: Identify the main subject(s) of this article. Anyone who is the SUBJECT
   of the article (the person being written about, interviewed, profiled, or whose
   claims are being examined) must be marked as article_subject and EXCLUDED from
   being cited as an expert.

OUTPUT FORMAT:
{
  "articleSubjects": ["Name 1", "Name 2"],
  "claims": [
    {
      "id": "claim_1",
      "text": "exact claim text",
      "type": "causal",
      "isVerifiable": true,
      "verifiabilityReason": "This causal claim can be tested with empirical research",
      "source": {
        "name": "Person Name",
        "role": "article_subject",
        "credentials": "Governor of California",
        "isExcludedFromExpertPool": true,
        "exclusionReason": "Article subject - claims are being fact-checked, not used as evidence"
      },
      "domain": "criminology",
      "subDomain": "deterrence"
    }
  ]
}

Remember:
- Politicians are NEVER experts for empirical claims (they are claimants)
- CEOs are NEVER experts for claims about their own companies
- Article subjects are NEVER experts for the claims being examined
- "Should" statements are ALWAYS values claims
- Be specific about claim types - don't default to "empirical" for everything
`;

/**
 * Map of claim types to their verifiability
 */
function isClaimTypeVerifiable(type: ClaimType): boolean {
  return VERIFIABLE_CLAIM_TYPES.includes(type) || PARTIALLY_VERIFIABLE_CLAIM_TYPES.includes(type);
}

/**
 * Get verifiability reason for a claim type
 */
function getVerifiabilityReason(type: ClaimType): string {
  const reasons: Record<ClaimType, string> = {
    empirical: 'This empirical claim can be tested with direct observations or measurements',
    causal: 'This causal claim can be evaluated with research studying cause-effect relationships',
    statistical: 'This statistical claim can be verified against data and surveys',
    historical: 'This historical claim can be verified against records and documentation',
    scientific_consensus: 'Claims about scientific consensus can be verified through literature review',
    predictive: 'This predictive claim can be partially verified by examining mechanisms and past predictions',
    comparative: 'This comparative claim can be partially verified if criteria are specified',
    effectiveness: 'This effectiveness claim can be evaluated with defined metrics and outcomes',
    values: 'This is a values claim that cannot be empirically verified - it reflects moral or ethical judgments',
    aesthetic: 'This is an aesthetic claim about taste or preference that cannot be empirically tested',
    definitional: 'This is a definitional claim about the meaning of terms that cannot be empirically resolved',
    unfalsifiable: 'This claim is structured in a way that makes it impossible to test or disprove',
  };
  return reasons[type] || 'Verifiability depends on the specific claim content';
}

/**
 * Detect domain from claim text and context
 */
function detectDomainFromContent(text: string): Domain {
  const domainKeywords: Record<Domain, string[]> = {
    medicine: ['drug', 'vaccine', 'treatment', 'disease', 'patient', 'symptom', 'clinical', 'medical', 'health', 'hospital', 'doctor', 'therapy'],
    climate: ['climate', 'warming', 'carbon', 'emissions', 'temperature', 'environment', 'pollution', 'greenhouse'],
    economics: ['economy', 'economic', 'tax', 'tariff', 'inflation', 'gdp', 'growth', 'employment', 'wage', 'trade', 'fiscal', 'monetary'],
    criminology: ['crime', 'criminal', 'prison', 'death penalty', 'deterrence', 'incarceration', 'police', 'justice', 'murder', 'recidivism'],
    psychology: ['mental', 'psychological', 'therapy', 'cognitive', 'behavior', 'anxiety', 'depression', 'brain'],
    nutrition: ['diet', 'food', 'nutrition', 'vitamin', 'supplement', 'obesity', 'calorie'],
    politicalScience: ['election', 'voting', 'democracy', 'policy', 'government', 'political', 'congress', 'legislature'],
    technology: ['software', 'algorithm', 'AI', 'artificial intelligence', 'computer', 'data', 'tech', 'digital'],
    education: ['school', 'student', 'teacher', 'learning', 'curriculum', 'education', 'academic'],
    general: [],
  };

  const lowercaseText = text.toLowerCase();

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (domain === 'general') continue;
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword)) {
        return domain as Domain;
      }
    }
  }

  return 'general';
}

/**
 * Parse raw OpenAI response into ExtractedClaims
 */
function parseClaimsResponse(response: string): ExtractedClaims {
  // Try to extract JSON from the response
  let jsonContent = response;
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1].trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (error) {
    // Try to find JSON object in the content
    const objectMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      parsed = JSON.parse(objectMatch[0]);
    } else {
      // Return empty result if parsing fails
      return { articleSubjects: [], claims: [] };
    }
  }

  // Validate and normalize the response
  const articleSubjects: string[] = parsed.articleSubjects || [];
  const claims: ClassifiedClaim[] = (parsed.claims || []).map((claim: any, index: number) => {
    const type: ClaimType = claim.type || 'empirical';
    const isVerifiable = claim.isVerifiable ?? isClaimTypeVerifiable(type);

    const source: ClaimSource = {
      name: claim.source?.name || 'Unknown',
      role: (claim.source?.role as SourceRole) || 'unknown',
      credentials: claim.source?.credentials,
      affiliation: claim.source?.affiliation,
      isExcludedFromExpertPool: claim.source?.isExcludedFromExpertPool ||
        claim.source?.role === 'article_subject' ||
        articleSubjects.some(s => claim.source?.name?.toLowerCase().includes(s.toLowerCase())),
      exclusionReason: claim.source?.exclusionReason,
    };

    // If this is an article subject, mark as excluded
    if (source.role === 'article_subject' && !source.exclusionReason) {
      source.exclusionReason = 'Article subject - claims are being fact-checked, not used as evidence';
    }

    return {
      id: claim.id || `claim_${index + 1}`,
      text: claim.text || '',
      type,
      isVerifiable,
      verifiabilityReason: claim.verifiabilityReason || getVerifiabilityReason(type),
      source,
      domain: (claim.domain as Domain) || detectDomainFromContent(claim.text || ''),
      subDomain: claim.subDomain,
      verifiableComponents: claim.verifiableComponents,
      unverifiableComponents: claim.unverifiableComponents,
    };
  });

  return { articleSubjects, claims };
}

/**
 * Extract and classify claims from an article
 *
 * @param article - The article to extract claims from
 * @returns ExtractedClaims containing article subjects and classified claims
 */
export async function extractClaims(article: Article): Promise<ExtractedClaims> {
  // Build the prompt
  const prompt = CLAIM_EXTRACTION_PROMPT
    .replace('{title}', article.title)
    .replace('{source}', article.source)
    .replace('{content}', article.content);

  try {
    // Call OpenAI to extract claims
    const response = await openaiService.complete(prompt);

    // Parse the response
    const result = parseClaimsResponse(response);

    // Post-process: ensure article subjects from title are included
    const titleWords = article.title.split(/\s+/);
    const potentialNames = [];

    // Look for capitalized name patterns in title
    for (let i = 0; i < titleWords.length - 1; i++) {
      const word = titleWords[i];
      const nextWord = titleWords[i + 1];
      if (
        word.length > 1 &&
        word[0] === word[0].toUpperCase() &&
        nextWord &&
        nextWord.length > 1 &&
        nextWord[0] === nextWord[0].toUpperCase() &&
        !['The', 'And', 'But', 'For', 'Nor', 'Yet', 'So', 'New', 'How', 'Why', 'What'].includes(word)
      ) {
        potentialNames.push(`${word} ${nextWord}`);
      }
    }

    // Add any names found in title that aren't already in articleSubjects
    for (const name of potentialNames) {
      const alreadyIncluded = result.articleSubjects.some(
        s => s.toLowerCase().includes(name.toLowerCase()) ||
             name.toLowerCase().includes(s.toLowerCase())
      );
      if (!alreadyIncluded) {
        result.articleSubjects.push(name);
      }
    }

    // Post-process: ensure claims from article subjects are properly marked
    for (const claim of result.claims) {
      const isFromSubject = result.articleSubjects.some(
        subject => claim.source.name.toLowerCase().includes(subject.toLowerCase()) ||
                   subject.toLowerCase().includes(claim.source.name.toLowerCase())
      );

      if (isFromSubject && claim.source.role !== 'article_subject') {
        claim.source.role = 'article_subject';
        claim.source.isExcludedFromExpertPool = true;
        claim.source.exclusionReason = 'Article subject - claims are being fact-checked, not used as evidence';
      }
    }

    return result;
  } catch (error) {
    console.error('[ClaimExtractor] Error extracting claims:', error);
    // Return empty result on error
    return { articleSubjects: [], claims: [] };
  }
}

/**
 * Export for testing
 */
export { parseClaimsResponse, detectDomainFromContent, getVerifiabilityReason };
