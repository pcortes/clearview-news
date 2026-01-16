import { searchFactCheck } from './exa';

/**
 * Extract key entities from article text that need verification
 * Focus on: people with titles, organizations, recent events
 */
function extractEntities(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const entities: Set<string> = new Set();

  // Pattern for "Title Name" like "Secretary John Smith", "President Biden"
  const titlePatterns = [
    /(?:President|Secretary|Director|Chairman|CEO|Governor|Senator|Representative|Mayor|Chief|Minister|Commissioner)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g,
    /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:is|was|as|became)\s+(?:the\s+)?(?:new\s+)?(?:President|Secretary|Director|Chairman|CEO|Governor|Senator|Representative|Mayor|Chief|Minister|Commissioner)/gi,
  ];

  for (const pattern of titlePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => entities.add(m.trim()));
    }
  }

  // Extract department/agency mentions with leadership
  const deptPatterns = [
    /(?:DHS|Department of Homeland Security|FBI|CIA|DOJ|Department of Justice|State Department|Treasury|Pentagon|Defense Department)(?:\s+(?:Secretary|Director|Chief))?/gi,
  ];

  for (const pattern of deptPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.slice(0, 2).forEach(m => entities.add(`current ${m.trim()} leadership 2025`));
    }
  }

  // Limit to most relevant entities
  return Array.from(entities).slice(0, 5);
}

/**
 * Get current facts from Exa to ground the LLM
 */
export async function getFactGrounding(
  title: string,
  content: string
): Promise<string> {
  const entities = extractEntities(title, content);

  if (entities.length === 0) {
    console.log('[FactGrounding] No entities to verify');
    return '';
  }

  console.log(`[FactGrounding] Verifying ${entities.length} entities:`, entities);

  try {
    // Search for each entity in parallel
    const searches = entities.map(async (entity) => {
      try {
        const results = await searchFactCheck(entity, 3);
        if (results.results.length > 0) {
          return {
            entity,
            facts: results.results.map(r => `- ${r.title}: ${r.snippet.substring(0, 200)}`).join('\n'),
          };
        }
        return null;
      } catch (err) {
        console.log(`[FactGrounding] Failed to verify "${entity}":`, err);
        return null;
      }
    });

    const results = (await Promise.all(searches)).filter(Boolean);

    if (results.length === 0) {
      return '';
    }

    // Format as context for the LLM
    const groundingContext = results
      .map(r => `### ${r!.entity}\n${r!.facts}`)
      .join('\n\n');

    console.log(`[FactGrounding] Found context for ${results.length} entities`);

    return `
CURRENT VERIFIED INFORMATION (from web search, January 2025):
${groundingContext}

Use this verified information when analyzing the article. Do NOT contradict these current facts.
`;
  } catch (err) {
    console.error('[FactGrounding] Error:', err);
    return '';
  }
}
