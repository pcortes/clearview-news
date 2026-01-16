import { Request, Response } from 'express';
import { openaiService } from '../services/openai';
import { searchAcademic, searchExpertCommentary } from '../services/exa';
import { verifyDOI } from '../services/crossref';
import cache from '../services/cache';
import crypto from 'crypto';

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 3600;

// Generate cache key
function getCacheKey(topic: string, coreArgument: string): string {
  const hash = crypto.createHash('md5').update(`${topic}:${coreArgument}`).digest('hex');
  return `evidence:${hash}`;
}

/**
 * Build search queries to find research on BOTH sides of an argument
 */
function buildResearchQueries(topic: string, coreArgument: string): string[] {
  // Extract key concepts from the argument
  const queries = [
    // Direct research on the topic
    `${topic} research study evidence`,
    `${topic} academic meta-analysis`,
    // Look for supporting evidence
    `${topic} benefits effectiveness study`,
    // Look for opposing evidence
    `${topic} problems risks criticism research`,
    // Expert perspectives
    `${topic} expert analysis policy`,
  ];

  return queries;
}

export async function getEvidence(req: Request, res: Response): Promise<void> {
  const { topic, coreArgument, summaryText } = req.body;

  // Use summaryText to infer core argument if not provided
  const argument = coreArgument || summaryText || topic;

  try {
    // Check cache first
    const cacheKey = getCacheKey(topic, argument);
    const cached = await cache.get<any>(cacheKey);

    if (cached) {
      console.log(`[Evidence] Cache hit for topic: ${topic}`);
      res.json({ ...cached, cached: true });
      return;
    }

    console.log(`[Evidence] Researching expert evidence for: "${topic}"`);
    console.log(`[Evidence] Core argument: "${argument.substring(0, 100)}..."`);

    // Build search queries for academic research
    const queries = buildResearchQueries(topic, argument);

    // Search for academic papers (research studies, meta-analyses)
    const academicSearches = queries.slice(0, 3).map(q =>
      searchAcademic(q, 5).catch(err => {
        console.log(`[Evidence] Academic search failed for "${q}":`, err.message);
        return { results: [] };
      })
    );

    // Search for expert commentary (policy analysis, expert opinions)
    const expertSearches = queries.slice(3).map(q =>
      searchExpertCommentary(q, 4).catch(err => {
        console.log(`[Evidence] Expert search failed for "${q}":`, err.message);
        return { results: [] };
      })
    );

    const [academicResults, expertResults] = await Promise.all([
      Promise.all(academicSearches),
      Promise.all(expertSearches),
    ]);

    // Flatten and dedupe results
    const allAcademic = academicResults.flatMap(r => r.results);
    const allExpert = expertResults.flatMap(r => r.results);

    // Remove duplicates by URL
    const seenUrls = new Set<string>();
    const dedupeAcademic = allAcademic.filter(r => {
      if (seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return true;
    }).slice(0, 10);

    const dedupeExpert = allExpert.filter(r => {
      if (seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return true;
    }).slice(0, 6);

    console.log(`[Evidence] Found ${dedupeAcademic.length} academic, ${dedupeExpert.length} expert sources`);

    // Combine Exa results for GPT synthesis
    const exaResults = {
      academic: dedupeAcademic,
      expert: dedupeExpert,
    };

    // Use GPT to synthesize what experts/research say
    const synthesis = await openaiService.synthesizeEvidence(topic, argument, exaResults);

    // Verify DOIs for key studies
    const studiesWithVerification = await Promise.all(
      (synthesis.keyStudies || []).map(async (study) => {
        if (study.doi) {
          const isValid = await verifyDOI(study.doi);
          return { ...study, doiVerified: isValid };
        }
        return { ...study, doiVerified: false };
      })
    );

    // Build response
    const response = {
      topic,
      coreQuestion: synthesis.coreQuestion,
      expertConsensus: synthesis.expertConsensus,
      evidenceFor: synthesis.evidenceFor || [],
      evidenceAgainst: synthesis.evidenceAgainst || [],
      keyStudies: studiesWithVerification,
      expertVoices: synthesis.expertVoices || [],
      bottomLine: synthesis.bottomLine,
      cached: false,
    };

    // Cache the result
    await cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    console.error('[Evidence] Error:', (error as Error).message);
    res.status(500).json({
      error: 'Failed to get evidence',
      message: (error as Error).message,
    });
  }
}
