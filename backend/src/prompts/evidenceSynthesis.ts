/**
 * Evidence synthesis prompt template for processing Exa search results.
 * Used by OpenAI service to synthesize scientific evidence and expert commentary.
 */

export const EVIDENCE_SYNTHESIS_PROMPT = `You are a research analyst specializing in evidence-based analysis. Your task is to synthesize scientific evidence and expert commentary from search results.

TOPIC: {{topic}}

CLAIMS TO VERIFY:
{{claims}}

SEARCH RESULTS (from Exa):
{{exaResults}}

Analyze the search results and provide a JSON response with:

1. "summary": A 100-200 word synthesis of the evidence found. Be objective and balanced.

2. "evidenceStrength": One of:
   - "strong": Multiple high-quality studies with consistent findings
   - "moderate": Some quality evidence but with limitations
   - "limited": Few studies or mostly preliminary evidence
   - "contested": Conflicting evidence or significant scientific debate

3. "studies": Array of relevant studies found (max 5):
   [{
     "title": "Study title",
     "authors": ["Author names"],
     "year": 2024,
     "journal": "Journal name if available",
     "doi": "DOI if available",
     "doiVerified": false,
     "finding": "Key finding in 1-2 sentences",
     "url": "Source URL"
   }]

4. "expertCommentary": Array of expert quotes found (max 3):
   [{
     "expert": "Expert name",
     "affiliation": "Organization/institution",
     "quote": "Direct quote or paraphrase",
     "sourceUrl": "Where this was found"
   }]

5. "limitations": Brief note on evidence limitations or gaps (1-2 sentences)

IMPORTANT:
- Only include information actually found in the search results
- Do NOT fabricate or hallucinate citations, studies, or expert quotes
- If evidence is limited, say so honestly
- Distinguish between peer-reviewed research and other sources
- Output valid JSON only`;

/**
 * Generates the evidence synthesis prompt with search context filled in.
 * @param topic - The topic being researched
 * @param claims - Array of claims to verify
 * @param exaResults - Raw Exa search results
 * @returns Formatted prompt string
 */
export function generateEvidenceSynthesisPrompt(
  topic: string,
  claims: string[],
  exaResults: any
): string {
  const formattedClaims = claims.map((claim, i) => `${i + 1}. ${claim}`).join('\n');
  const formattedResults = JSON.stringify(exaResults, null, 2);

  return EVIDENCE_SYNTHESIS_PROMPT
    .replace('{{topic}}', topic)
    .replace('{{claims}}', formattedClaims)
    .replace('{{exaResults}}', formattedResults);
}

/**
 * Expected response structure from the evidence synthesis prompt.
 */
export interface EvidenceSynthesisResponse {
  summary: string;
  evidenceStrength: 'strong' | 'moderate' | 'limited' | 'contested';
  studies: {
    title: string;
    authors: string[];
    year: number;
    journal?: string;
    doi?: string;
    doiVerified: boolean;
    finding: string;
    url: string;
  }[];
  expertCommentary: {
    expert: string;
    affiliation: string;
    quote: string;
    sourceUrl: string;
  }[];
  limitations: string;
}
