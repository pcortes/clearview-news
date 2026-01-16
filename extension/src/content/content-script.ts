// Content script for extracting article content from news pages

interface ExtractedArticle {
  url: string;
  title: string;
  content: string;
  source: string;
  author?: string;
}

// Extract article content from the current page
function extractArticle(): ExtractedArticle | null {
  try {
    const url = window.location.href;

    // Try to get title from various sources
    const title =
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title;

    // Try to get source/site name
    const source =
      document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
      document.querySelector('meta[name="application-name"]')?.getAttribute('content') ||
      new URL(url).hostname.replace('www.', '');

    // Try to get author
    const author =
      document.querySelector('meta[name="author"]')?.getAttribute('content') ||
      document.querySelector('[rel="author"]')?.textContent?.trim() ||
      document.querySelector('.author')?.textContent?.trim();

    // Extract main article content
    const content = extractMainContent();

    if (!content || content.length < 100) {
      console.log('[ClearView] Could not extract sufficient article content');
      return null;
    }

    console.log(`[ClearView] Extracted article: "${title}" (${content.length} chars)`);

    return {
      url,
      title: title || 'Untitled',
      content,
      source: source || 'Unknown',
      author: author || undefined,
    };
  } catch (error) {
    console.error('[ClearView] Error extracting article:', error);
    return null;
  }
}

// Extract main content using common selectors
function extractMainContent(): string {
  // Common article content selectors (in order of preference)
  const selectors = [
    // NYTimes
    'section[name="articleBody"]',
    '.StoryBodyCompanionColumn',
    '[data-testid="live-blog-content"]',
    // General
    '[itemprop="articleBody"]',
    '[data-testid="article-body"]',
    'article',
    '[role="main"] article',
    'main article',
    '.article-content',
    '.article-body',
    '.article__body',
    '.post-content',
    '.entry-content',
    '.story-body',
    '.story-body-text',
    '.content-body',
    '#article-body',
    '.caas-body',  // Yahoo
    '.article__content',
    '.post-body',
    '.td-post-content',
    '.story-content',
    '.news-article-body',
    // Washington Post
    '.article-body',
    '[data-qa="article-body"]',
    // CNN
    '.article__content',
    '.zn-body__paragraph',
    // Broad fallbacks
    'main',
    '[role="main"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = cleanText(element);
      console.log(`[ClearView] Selector "${selector}" found ${text.length} chars`);
      if (text.length > 150) {
        return text;
      }
    }
  }

  // Fallback: collect all paragraphs
  console.log('[ClearView] Using paragraph fallback');
  const paragraphs = document.querySelectorAll('p');
  const textContent = Array.from(paragraphs)
    .map(p => p.textContent?.trim() || '')
    .filter(text => text.length > 30)
    .join('\n\n');

  console.log(`[ClearView] Fallback extracted ${textContent.length} chars from ${paragraphs.length} paragraphs`);
  return textContent;
}

// Clean extracted text
function cleanText(element: Element): string {
  // Clone to avoid modifying the page
  const clone = element.cloneNode(true) as Element;

  // Remove unwanted elements
  const unwanted = clone.querySelectorAll(
    'script, style, nav, header, footer, aside, .ad, .advertisement, .social-share, .comments, .related-articles, [role="complementary"]'
  );
  unwanted.forEach(el => el.remove());

  // Get text content
  const text = clone.textContent || '';

  // Clean up whitespace
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

// Check if current page looks like a news article
function isArticlePage(): boolean {
  // Check for article element
  if (document.querySelector('article')) return true;

  // Check for common article meta tags
  if (document.querySelector('meta[property="og:type"][content="article"]')) return true;
  if (document.querySelector('meta[name="article:author"]')) return true;

  // Check URL patterns
  const url = window.location.href;
  const articlePatterns = [
    /\/article\//,
    /\/news\//,
    /\/story\//,
    /\/post\//,
    /\/\d{4}\/\d{2}\/\d{2}\//,  // Date patterns
  ];

  return articlePatterns.some(pattern => pattern.test(url));
}

// Bias type to color mapping - VERY visible colors
const BIAS_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  loaded_language: { bg: '#fde047', border: '#ca8a04', icon: '⚠️' },  // Bright yellow
  unsubstantiated: { bg: '#fca5a5', border: '#dc2626', icon: '❌' },  // Bright red
  missing_context: { bg: '#fdba74', border: '#ea580c', icon: '❓' },  // Orange
  framing: { bg: '#93c5fd', border: '#2563eb', icon: '🔍' },          // Blue
};

// Inject CSS for highlights
function injectHighlightStyles() {
  if (document.getElementById('clearview-styles')) return;

  const style = document.createElement('style');
  style.id = 'clearview-styles';
  style.textContent = `
    .clearview-highlight {
      position: relative;
      border-radius: 3px;
      padding: 2px 6px;
      margin: 0 2px;
      cursor: help;
      transition: all 0.2s ease;
      display: inline;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    .clearview-highlight:hover {
      filter: brightness(0.9);
    }
    .clearview-icon {
      font-size: 14px;
      margin-left: 4px;
      vertical-align: middle;
    }
    .clearview-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.5;
      max-width: 320px;
      width: max-content;
      z-index: 999999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.15s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    .clearview-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #1f2937;
    }
    .clearview-highlight:hover .clearview-tooltip {
      opacity: 1;
      visibility: visible;
    }
    .clearview-tooltip-type {
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      color: #fbbf24;
    }
    .clearview-tooltip-text {
      font-weight: 400;
      color: #f3f4f6;
    }
  `;
  document.head.appendChild(style);
}

