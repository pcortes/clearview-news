// Background service worker for ClearView News extension

const API_BASE_URL = 'http://localhost:3000/api/v1';

interface ExtractedArticle {
  url: string;
  title: string;
  content: string;
  source: string;
  author?: string;
}

interface AnalysisResult {
  id: string;
  summary: {
    text: string;
    key_facts: string[];
    missing_context: string[];
  };
  bias_indicators: {
    original_text: string;
    type: string;
    explanation: string;
  }[];
  is_political: boolean;
  cached: boolean;
}

interface PerspectivesResult {
  topic: string;
  sources: {
    name: string;
    url: string;
    title: string;
    lean: string;
    snippet: string;
  }[];
  cached: boolean;
}

interface EvidenceResult {
  topic: string;
  summary: string;
  evidence_strength: string;
  studies: any[];
  expert_commentary: any[];
  limitations: string;
  cached: boolean;
}

// Store analysis results per tab
const tabAnalysis = new Map<number, {
  article: ExtractedArticle;
  analysis?: AnalysisResult;
  perspectives?: PerspectivesResult;
  evidence?: EvidenceResult;
}>();

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  console.log('[ClearView] Extension icon clicked for tab:', tab.id);

  try {
    // Open the side panel
    await chrome.sidePanel.open({ tabId: tab.id });

    // Send message to side panel that it should start analysis
    chrome.runtime.sendMessage({ type: 'START_ANALYSIS', tabId: tab.id });
  } catch (error) {
    console.error('[ClearView] Error opening side panel:', error);
  }
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[ClearView Background] Received message:', message.type);

  switch (message.type) {
    case 'PAGE_LOADED':
      // Content script notified us page is loaded
      console.log('[ClearView] Page loaded:', message.url);
      sendResponse({ received: true });
      return false;

    case 'START_ANALYSIS':
      // Side panel requested analysis start - just acknowledge
      sendResponse({ received: true });
      return false;

    case 'ANALYZE_ARTICLE':
      handleAnalyzeArticle(message.tabId)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async

    case 'GET_PERSPECTIVES':
      handleGetPerspectives(message.tabId, message.topic, message.keywords)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'GET_EVIDENCE':
      handleGetEvidence(message.tabId, message.topic, message.claims)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'GET_CACHED_ANALYSIS':
      const cached = tabAnalysis.get(message.tabId);
      sendResponse({ success: !!cached, data: cached });
      return false;

    default:
      console.log('[ClearView] Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

// Extract article from content script
async function extractArticleFromTab(tabId: number): Promise<ExtractedArticle | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_ARTICLE' });
    if (response?.success && response.article) {
      return response.article;
    }
    return null;
  } catch (error) {
    console.error('[ClearView] Error extracting article:', error);
    return null;
  }
}

// Handle article analysis request
async function handleAnalyzeArticle(tabId: number): Promise<{ success: boolean; data?: AnalysisResult; error?: string }> {
  try {
    // First extract the article
    const article = await extractArticleFromTab(tabId);
    if (!article) {
      return { success: false, error: 'Could not extract article content from this page' };
    }

    // Store article for this tab
    tabAnalysis.set(tabId, { article });

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: article.url,
        content: article.content,
        title: article.title,
        source: article.source,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Analysis failed' };
    }

    const analysis = await response.json() as AnalysisResult;

    // Update stored data
    const stored = tabAnalysis.get(tabId);
    if (stored) {
      stored.analysis = analysis;
    }

    return { success: true, data: analysis };
  } catch (error) {
    console.error('[ClearView] Analysis error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle perspectives request
async function handleGetPerspectives(
  tabId: number,
  topic: string,
  keywords: string[]
): Promise<{ success: boolean; data?: PerspectivesResult; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/perspectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, keywords }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to get perspectives' };
    }

    const perspectives = await response.json() as PerspectivesResult;

    // Update stored data
    const stored = tabAnalysis.get(tabId);
    if (stored) {
      stored.perspectives = perspectives;
    }

    return { success: true, data: perspectives };
  } catch (error) {
    console.error('[ClearView] Perspectives error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle evidence request
async function handleGetEvidence(
  tabId: number,
  topic: string,
  claims: string[]
): Promise<{ success: boolean; data?: EvidenceResult; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, claims }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to get evidence' };
    }

    const evidence = await response.json() as EvidenceResult;

    // Update stored data
    const stored = tabAnalysis.get(tabId);
    if (stored) {
      stored.evidence = evidence;
    }

    return { success: true, data: evidence };
  } catch (error) {
    console.error('[ClearView] Evidence error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabAnalysis.delete(tabId);
  console.log('[ClearView] Cleaned up data for tab:', tabId);
});

console.log('[ClearView] Background service worker initialized');
