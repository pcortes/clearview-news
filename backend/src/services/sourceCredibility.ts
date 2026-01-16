/**
 * SourceCredibility Service
 * Wave 3, Agent 12 - Assesses source credibility and builds disclosures
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 5
 */

import { getThinkTankLean, isThinkTank } from '../config/thinkTankLeans';
import { PoliticalLean } from '../config/thinkTankLeans';

/**
 * Source type categories
 */
export type SourceType =
  | 'academic'
  | 'government'
  | 'think_tank'
  | 'preprint'
  | 'working_paper'
  | 'news'
  | 'unknown';

/**
 * Source credibility assessment result
 */
export interface SourceCredibility {
  credibilityScore: number; // 0-1 scale
  sourceType: SourceType;
  politicalLean?: PoliticalLean;
  isPeerReviewed: boolean;
  caveats: string[];
}

/**
 * Source metadata
 */
export interface SourceMetadata {
  name: string;
  sourceType: SourceType;
  impactFactor?: number;
  isPeerReviewed: boolean;
  credibilityBase: number;
}

/**
 * Input for credibility assessment
 */
export interface SourceInput {
  url: string;
  title: string;
}

/**
 * Database of known academic sources with credibility scores
 */
const ACADEMIC_SOURCES: Record<string, SourceMetadata> = {
  'nature.com': {
    name: 'Nature',
    sourceType: 'academic',
    impactFactor: 64.8,
    isPeerReviewed: true,
    credibilityBase: 0.95,
  },
  'science.org': {
    name: 'Science',
    sourceType: 'academic',
    impactFactor: 63.7,
    isPeerReviewed: true,
    credibilityBase: 0.95,
  },
  'nejm.org': {
    name: 'New England Journal of Medicine',
    sourceType: 'academic',
    impactFactor: 176.1,
    isPeerReviewed: true,
    credibilityBase: 0.95,
  },
  'thelancet.com': {
    name: 'The Lancet',
    sourceType: 'academic',
    impactFactor: 202.7,
    isPeerReviewed: true,
    credibilityBase: 0.95,
  },
  'jamanetwork.com': {
    name: 'JAMA (Journal of the American Medical Association)',
    sourceType: 'academic',
    impactFactor: 120.7,
    isPeerReviewed: true,
    credibilityBase: 0.92,
  },
  'bmj.com': {
    name: 'BMJ (British Medical Journal)',
    sourceType: 'academic',
    impactFactor: 93.3,
    isPeerReviewed: true,
    credibilityBase: 0.90,
  },
  'pubmed.gov': {
    name: 'PubMed',
    sourceType: 'academic',
    isPeerReviewed: true, // content is peer-reviewed
    credibilityBase: 0.90,
  },
  'pnas.org': {
    name: 'PNAS (Proceedings of the National Academy of Sciences)',
    sourceType: 'academic',
    impactFactor: 12.8,
    isPeerReviewed: true,
    credibilityBase: 0.88,
  },
  'cell.com': {
    name: 'Cell',
    sourceType: 'academic',
    impactFactor: 66.9,
    isPeerReviewed: true,
    credibilityBase: 0.95,
  },
  'cochranelibrary.com': {
    name: 'Cochrane Library',
    sourceType: 'academic',
    isPeerReviewed: true,
    credibilityBase: 0.98,
  },
};

/**
 * Government source domains
 */
const GOVERNMENT_SOURCES: Record<string, SourceMetadata> = {
  'cdc.gov': {
    name: 'Centers for Disease Control and Prevention',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.90,
  },
  'bls.gov': {
    name: 'Bureau of Labor Statistics',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.92,
  },
  'census.gov': {
    name: 'U.S. Census Bureau',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.92,
  },
  'nih.gov': {
    name: 'National Institutes of Health',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.90,
  },
  'fda.gov': {
    name: 'Food and Drug Administration',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.88,
  },
  'epa.gov': {
    name: 'Environmental Protection Agency',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.85,
  },
  'bea.gov': {
    name: 'Bureau of Economic Analysis',
    sourceType: 'government',
    isPeerReviewed: false,
    credibilityBase: 0.92,
  },
};

/**
 * Preprint server domains
 */
const PREPRINT_SOURCES: Record<string, SourceMetadata> = {
  'arxiv.org': {
    name: 'arXiv',
    sourceType: 'preprint',
    isPeerReviewed: false,
    credibilityBase: 0.55,
  },
  'medrxiv.org': {
    name: 'medRxiv',
    sourceType: 'preprint',
    isPeerReviewed: false,
    credibilityBase: 0.50,
  },
  'biorxiv.org': {
    name: 'bioRxiv',
    sourceType: 'preprint',
    isPeerReviewed: false,
    credibilityBase: 0.55,
  },
  'ssrn.com': {
    name: 'SSRN',
    sourceType: 'working_paper',
    isPeerReviewed: false,
    credibilityBase: 0.60,
  },
};

/**
 * Working paper sources
 */
