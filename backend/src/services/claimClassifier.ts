/**
 * ClaimClassifier Service
 * Wave 1, Agent 4 - Classifies claim types and detects domains
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 3.1
 */

import {
  ClaimType,
  Domain,
  ClaimClassification,
  VERIFIABLE_CLAIM_TYPES,
  PARTIALLY_VERIFIABLE_CLAIM_TYPES,
  NON_VERIFIABLE_CLAIM_TYPES,
} from '../types/claims';

/**
 * Patterns for detecting claim types
 */
const CLAIM_TYPE_PATTERNS: { type: ClaimType; patterns: RegExp[] }[] = [
  // Values claims (check first - "should" is strong indicator)
  {
    type: 'values',
    patterns: [
      /\bshould\b/i,
      /\bwe\s+must\b/i, // "We must" is typically values-based
      /\bmust\s+(protect|preserve|ensure|defend|support)\b/i, // obligation patterns
      /\bmust\b.*\b(moral|ethic|right|wrong|fair|just)\b/i,
      /\bis\s+(wrong|right|immoral|unethical|unjust)\b/i,
      /\bhas\s+a\s+(duty|obligation|responsibility)\s+to\b/i,
      /\bthe\s+right\s+thing\s+to\b/i,
      /\bmorally\b/i,
      /\bethically\b/i,
    ],
  },
  // Aesthetic claims
  {
    type: 'aesthetic',
    patterns: [
      /\b(most\s+)?beautiful\b/i,
      /\b(best|worst)\s+(food|music|art|taste|design|style)\b/i,
      /\bugly\b/i,
      /\bdelicious\b/i,
      /\bamazing\s+(taste|look|sound)\b/i,
    ],
  },
  // Definitional claims
  {
    type: 'definitional',
    patterns: [
      /\bnot\s+really\s+\w+ism\b/i,
      /\btrue\s+meaning\s+of\b/i,
      /\bby\s+definition\b/i,
      /\bis\s+not\s+actually\s+a?\s*\w+\b/i,
      /\bwhat\s+\w+\s+really\s+means\b/i,
    ],
  },
  // Scientific consensus claims
  {
    type: 'scientific_consensus',
    patterns: [
      /\b(scientists|researchers|experts)\s+(agree|consensus|unanimously)\b/i,
      /\bscientific\s+consensus\b/i,
      /\bthe\s+evidence\s+is\s+clear\b/i,
      /\bresearchers\s+agree\b/i,
    ],
  },
  // Predictive claims (check BEFORE causal - "will cause" is predictive, not causal)
  {
    type: 'predictive',
    patterns: [
      /\bwill\s+(cause|lead|result|increase|decrease|reduce|create|bring|make)\b/i,
      /\bwill\s+be\b/i,
      /\bnext\s+(year|month|decade)\b/i,
      /\bin\s+the\s+future\b/i,
      /\bby\s+\d{4}\b/i, // by 2025, etc.
      /\bforecast\b/i,
      /\bpredict\b/i,
    ],
  },
  // Causal claims
  {
    type: 'causal',
    patterns: [
      /\bcauses?\b/i,
      /\bleads?\s+to\b/i,
      /\bresults?\s+in\b/i,
      /\bdue\s+to\b/i,
      /\bbecause\s+of\b/i,
      /\bis\s+caused\s+by\b/i,
      /\bcontributes?\s+to\b/i,
    ],
  },
  // Comparative claims
  {
    type: 'comparative',
    patterns: [
      /\bmore\s+\w+\s+than\b/i,
      /\bless\s+\w+\s+than\b/i,
      /\bbetter\s+than\b/i,
      /\bworse\s+than\b/i,
      /\bsuperior\s+to\b/i,
      /\binferior\s+to\b/i,
    ],
  },
  // Effectiveness claims
  {
    type: 'effectiveness',
    patterns: [
      /\beffectively\s+\w+s?\b/i,
      /\bworks?\s+(for|with|well)\b/i,
      /\bis\s+effective\b/i,
      /\bsuccessfully\s+\w+s?\b/i,
      /\bproven\s+to\s+\w+\b/i,
    ],
  },
  // Empirical claims - check BEFORE statistical (study findings with percentages are empirical)
  {
    type: 'empirical',
    patterns: [
      /\bstudy\s+(found|showed|demonstrated)\b/i,
      /\bresearch\s+(shows|indicates|suggests)\b/i,
      /\bpatients?\s+showed\b/i,
      /\bimprovement\b/i,
      /\bmeasured\b/i,
      /\bobserved\b/i,
      /\brose\s+by\b/i,
      /\bfell\s+by\b/i,
      /\bdegrees?\s+(celsius|fahrenheit)\b/i,
      /\bexperiment\s+(showed|found|demonstrated)\b/i,
    ],
  },
  // Statistical claims - percentages and survey data without study context
  {
    type: 'statistical',
    patterns: [
      /\b\d+\s*%\s+of\s+\w+s?\s+(support|oppose|believe|think|say)\b/i, // "75% of Americans support"
      /\b\d+\s+(out\s+)?of\s+\d+\b/i, // X out of Y
      /\brate\s+(dropped|increased|rose|fell)\b/i,
      /\bmajority\s+of\b/i,
      /\b(most|many|few|some)\s+\w+s?\s+(are|is|support|oppose)\b/i,
      /\bsurvey\s+(shows|found|indicates)\b/i,
      /\bpoll\s+(shows|found|indicates)\b/i,
    ],
  },
  // Historical claims
  {
    type: 'historical',
    patterns: [
      /\bin\s+\d{4}\b/, // in 1964, etc.
      /\bwas\s+passed\s+in\b/i,
      /\bended\s+in\b/i,
      /\bstarted\s+in\b/i,
      /\boccurred\s+in\b/i,
      /\bhistorically\b/i,
      /\bin\s+the\s+\d{4}s\b/, // in the 1960s
    ],
  },
];

