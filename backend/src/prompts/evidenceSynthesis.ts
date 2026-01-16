/**
 * Evidence synthesis prompt - finds what EXPERTS and RESEARCH say about a topic.
 * NOT for fact-checking article claims - for understanding expert consensus.
 */

export const EVIDENCE_SYNTHESIS_PROMPT = `You are a research analyst helping readers understand what EXPERTS and ACADEMIC RESEARCH say about a topic. Your job is to find evidence that SUPPORTS or REFUTES the core argument/position.

ARTICLE TOPIC: {{topic}}

CORE ARGUMENT/POSITION IN ARTICLE:
{{coreArgument}}

SEARCH RESULTS (academic papers, studies, expert commentary):
{{exaResults}}

Analyze the search results and provide a JSON response:

1. "coreQuestion": Rephrase the core argument as a research question (e.g., "Does the death penalty deter crime?" or "Is universal healthcare more cost-effective?")

2. "expertConsensus": {
   "level": "strong_consensus" | "moderate_consensus" | "divided" | "limited_research",
   "direction": "supports_article" | "refutes_article" | "mixed" | "inconclusive",
   "summary": "2-3 sentences on what the expert/research consensus is"
}

3. "evidenceFor": Array of evidence SUPPORTING the article's position (max 3):
   [{
     "finding": "What the research found (1-2 sentences)",
     "source": "Study/paper title or expert name",
     "sourceType": "peer_reviewed_study" | "meta_analysis" | "expert_opinion" | "government_report" | "think_tank",
     "year": 2024,
     "url": "source URL",
     "strength": "strong" | "moderate" | "weak"
   }]

4. "evidenceAgainst": Array of evidence REFUTING the article's position (max 3):
   [{
     "finding": "What the research found",
     "source": "Study/paper title or expert name",
     "sourceType": "peer_reviewed_study" | "meta_analysis" | "expert_opinion" | "government_report" | "think_tank",
     "year": 2024,
     "url": "source URL",
     "strength": "strong" | "moderate" | "weak"
   }]

5. "keyStudies": Most important/influential studies on this topic (max 3):
   [{
     "title": "Full study title",
     "authors": "Lead author et al.",
     "year": 2024,
     "journal": "Journal name",
     "doi": "DOI if available",
     "keyFinding": "Main conclusion in plain language",
     "citationCount": "high/medium/low influence",
     "url": "URL"
   }]

6. "expertVoices": What named experts say (max 3):
   [{
     "name": "Expert name",
     "credentials": "Title, institution",
     "position": "supports" | "opposes" | "nuanced",
     "quote": "Direct quote or key argument",
     "url": "Source"
   }]

7. "bottomLine": {
   "whatResearchShows": "1-2 sentence plain-language summary of what research actually shows",
   "confidence": "high" | "medium" | "low",
   "caveat": "Key limitation or nuance readers should know"
}

CRITICAL RULES:
- Focus on RESEARCH QUALITY not quantity - one meta-analysis beats 10 opinion pieces
- Be honest if research is limited or consensus is unclear
- Distinguish peer-reviewed research from opinion/commentary
- Do NOT fabricate citations - only use what's in search results
- If evidence is one-sided, note that honestly
- Output valid JSON only`;

/**
 * Generates the evidence synthesis prompt.
 */
export function generateEvidenceSynthesisPrompt(
  topic: string,
  coreArgument: string,
  exaResults: any
): string {
  const formattedResults = JSON.stringify(exaResults, null, 2);

  return EVIDENCE_SYNTHESIS_PROMPT
    .replace('{{topic}}', topic)
    .replace('{{coreArgument}}', coreArgument)
    .replace('{{exaResults}}', formattedResults);
}

/**
 * Expected response structure.
 */
export interface EvidenceSynthesisResponse {
  coreQuestion: string;
  expertConsensus: {
    level: 'strong_consensus' | 'moderate_consensus' | 'divided' | 'limited_research';
    direction: 'supports_article' | 'refutes_article' | 'mixed' | 'inconclusive';
    summary: string;
  };
  evidenceFor: {
    finding: string;
    source: string;
    sourceType: string;
    year: number;
    url: string;
    strength: 'strong' | 'moderate' | 'weak';
  }[];
  evidenceAgainst: {
    finding: string;
    source: string;
    sourceType: string;
    year: number;
    url: string;
    strength: 'strong' | 'moderate' | 'weak';
  }[];
  keyStudies: {
    title: string;
    authors: string;
    year: number;
    journal: string;
    doi?: string;
    keyFinding: string;
    citationCount: string;
    url: string;
  }[];
  expertVoices: {
    name: string;
    credentials: string;
    position: 'supports' | 'opposes' | 'nuanced';
    quote: string;
    url: string;
  }[];
  bottomLine: {
    whatResearchShows: string;
    confidence: 'high' | 'medium' | 'low';
    caveat: string;
  };
}