// Normalize text for comparison (remove extra whitespace, quotes, etc)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, '') // Remove smart quotes
    .replace(/[""'']/g, '')  // Remove regular quotes
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

// Extract key phrase (first ~30 chars of meaningful text)
function getKeyPhrase(text: string): string {
  const normalized = normalizeText(text);
  // Get first few words (at least 20 chars, up to 40)
  const words = normalized.split(' ');
  let phrase = '';
  for (const word of words) {
    if (phrase.length > 40) break;
    phrase += (phrase ? ' ' : '') + word;
    if (phrase.length >= 20) break;
  }
  return phrase;
}

// Find and highlight text in the article
function highlightBiasInArticle(indicators: Array<{original_text: string; type: string; explanation: string}>) {
  injectHighlightStyles();

  // Remove existing highlights
  document.querySelectorAll('.clearview-highlight').forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize();
    }
  });

  console.log(`[ClearView] Highlighting ${indicators.length} bias indicators`);

  let highlightedCount = 0;

  for (const indicator of indicators) {
    const searchText = indicator.original_text;
    if (!searchText || searchText.length < 5) continue;

    const colors = BIAS_COLORS[indicator.type] || BIAS_COLORS.framing;

    // Try multiple search strategies
    const searchStrategies = [
      searchText,                           // Exact text
      getKeyPhrase(searchText),             // First key phrase
      searchText.split('.')[0],             // First sentence
      searchText.substring(0, 50),          // First 50 chars
    ].filter(s => s && s.length >= 5);

    let found = false;

    for (const search of searchStrategies) {
      if (found) break;

      const normalizedSearch = normalizeText(search);
      if (normalizedSearch.length < 5) continue;

      // Search in article body elements
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            // Skip scripts, styles, nav, header, footer, and already highlighted
            const tagName = parent.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest('.clearview-highlight, .clearview-tooltip, nav, header, footer, aside')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent || '';
        const normalizedText = normalizeText(text);
        const index = normalizedText.indexOf(normalizedSearch);

        if (index !== -1) {
          // Map back to original text position (approximate)
          const originalIndex = text.toLowerCase().indexOf(search.toLowerCase().substring(0, 10));
          const startIndex = originalIndex !== -1 ? originalIndex : 0;

          // Find word boundaries for cleaner highlighting
          let highlightStart = startIndex;
          let highlightEnd = Math.min(startIndex + search.length + 10, text.length);

          // Extend to word boundaries
          while (highlightStart > 0 && text[highlightStart - 1] !== ' ') highlightStart--;
          while (highlightEnd < text.length && text[highlightEnd] !== ' ' && text[highlightEnd] !== '.') highlightEnd++;

          const before = text.slice(0, highlightStart);
          const match = text.slice(highlightStart, highlightEnd).trim();
          const after = text.slice(highlightEnd);

          if (match.length < 3) continue;

          const span = document.createElement('span');
          span.className = 'clearview-highlight';
          span.style.backgroundColor = colors.bg;
          span.style.borderBottom = `3px solid ${colors.border}`;
          span.style.boxShadow = `0 0 0 1px ${colors.border}`;

          span.innerHTML = `${escapeHtml(match)}<span class="clearview-icon">${colors.icon}</span><div class="clearview-tooltip"><div class="clearview-tooltip-type">${indicator.type.replace(/_/g, ' ')}</div><div class="clearview-tooltip-text">${escapeHtml(indicator.explanation)}</div></div>`;

          const parent = node.parentNode;
          if (parent) {
            const fragment = document.createDocumentFragment();
            if (before) fragment.appendChild(document.createTextNode(before));
            fragment.appendChild(span);
            if (after) fragment.appendChild(document.createTextNode(after));
            parent.replaceChild(fragment, node);
            found = true;
            highlightedCount++;
            console.log(`[ClearView] ✓ Highlighted: "${match.substring(0, 40)}..."`);
            break;
          }
        }
      }
    }

    if (!found) {
      console.log(`[ClearView] ✗ Could not find: "${searchText.substring(0, 40)}..."`);
    }
  }

  console.log(`[ClearView] Highlighted ${highlightedCount}/${indicators.length} bias indicators`);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[ClearView] Received message:', message.type);

  if (message.type === 'EXTRACT_ARTICLE') {
    const article = extractArticle();
    sendResponse({ success: !!article, article });
  } else if (message.type === 'IS_ARTICLE_PAGE') {
    sendResponse({ isArticle: isArticlePage() });
  } else if (message.type === 'HIGHLIGHT_BIAS') {
    highlightBiasInArticle(message.indicators || []);
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

// Initial log
console.log('[ClearView] Content script loaded on:', window.location.href);

// Notify background script that page is ready
chrome.runtime.sendMessage({ type: 'PAGE_LOADED', url: window.location.href });