/**
 * Domain keyword mappings
 */
const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  medicine: [
    'drug', 'vaccine', 'treatment', 'disease', 'patient', 'symptom',
    'clinical', 'medical', 'health', 'hospital', 'doctor', 'therapy',
    'medicine', 'pharmaceutical', 'diagnosis', 'cancer', 'diabetes',
    'heart', 'surgery', 'prescription', 'FDA', 'CDC',
  ],
  climate: [
    'climate', 'warming', 'carbon', 'emissions', 'temperature',
    'environment', 'pollution', 'greenhouse', 'fossil', 'renewable',
    'solar', 'wind', 'energy', 'atmosphere', 'weather', 'IPCC',
  ],
  economics: [
    'economy', 'economic', 'tax', 'tariff', 'inflation', 'gdp',
    'growth', 'employment', 'wage', 'trade', 'fiscal', 'monetary',
    'budget', 'deficit', 'debt', 'recession', 'unemployment',
    'income', 'poverty', 'wealth', 'market', 'stocks',
  ],
  criminology: [
    'crime', 'criminal', 'prison', 'death penalty', 'deterrence',
    'incarceration', 'police', 'justice', 'murder', 'recidivism',
    'felony', 'sentence', 'parole', 'jail', 'arrest', 'conviction',
    'law enforcement', 'homicide', 'theft', 'assault',
  ],
  psychology: [
    'mental', 'psychological', 'therapy', 'cognitive', 'behavior',
    'anxiety', 'depression', 'brain', 'psychiatric', 'counseling',
    'trauma', 'PTSD', 'bipolar', 'schizophrenia', 'addiction',
  ],
  nutrition: [
    'diet', 'food', 'nutrition', 'vitamin', 'supplement', 'obesity',
    'calorie', 'protein', 'carbohydrate', 'fat', 'weight loss',
    'eating', 'meal', 'nutrient',
  ],
  politicalScience: [
    'election', 'voting', 'democracy', 'policy', 'government',
    'political', 'congress', 'legislature', 'senate', 'representative',
    'ballot', 'campaign', 'voter', 'partisan', 'bipartisan',
  ],
  technology: [
    'software', 'algorithm', 'AI', 'artificial intelligence',
    'computer', 'data', 'tech', 'digital', 'internet', 'app',
    'machine learning', 'automation', 'cyber', 'programming',
  ],
  education: [
    'school', 'student', 'teacher', 'learning', 'curriculum',
    'education', 'academic', 'college', 'university', 'classroom',
    'grades', 'test scores', 'graduation', 'literacy',
  ],
  general: [],
};

/**
 * Verifiability explanations for each claim type
 */
