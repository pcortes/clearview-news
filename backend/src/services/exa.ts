// eslint-disable-next-line @typescript-eslint/no-var-requires
const Exa = require('exa-js').default || require('exa-js');

// Type for Exa client (since types may not be available)
type ExaClient = {
  searchAndContents: (query: string, options: Record<string, unknown>) => Promise<{ results: unknown[] }>;
};

// Types for search results
export interface ExaSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  author?: string;
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
}

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Get API key from environment
const EXA_API_KEY = process.env.EXA_API_KEY;

// Singleton Exa client instance
let exaClient: ExaClient | null = null;

/**
 * Get or create the Exa client instance
 */
function getClient(): ExaClient {
  if (!EXA_API_KEY) {
    throw new Error('EXA_API_KEY environment variable is not set');
  }

  if (!exaClient) {
    exaClient = new Exa(EXA_API_KEY) as ExaClient;
  }

  return exaClient;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx) except rate limits (429)
      if ('status' in (error as any)) {
        const status = (error as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw lastError;
        }
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `[Exa] ${operation} failed (attempt ${attempt + 1}/${MAX_RETRIES}), ` +
          `retrying in ${delay}ms: ${lastError.message}`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${operation} failed after ${MAX_RETRIES} attempts`);
}

// Raw result type from Exa API
interface RawExaResult {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
  author?: string;
}

/**
 * Transform raw Exa API results to our standardized format
 */
function transformResults(results: unknown[]): ExaSearchResult[] {
  return results.map((result) => {
    const r = result as RawExaResult;
    return {
      title: r.title || '',
      url: r.url || '',
      snippet: r.text || r.highlights?.[0] || '',
      publishedDate: r.publishedDate || undefined,
      author: r.author || undefined,
    };
  });
}

/**
 * Search for news articles on a topic
 * @param topic - The topic to search for
 * @param numResults - Number of results to return (default: 10)
 */
export async function searchNews(
  topic: string,
  numResults: number = 10
): Promise<ExaSearchResponse> {
  const client = getClient();

  const response = await withRetry(
    () =>
      client.searchAndContents(topic, {
        type: 'neural',
        useAutoprompt: true,
        numResults,
        category: 'news',
        text: { maxCharacters: 500 },
      }),
    'searchNews'
  );

  return {
    results: transformResults(response.results),
  };
}

/**
 * Search for academic/research papers on a topic
 * @param topic - The topic to search for
 * @param numResults - Number of results to return (default: 10)
 */
export async function searchAcademic(
  topic: string,
  numResults: number = 10
): Promise<ExaSearchResponse> {
  const client = getClient();

  const response = await withRetry(
    () =>
      client.searchAndContents(topic, {
        type: 'neural',
        useAutoprompt: true,
        numResults,
        category: 'research paper',
        text: { maxCharacters: 500 },
      }),
    'searchAcademic'
  );

  return {
    results: transformResults(response.results),
  };
}

/**
 * Search for expert commentary (news, interviews) on a topic
 * @param topic - The topic to search for
 * @param numResults - Number of results to return (default: 10)
 */
export async function searchExpertCommentary(
  topic: string,
  numResults: number = 10
): Promise<ExaSearchResponse> {
  const client = getClient();

  // Search for expert opinions, interviews, and analysis
  const response = await withRetry(
    () =>
      client.searchAndContents(`${topic} expert opinion OR interview OR analysis`, {
        type: 'neural',
        useAutoprompt: true,
        numResults,
        category: 'news',
        text: { maxCharacters: 500 },
      }),
    'searchExpertCommentary'
  );

  return {
    results: transformResults(response.results).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      publishedDate: result.publishedDate,
      // Expert commentary typically doesn't include author in the same way
    })),
  };
}

/**
 * Search for fact verification - get current info about entities/claims
 * @param query - The fact or entity to verify
 * @param numResults - Number of results to return (default: 5)
 */
export async function searchFactCheck(
  query: string,
  numResults: number = 5
): Promise<ExaSearchResponse> {
  const client = getClient();

  const response = await withRetry(
    () =>
      client.searchAndContents(query, {
        type: 'neural',
        useAutoprompt: true,
        numResults,
        text: { maxCharacters: 300 },
      }),
    'searchFactCheck'
  );

  return {
    results: transformResults(response.results),
  };
}

/**
 * Check if the Exa service is configured (API key is set)
 */
export function isConfigured(): boolean {
  return !!EXA_API_KEY;
}

// Default export with all methods
export default {
  searchNews,
  searchAcademic,
  searchExpertCommentary,
  searchFactCheck,
  isConfigured,
};
