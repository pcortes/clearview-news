// API client for streaming responses

const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface StreamCallbacks {
  onStatus?: (message: string) => void;
  onSummaryChunk?: (chunk: string, full: string) => void;
  onSummary?: (text: string) => void;
  onKeyFact?: (fact: string) => void;
  onKeyFacts?: (facts: string[]) => void;
  onMissingContextItem?: (item: string) => void;
  onMissingContext?: (items: string[]) => void;
  onBiasIndicator?: (indicator: { original_text: string; type: string; explanation: string }) => void;
  onBiasIndicators?: (indicators: any[]) => void;
  onComplete?: (data: { id: string; is_political: boolean; cached: boolean }) => void;
  onError?: (message: string) => void;
}

export async function analyzeArticleStream(
  article: { url: string; content: string; title: string; source: string },
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(article),
  });

  if (!response.ok) {
    const error = await response.json();
    callbacks.onError?.(error.message || 'Analysis failed');
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.('No response stream');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete events in buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7);
      } else if (line.startsWith('data: ') && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          handleEvent(currentEvent, data, callbacks);
        } catch (e) {
          console.error('[API] Failed to parse event data:', line);
        }
        currentEvent = '';
      }
    }
  }
}

function handleEvent(event: string, data: any, callbacks: StreamCallbacks): void {
  switch (event) {
    case 'status':
      callbacks.onStatus?.(data.message);
      break;
    case 'summaryChunk':
      callbacks.onSummaryChunk?.(data.chunk, data.full);
      break;
    case 'summary':
      callbacks.onSummary?.(data.text);
      break;
    case 'keyFact':
      callbacks.onKeyFact?.(data.fact);
      break;
    case 'keyFacts':
      callbacks.onKeyFacts?.(data.facts);
      break;
    case 'missingContextItem':
      callbacks.onMissingContextItem?.(data.item);
      break;
    case 'missingContext':
      callbacks.onMissingContext?.(data.items);
      break;
    case 'biasIndicator':
      callbacks.onBiasIndicator?.(data);
      break;
    case 'biasIndicators':
      callbacks.onBiasIndicators?.(data.indicators);
      break;
    case 'complete':
      callbacks.onComplete?.(data);
      break;
    case 'error':
      callbacks.onError?.(data.message);
      break;
    case 'cached':
      callbacks.onStatus?.('Loading from cache...');
      break;
  }
}
