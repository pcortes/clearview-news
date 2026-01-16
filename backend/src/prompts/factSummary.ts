/**
 * Fact-focused summary prompt template for article analysis.
 * Used by OpenAI service to extract verifiable facts and identify bias indicators.
 */

export const FACT_SUMMARY_PROMPT = `You are an expert journalist. Analyze this news article and provide a quick, digestible summary.

ARTICLE:
Title: {{title}}
Source: {{source}}
Content: {{content}}

Provide a JSON response with:

1. "biasScore": {
   "score": 0-10 (0=neutral/balanced, 10=heavily biased),
   "label": "Minimal Bias" | "Some Bias" | "Notable Bias" | "Heavy Bias",
   "summary": "One sentence explaining the bias level"
}

2. "summary": {
   "text": "2-3 sentence TLDR. What's the main story? What happened and why does it matter? Be concise and direct - give the gist, not a recap.",
   "keyFacts": ["3-5 verifiable facts from the article"],
   "missingContext": ["important context the article omits or glosses over"]
}

3. "biasIndicators": [{ "originalText": "quoted text", "type": "loaded_language|unsubstantiated|missing_context|framing", "explanation": "brief explanation" }]

4. "isPolitical": true/false

5. "politicalLean": "left" | "center-left" | "center" | "center-right" | "right" | "none"
   (Assess based on language, framing, source selection, and which side's arguments are presented more favorably. Use "none" for non-political articles.)

IMPORTANT: Only include facts from the article. Do NOT hallucinate. Output valid JSON only.`;

/**
 * Generates the fact summary prompt with article details filled in.
 * @param title - Article title
 * @param source - Article source/publisher
 * @param content - Article content/body text
 * @returns Formatted prompt string
 */
export function generateFactSummaryPrompt(
  title: string,
  source: string,
  content: string
): string {
  return FACT_SUMMARY_PROMPT
    .replace('{{title}}', title)
    .replace('{{source}}', source)
    .replace('{{content}}', content);
}

/**
 * Expected response structure from the fact summary prompt.
 */
export interface FactSummaryResponse {
  biasScore: {
    score: number;
    label: 'Minimal Bias' | 'Some Bias' | 'Notable Bias' | 'Heavy Bias';
    summary: string;
  };
  summary: {
    text: string;
    keyFacts: string[];
    missingContext: string[];
  };
  biasIndicators: {
    originalText: string;
    type: 'loaded_language' | 'unsubstantiated' | 'missing_context' | 'framing';
    explanation: string;
  }[];
  isPolitical: boolean;
  politicalLean: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'none';
}
