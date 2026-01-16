/**
 * Political lean classification for news sources
 */
export type Lean = 'left' | 'center-left' | 'center' | 'center-right' | 'right';

/**
 * Map of news source domains to their political lean
 * Sources are classified based on generally accepted media bias ratings
 */
const SOURCE_LEANS: Record<string, Lean> = {
  // Left-leaning sources
  'motherjones.com': 'left',
  'thenation.com': 'left',
  'jacobinmag.com': 'left',
  'democracynow.org': 'left',
  'dailykos.com': 'left',
  'huffpost.com': 'left',
  'slate.com': 'left',
  'vox.com': 'left',
  'msnbc.com': 'left',
  'commondreams.org': 'left',

  // Center-left sources
  'nytimes.com': 'center-left',
  'washingtonpost.com': 'center-left',
  'cnn.com': 'center-left',
  'npr.org': 'center-left',
  'theatlantic.com': 'center-left',
  'theguardian.com': 'center-left',
  'newyorker.com': 'center-left',
  'time.com': 'center-left',
  'newsweek.com': 'center-left',
  'latimes.com': 'center-left',
  'usatoday.com': 'center-left',
  'nbcnews.com': 'center-left',
  'cbsnews.com': 'center-left',
  'abcnews.go.com': 'center-left',
  'pbs.org': 'center-left',
  'businessinsider.com': 'center-left',

  // Center sources
  'bbc.com': 'center',
  'bbc.co.uk': 'center',
  'reuters.com': 'center',
  'apnews.com': 'center',
  'economist.com': 'center',
  'politico.com': 'center',
  'axios.com': 'center',
  'csmonitor.com': 'center',
  'thehill.com': 'center',
  'bloomberg.com': 'center',
  'forbes.com': 'center',
  'marketwatch.com': 'center',
  'ft.com': 'center',
  'aljazeera.com': 'center',
  'france24.com': 'center',
  'dw.com': 'center',
  'c-span.org': 'center',
  'propublica.org': 'center',
  'realclearpolitics.com': 'center',

  // Center-right sources
  'wsj.com': 'center-right',
  'theamericanconservative.com': 'center-right',
  'reason.com': 'center-right',
  'nationaljournal.com': 'center-right',
  'weeklystandard.com': 'center-right',
  'washingtonexaminer.com': 'center-right',

  // Right-leaning sources
  'foxnews.com': 'right',
  'nationalreview.com': 'right',
  'nypost.com': 'right',
  'dailywire.com': 'right',
  'breitbart.com': 'right',
  'thefederalist.com': 'right',
  'townhall.com': 'right',
  'dailycaller.com': 'right',
  'theblaze.com': 'right',
  'newsmax.com': 'right',
  'oann.com': 'right',
  'washingtontimes.com': 'right',
  'freebeacon.com': 'right',
};

/**
 * Extract the domain from a URL
 * @param url - The full URL
 * @returns The domain without protocol and www prefix
 */
export function extractDomain(url: string): string {
  try {
    // Handle URLs without protocol
    let normalizedUrl = url;
    if (!url.includes('://')) {
      normalizedUrl = 'https://' + url;
    }

    const urlObj = new URL(normalizedUrl);
    let hostname = urlObj.hostname.toLowerCase();

    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    return hostname;
  } catch (error) {
    // If URL parsing fails, try basic string manipulation
    let domain = url.toLowerCase();

    // Remove protocol
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');

    // Get just the domain part (before any path)
    domain = domain.split('/')[0];

    // Remove port if present
    domain = domain.split(':')[0];

    return domain;
  }
}

/**
 * Get the political lean of a news source based on its URL
 * @param url - The URL of the news source
 * @returns The political lean classification or null if unknown
 */
export function getSourceLean(url: string): Lean | null {
  const domain = extractDomain(url);

  // Direct lookup
  if (SOURCE_LEANS[domain]) {
    return SOURCE_LEANS[domain];
  }

  // Check if domain is a subdomain of a known source
  for (const [sourceDomain, lean] of Object.entries(SOURCE_LEANS)) {
    if (domain.endsWith('.' + sourceDomain)) {
      return lean;
    }
  }

  return null;
}

/**
 * Get all known source domains and their leans
 * Useful for debugging and testing
 */
export function getAllSourceLeans(): Record<string, Lean> {
  return { ...SOURCE_LEANS };
}

/**
 * Check if a URL belongs to a known news source
 * @param url - The URL to check
 * @returns True if the source is in our database
 */
export function isKnownSource(url: string): boolean {
  return getSourceLean(url) !== null;
}

export default {
  getSourceLean,
  extractDomain,
  getAllSourceLeans,
  isKnownSource,
};
