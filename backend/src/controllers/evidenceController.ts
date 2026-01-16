import { Request, Response } from 'express';
import { openaiService } from '../services/openai';
import { searchAcademic, searchExpertCommentary } from '../services/exa';
import { verifyDOI } from '../services/crossref';
import cache from '../services/cache';
import crypto from 'crypto';

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 3600;

// Generate cache key from topic and claims
function getCacheKey(topic: string, claims: string[]): string {
  const hash = crypto.createHash('md5').update(`${topic}:${claims.join(',')}`).digest('hex');
  return `evidence:${hash}`;
}

export async function getEvidence(req: Request, res: Response): Promise<void> {
  const { topic, claims } = req.body;

  try {
    // Check cache first
    const cacheKey = getCacheKey(topic, claims);
    const cached = await cache.get<any>(cacheKey);

    if (cached) {
      console.log(`[Evidence] Cache hit for topic: ${topic}`);
      res.json({ ...cached, cached: true });
      return;
    }

    console.log(`[Evidence] Researching evidence for: "${topic}"`);

    // Search for academic papers and expert commentary in parallel
    const [academicResults, expertResults] = await Promise.all([
      searchAcademic(topic, 8),
      searchExpertCommentary(topic, 5),
    ]);

    // Combine Exa results for GPT synthesis
    const exaResults = {
      academic: academicResults.results,
      expert: expertResults.results,
    };

    // Use GPT to synthesize the evidence
    const synthesis = await openaiService.synthesizeEvidence(topic, claims, exaResults);

    // Verify DOIs for studies that have them
    const studiesWithVerification = await Promise.all(
      synthesis.studies.map(async (study) => {
        if (study.doi) {
          const isValid = await verifyDOI(study.doi);
          return {
            ...study,
            doiVerified: isValid,
            verificationNote: isValid ? undefined : 'Could not verify citation - treat with caution',
          };
        }
        return {
          ...study,
          doiVerified: false,
          verificationNote: 'No DOI provided',
        };
      })
    );

    // Build response
    const response = {
      topic,
      summary: synthesis.summary,
      evidence_strength: synthesis.evidenceStrength,
      studies: studiesWithVerification.map(study => ({
        title: study.title,
        authors: study.authors,
        year: study.year,
        journal: study.journal,
        doi: study.doi,
        doi_verified: study.doiVerified,
        verification_note: study.verificationNote,
        finding: study.finding,
        url: study.url,
      })),
      expert_commentary: synthesis.expertCommentary.map(comment => ({
        expert: comment.expert,
        affiliation: comment.affiliation,
        quote: comment.quote,
        source_url: comment.sourceUrl,
      })),
      limitations: synthesis.limitations,
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
