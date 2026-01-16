import * as cache from './cache';

const CROSSREF_API_BASE = 'https://api.crossref.org/works';
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const CACHE_KEY_PREFIX = 'doi:';

// Optional email for CrossRef polite pool (improves rate limits)
const CROSSREF_EMAIL = process.env.CROSSREF_EMAIL;

export interface DOIMetadata {
  valid: boolean;
  title?: string;
  authors?: string[];
  journal?: string;
  year?: number;
  url?: string;
}

interface CrossRefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossRefWork {
  title?: string[];
  author?: CrossRefAuthor[];
  'container-title'?: string[];
  published?: {
    'date-parts'?: number[][];
  };
  'published-print'?: {
    'date-parts'?: number[][];
  };
  'published-online'?: {
    'date-parts'?: number[][];
  };
  URL?: string;
  DOI?: string;
}

interface CrossRefResponse {
  status: string;
  message: CrossRefWork;
}

/**
 * Build User-Agent header for CrossRef API
 * Including an email puts us in the "polite pool" with better rate limits
 */
function getUserAgent(): string {
  const base = 'ClearViewNews/1.0 (https://github.com/clearview-news)';
  if (CROSSREF_EMAIL) {
    return `${base}; mailto:${CROSSREF_EMAIL}`;
  }
  return base;
}

/**
 * Normalize a DOI string by removing common prefixes
 */
function normalizeDOI(doi: string): string {
  let normalized = doi.trim();

  // Remove common URL prefixes
  const prefixes = [
    'https://doi.org/',
    'http://doi.org/',
    'https://dx.doi.org/',
    'http://dx.doi.org/',
    'doi:',
  ];

  for (const prefix of prefixes) {
    if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
      normalized = normalized.substring(prefix.length);
      break;
    }
  }

  return normalized;
}

/**
 * Extract year from CrossRef date parts
 */
function extractYear(work: CrossRefWork): number | undefined {
  const dateSource = work.published || work['published-print'] || work['published-online'];
  if (dateSource?.['date-parts']?.[0]?.[0]) {
    return dateSource['date-parts'][0][0];
  }
  return undefined;
}

/**
 * Format author name from CrossRef author object
 */
function formatAuthor(author: CrossRefAuthor): string {
  if (author.name) {
    return author.name;
  }
  const parts: string[] = [];
  if (author.given) parts.push(author.given);
  if (author.family) parts.push(author.family);
  return parts.join(' ');
}

/**
 * Parse CrossRef response into DOIMetadata
 */
function parseMetadata(work: CrossRefWork): DOIMetadata {
  const metadata: DOIMetadata = {
    valid: true,
  };

  // Title
  if (work.title?.[0]) {
    metadata.title = work.title[0];
  }

  // Authors
  if (work.author && work.author.length > 0) {
    metadata.authors = work.author.map(formatAuthor).filter(name => name.length > 0);
  }

  // Journal (container-title)
  if (work['container-title']?.[0]) {
    metadata.journal = work['container-title'][0];
  }

  // Year
  const year = extractYear(work);
  if (year) {
    metadata.year = year;
  }

  // URL
  if (work.URL) {
    metadata.url = work.URL;
  } else if (work.DOI) {
    metadata.url = `https://doi.org/${work.DOI}`;
  }

  return metadata;
}

/**
 * Get full metadata for a DOI
 * @param doi - The DOI to look up (can include doi.org prefix)
 * @returns DOI metadata with valid=true if found, valid=false if not
 */
export async function lookupDOI(doi: string): Promise<DOIMetadata> {
  const normalizedDOI = normalizeDOI(doi);

  if (!normalizedDOI) {
    return { valid: false };
  }

  const cacheKey = `${CACHE_KEY_PREFIX}${normalizedDOI}`;

  // Check cache first
  const cached = await cache.get<DOIMetadata>(cacheKey);
  if (cached !== null) {
    console.log(`[CrossRef] Cache hit for DOI: ${normalizedDOI}`);
    return cached;
  }

  console.log(`[CrossRef] Looking up DOI: ${normalizedDOI}`);

  try {
    const response = await fetch(`${CROSSREF_API_BASE}/${encodeURIComponent(normalizedDOI)}`, {
      headers: {
        'User-Agent': getUserAgent(),
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      // DOI not found - cache the negative result
      const result: DOIMetadata = { valid: false };
      await cache.set(cacheKey, result, CACHE_TTL_SECONDS);
      console.log(`[CrossRef] DOI not found: ${normalizedDOI}`);
      return result;
    }

    if (!response.ok) {
      console.warn(`[CrossRef] API error for DOI ${normalizedDOI}: ${response.status} ${response.statusText}`);
      // Don't cache errors - they might be temporary
      return { valid: false };
    }

    const data = await response.json() as CrossRefResponse;
    const metadata = parseMetadata(data.message);

    // Cache the successful result
    await cache.set(cacheKey, metadata, CACHE_TTL_SECONDS);
    console.log(`[CrossRef] Successfully looked up DOI: ${normalizedDOI}`);

    return metadata;
  } catch (error) {
    console.error(`[CrossRef] Error looking up DOI ${normalizedDOI}:`, (error as Error).message);
    // Don't cache network errors - they might be temporary
    return { valid: false };
  }
}

/**
 * Verify if a DOI exists
 * @param doi - The DOI to verify
 * @returns true if the DOI is valid, false otherwise
 */
export async function verifyDOI(doi: string): Promise<boolean> {
  const metadata = await lookupDOI(doi);
  return metadata.valid;
}

/**
 * Batch verify multiple DOIs
 * @param dois - Array of DOIs to verify
 * @returns Map of DOI to valid status
 */
export async function verifyDOIs(dois: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  // Process in parallel for efficiency
  const lookups = dois.map(async (doi) => {
    const normalizedDOI = normalizeDOI(doi);
    const valid = await verifyDOI(doi);
    results.set(normalizedDOI, valid);
  });

  await Promise.all(lookups);

  return results;
}

export default {
  lookupDOI,
  verifyDOI,
  verifyDOIs,
};