const VERIFIABILITY_EXPLANATIONS: Record<ClaimType, string> = {
  empirical: 'This empirical claim can be tested with direct observations or measurements.',
  causal: 'This causal claim can be evaluated with research studying cause-effect relationships.',
  statistical: 'This statistical claim can be verified against data and surveys.',
  historical: 'This historical claim can be verified against records and documentation.',
  scientific_consensus: 'Claims about scientific consensus can be verified through literature review.',
  predictive: 'This predictive claim can be partially verified by examining mechanisms and past predictions.',
  comparative: 'This comparative claim can be partially verified if specific criteria are defined.',
  effectiveness: 'This effectiveness claim can be evaluated with defined metrics and outcomes.',
  values: 'This is a values claim that cannot be empirically verified - it reflects moral or ethical judgments.',
  aesthetic: 'This is an aesthetic claim about taste or preference that cannot be empirically tested.',
  definitional: 'This is a definitional claim about the meaning of terms that cannot be empirically resolved.',
  unfalsifiable: 'This claim is structured in a way that makes it impossible to test or disprove.',
};

/**
 * Check if a claim type is verifiable (fully or partially)
 */
export function isVerifiable(type: ClaimType): boolean {
  return VERIFIABLE_CLAIM_TYPES.includes(type) || PARTIALLY_VERIFIABLE_CLAIM_TYPES.includes(type);
}

/**
 * Check if a claim type is partially verifiable
 */
export function isPartiallyVerifiable(type: ClaimType): boolean {
  return PARTIALLY_VERIFIABLE_CLAIM_TYPES.includes(type);
}

/**
 * Check if a claim type is non-verifiable
 */
export function isNonVerifiable(type: ClaimType): boolean {
  return NON_VERIFIABLE_CLAIM_TYPES.includes(type);
}

/**
 * Get verifiability explanation for a claim type
 */
export function getVerifiabilityExplanation(type: ClaimType): string {
  return VERIFIABILITY_EXPLANATIONS[type] || 'Verifiability depends on the specific claim content.';
}

/**
 * Detect the academic domain of a claim
 */
export function detectDomain(claimText: string): Domain {
  const lowercaseText = claimText.toLowerCase();

  // Score each domain based on keyword matches
  const domainScores: Partial<Record<Domain, number>> = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (domain === 'general') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword.toLowerCase())) {
        score++;
      }
    }

    if (score > 0) {
      domainScores[domain as Domain] = score;
    }
  }

  // Find domain with highest score
  let maxScore = 0;
  let detectedDomain: Domain = 'general';

  for (const [domain, score] of Object.entries(domainScores)) {
    if (score! > maxScore) {
      maxScore = score!;
      detectedDomain = domain as Domain;
    }
  }

  return detectedDomain;
}

/**
 * Classify a claim text into its type
 */
export function classifyClaim(claimText: string): ClaimClassification {
  // Check against each pattern type in order of priority
  let detectedType: ClaimType = 'empirical'; // default

  for (const { type, patterns } of CLAIM_TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(claimText)) {
        detectedType = type;
        break;
      }
    }
    // If we found a match, stop searching
    if (detectedType !== 'empirical' || CLAIM_TYPE_PATTERNS[0].type === detectedType) {
      // Found a match for this type
      const matchedConfig = CLAIM_TYPE_PATTERNS.find(c => c.type === detectedType);
      if (matchedConfig && matchedConfig.patterns.some(p => p.test(claimText))) {
        break;
      }
    }
  }

  // Detect domain
  const domain = detectDomain(claimText);

  // Detect subDomain if applicable
  let subDomain: string | undefined;
  if (domain === 'criminology') {
    if (claimText.toLowerCase().includes('deterr')) {
      subDomain = 'deterrence';
    } else if (claimText.toLowerCase().includes('recidiv')) {
      subDomain = 'recidivism';
    } else if (claimText.toLowerCase().includes('incarcerat')) {
      subDomain = 'incarceration';
    }
  }

  return {
    type: detectedType,
    isVerifiable: isVerifiable(detectedType),
    verifiabilityReason: getVerifiabilityExplanation(detectedType),
    domain,
    subDomain,
  };
}

/**
 * Export all functions
 */
export {
  CLAIM_TYPE_PATTERNS,
  DOMAIN_KEYWORDS,
  VERIFIABILITY_EXPLANATIONS,
};
