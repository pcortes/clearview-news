import { Request, Response } from 'express';
import { searchNews } from '../services/exa';
import { getSourceLean, Lean } from '../utils/sourceLean';
import cache from '../services/cache';
import crypto from 'crypto';

// Cache TTL: 6 hours
const CACHE_TTL = 6 * 3600;

// Lean spectrum for calculating "distance" (further = more diverse perspective)
const LEAN_SPECTRUM: Lean[] = ['left', 'center-left', 'center', 'center-right', 'right'];

// Generate cache key from topic
function getCacheKey(topic: string, keywords: string[], articleLean?: string): string {
  const hash = crypto.createHash('md5').update(`${topic}:${keywords.join(',')}:${articleLean || ''}`).digest('hex');
  return `perspectives:${hash}`;
}

/**
 * Calculate perspective diversity score - higher = more valuable for balance
 * Prioritizes: 1) Opposite lean, 2) Neutral/center, 3) Similar lean
 */
function getPerspectiveScore(sourceLean: Lean, articleLean: string | undefined): number {
  if (!articleLean || articleLean === 'none') {
    // No lean detected - prioritize center sources
    return sourceLean === 'center' ? 100 : 50;
  }

  const articleIndex = LEAN_SPECTRUM.indexOf(articleLean as Lean);
  const sourceIndex = LEAN_SPECTRUM.indexOf(sourceLean);

  if (articleIndex === -1) return 50; // Unknown article lean

  // Distance from article's lean (0-4)
  const distance = Math.abs(sourceIndex - articleIndex);

  // Score: opposite lean (distance 3-4) = 100, center = 80, same lean = 20
  if (distance >= 3) return 100;  // Opposite side
  if (distance === 2) return 80;  // Far enough to be different
  if (sourceLean === 'center') return 70;  // Center is always good
  if (distance === 1) return 40;  // Adjacent lean
  return 20;  // Same lean (still show, but lower priority)
}

export async function getPerspectives(req: Request, res: Response): Promise<void> {
  const { topic, keywords, articleLean } = req.body;

  try {
    // Check cache first
    const cacheKey = getCacheKey(topic, keywords, articleLean);
    const cached = await cache.get<any>(cacheKey);

    if (cached) {
      console.log(`[Perspectives] Cache hit for topic: ${topic}`);
      res.json({ ...cached, cached: true });
      return;
    }

    console.log(`[Perspectives] Searching perspectives for: "${topic}" (article lean: ${articleLean || 'unknown'})`);

    // Build search query from topic and keywords
    const searchQuery = `${topic} ${keywords.join(' ')}`;

    // Search for news articles on this topic
    const searchResults = await searchNews(searchQuery, 15); // Get more to allow filtering

    // Transform and add source lean + perspective score
    const sources = searchResults.results.map(result => {
      const lean = getSourceLean(result.url) || 'center';
      return {
        name: extractSourceName(result.url),
        url: result.url,
        title: result.title,
        lean,
        snippet: result.snippet.substring(0, 150) + '...',
        _score: getPerspectiveScore(lean, articleLean),
      };
    });

    // Sort by perspective score (most diverse/opposite first)
    sources.sort((a, b) => b._score - a._score);

    // Take top 8 and remove internal score
    const topSources = sources.slice(0, 8).map(({ _score, ...rest }) => rest);

    // Build response
    const response = {
      topic,
      articleLean: articleLean || 'unknown',
      sources: topSources,
      cached: false,
    };

    // Cache the result
    await cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    console.error('[Perspectives] Error:', (error as Error).message);
    res.status(500).json({
      error: 'Failed to get perspectives',
      message: (error as Error).message,
    });
  }
}

// Helper to extract source name from URL
function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and common TLDs for cleaner display
    const name = hostname
      .replace(/^www\./, '')
      .replace(/\.(com|org|net|gov|edu|co\.uk)$/, '');

    // Capitalize first letter of each word
    return name
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Unknown Source';
  }
}