const WORKING_PAPER_SOURCES: Record<string, SourceMetadata> = {
  'nber.org': {
    name: 'National Bureau of Economic Research',
    sourceType: 'working_paper',
    isPeerReviewed: false,
    credibilityBase: 0.75,
  },
};

/**
 * Think tank credibility base scores
 */
const THINK_TANK_CREDIBILITY: Record<PoliticalLean, number> = {
  'academic': 0.80,
  'nonpartisan': 0.75,
  'center': 0.70,
  'center-left': 0.65,
  'center-right': 0.65,
  'left': 0.55,
  'right': 0.55,
  'libertarian': 0.60,
};

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  let domain = url.replace(/^https?:\/\//, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.split('/')[0];

  // Handle subdomains
  const parts = domain.split('.');
  if (parts.length > 2) {
    domain = parts.slice(-2).join('.');
  }

  return domain.toLowerCase();
}

/**
 * Assess source credibility
 */
export function assessSourceCredibility(input: SourceInput): SourceCredibility {
  const domain = extractDomain(input.url);

  // Check academic sources
  if (ACADEMIC_SOURCES[domain]) {
    const source = ACADEMIC_SOURCES[domain];
    return {
      credibilityScore: source.credibilityBase,
      sourceType: 'academic',
      isPeerReviewed: source.isPeerReviewed,
      caveats: [],
    };
  }

  // Check government sources
  if (GOVERNMENT_SOURCES[domain] || domain.endsWith('.gov')) {
    const source = GOVERNMENT_SOURCES[domain];
    return {
      credibilityScore: source?.credibilityBase || 0.85,
      sourceType: 'government',
      isPeerReviewed: false,
      caveats: [],
    };
  }

  // Check preprint sources
  if (PREPRINT_SOURCES[domain]) {
    const source = PREPRINT_SOURCES[domain];
    return {
      credibilityScore: source.credibilityBase,
      sourceType: 'preprint',
      isPeerReviewed: false,
      caveats: ['Not peer-reviewed'],
    };
  }

  // Check working paper sources
  if (WORKING_PAPER_SOURCES[domain]) {
    const source = WORKING_PAPER_SOURCES[domain];
    return {
      credibilityScore: source.credibilityBase,
      sourceType: 'working_paper',
      isPeerReviewed: false,
      caveats: ['Not peer-reviewed'],
    };
  }

  // Check think tanks
  const thinkTankInfo = getThinkTankLean(input.url);
  if (thinkTankInfo) {
    const baseScore = THINK_TANK_CREDIBILITY[thinkTankInfo.lean] || 0.5;
    return {
      credibilityScore: baseScore,
      sourceType: 'think_tank',
      politicalLean: thinkTankInfo.lean,
      isPeerReviewed: false,
      caveats: [`Political lean: ${thinkTankInfo.lean}`],
    };
  }

  // Unknown source
  return {
    credibilityScore: 0.3,
    sourceType: 'unknown',
    isPeerReviewed: false,
    caveats: ['Unknown source - verify independently'],
  };
}

/**
 * Build source disclosure string
 */
export function buildSourceDisclosure(input: SourceInput): string {
  const credibility = assessSourceCredibility(input);
  const parts: string[] = [];

  // Source type
  switch (credibility.sourceType) {
    case 'academic':
      parts.push('Peer-reviewed academic source');
      break;
    case 'government':
      parts.push('Government source');
      break;
    case 'think_tank':
      parts.push('Think tank');
      if (credibility.politicalLean) {
        parts.push(`(${credibility.politicalLean})`);
      }
      break;
    case 'preprint':
      parts.push('Preprint (not peer-reviewed)');
      break;
    case 'working_paper':
      parts.push('Working paper (not peer-reviewed)');
      break;
    default:
      parts.push('Unknown source');
  }

  return parts.join(' ');
}

/**
 * Get source metadata
 */
export function getSourceMetadata(url: string): SourceMetadata | null {
  const domain = extractDomain(url);

  if (ACADEMIC_SOURCES[domain]) {
    return ACADEMIC_SOURCES[domain];
  }

  if (GOVERNMENT_SOURCES[domain]) {
    return GOVERNMENT_SOURCES[domain];
  }

  if (PREPRINT_SOURCES[domain]) {
    return PREPRINT_SOURCES[domain];
  }

  if (WORKING_PAPER_SOURCES[domain]) {
    return WORKING_PAPER_SOURCES[domain];
  }

  return null;
}

/**
 * Check if URL is from an academic source
 */
export function isAcademicSource(url: string): boolean {
  const domain = extractDomain(url);
  return !!ACADEMIC_SOURCES[domain];
}

/**
 * Check if URL is from a government source
 */
export function isGovernmentSource(url: string): boolean {
  const domain = extractDomain(url);
  return !!GOVERNMENT_SOURCES[domain] || domain.endsWith('.gov');
}

/**
 * Check if URL is from a think tank
 */
export function isThinkTankSource(url: string): boolean {
  return isThinkTank(url);
}

/**
 * Check if URL is from a preprint server
 */
export function isPreprintSource(url: string): boolean {
  const domain = extractDomain(url);
  return !!PREPRINT_SOURCES[domain];
}
