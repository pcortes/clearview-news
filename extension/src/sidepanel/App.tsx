import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { KeyFacts } from '../components/KeyFacts';
import { BiasFlags } from '../components/BiasFlags';
import { OtherPerspectives } from '../components/OtherPerspectives';
import { WhatResearchShows } from '../components/WhatResearchShows';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import './styles.css';

const API_BASE_URL = 'http://localhost:3000/api/v1';

interface BiasIndicator {
  original_text: string;
  type: string;
  explanation: string;
}

interface BiasScore {
  score: number;
  label: string;
  summary: string;
}

export function App() {
  // Status
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);

  // Bias score (shows first)
  const [biasScore, setBiasScore] = useState<BiasScore | null>(null);

  // Streaming analysis state
  const [summaryText, setSummaryText] = useState<string>('');
  const [keyFacts, setKeyFacts] = useState<string[]>([]);
  const [missingContext, setMissingContext] = useState<string[]>([]);
  const [biasIndicators, setBiasIndicators] = useState<BiasIndicator[]>([]);
  const [isPolitical, setIsPolitical] = useState<boolean>(false);
  const [politicalLean, setPoliticalLean] = useState<string>('none');
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);

  // Perspectives & Evidence
  const [perspectives, setPerspectives] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);
  const [loadingPerspectives, setLoadingPerspectives] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Store article for later use
  const [currentArticle, setCurrentArticle] = useState<any>(null);

  useEffect(() => {
    startAnalysis();
  }, []);

  async function extractArticle(): Promise<any> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error('No active tab');

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
      if (!response?.success || !response.article) {
        throw new Error('Could not extract article content from this page');
      }
      return response.article;
    } catch (err: any) {
      // Content script not loaded - try to inject it
      if (err.message?.includes('Receiving end does not exist') || err.message?.includes('Could not establish connection')) {
        console.log('[ClearView] Content script not found, injecting...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Wait a moment for script to initialize
        await new Promise(r => setTimeout(r, 200));
        // Try again
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
        if (!response?.success || !response.article) {
          throw new Error('Could not extract article content from this page');
        }
        return response.article;
      }
      throw err;
    }
  }

  // Send bias indicators to content script for inline highlighting
  async function highlightBiasInArticle(indicators: BiasIndicator[]) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id && indicators.length > 0) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_BIAS',
          indicators: indicators
        });
      }
    } catch (err) {
      console.log('[ClearView] Could not highlight bias in article:', err);
    }
  }

  async function startAnalysis() {
    setError(null);
    setStatus('Extracting article...');
    setBiasScore(null);
    setSummaryText('');
    setKeyFacts([]);
    setMissingContext([]);
    setBiasIndicators([]);
    setAnalysisComplete(false);
    setPerspectives(null);
    setEvidence(null);

    try {
      const article = await extractArticle();
      setCurrentArticle(article);
      setStatus('Connecting to analysis server...');

      // Use streaming endpoint
      const response = await fetch(`${API_BASE_URL}/analyze/stream`, {
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
        const err = await response.json();
        throw new Error(err.message || 'Analysis failed');
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let streamedKeyFacts: string[] = [];
      let streamedSummary = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle each event type
              switch (currentEvent) {
                case 'status':
                  setStatus(data.message);
                  break;
                case 'cached':
                  setStatus('Loading from cache...');
                  break;
                case 'biasScore':
                  setBiasScore({
                    score: data.score,
                    label: data.label,
                    summary: data.summary,
                  });
                  break;
                case 'summaryChunk':
                  setSummaryText(data.full);
                  break;
                case 'summary':
                  setSummaryText(data.text);
                  streamedSummary = data.text; // Track for evidence search
                  // Don't clear status - more content coming
                  break;
                case 'keyFact':
                  streamedKeyFacts = [...streamedKeyFacts, data.fact];
                  setKeyFacts([...streamedKeyFacts]);
                  break;
                case 'keyFacts':
                  setKeyFacts(data.facts);
                  streamedKeyFacts = data.facts;
                  break;
                case 'missingContextItem':
                  setMissingContext(prev => [...prev, data.item]);
                  break;
                case 'missingContext':
                  setMissingContext(data.items);
                  break;
                case 'biasIndicator':
                  setBiasIndicators(prev => [...prev, data]);
                  break;
                case 'biasIndicators':
                  setBiasIndicators(data.indicators);
                  // Highlight bias in the article
                  highlightBiasInArticle(data.indicators);
                  break;
                case 'complete':
                  setIsPolitical(data.is_political);
                  setPoliticalLean(data.political_lean || 'none');
                  setAnalysisComplete(true);
                  setStatus('');
                  // Load perspectives with political lean for smart prioritization
                  loadPerspectives(article, streamedKeyFacts, data.political_lean);
                  if (data.is_political) {
                    loadEvidence(article, streamedSummary);
                  }
                  break;
                case 'error':
                  setError(data.message);
                  setStatus('');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse:', line);
            }
            currentEvent = '';
          }
        }
      }

    } catch (err) {
      setError((err as Error).message);
      setStatus('');
    }
  }

  async function loadPerspectives(article: any, facts: string[], articleLean?: string) {
    setLoadingPerspectives(true);
    try {
      const topic = article.title;
      const keywords = facts.length > 0 ? facts.slice(0, 3) : article.title.split(' ').slice(0, 5);

      const response = await fetch(`${API_BASE_URL}/perspectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, keywords, articleLean }),
      });

      if (response.ok) {
        setPerspectives(await response.json());
      }
    } catch (err) {
      console.error('Perspectives error:', err);
    } finally {
      setLoadingPerspectives(false);
    }
  }

  async function loadEvidence(article: any, summary: string) {
    setLoadingEvidence(true);
    try {
      // Pass the article title as topic and summary as core argument
      // This lets the backend find expert research on the topic
      const response = await fetch(`${API_BASE_URL}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: article.title,
          summaryText: summary, // Used to infer the core argument/position
        }),
      });

      if (response.ok) {
        setEvidence(await response.json());
      }
    } catch (err) {
      console.error('Evidence error:', err);
    } finally {
      setLoadingEvidence(false);
    }
  }

  return (
    <div className="clearview-panel">
      <header className="panel-header">
        <h1>ClearView News</h1>
        <span className="subtitle">Fact-Focused Analysis</span>
      </header>

      <main className="panel-content">
        {/* Status / Loading */}
        {status && (
          <div className="status-bar">
            <div className="spinner"></div>
            <span>{status}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-section">
            <p className="error-message">{error}</p>
            <button onClick={startAnalysis} className="retry-button">Retry</button>
          </div>
        )}

        {/* Bias Score - shows first */}
        {biasScore && (
          <div className={`bias-score bias-score-${biasScore.score <= 3 ? 'low' : biasScore.score <= 6 ? 'medium' : 'high'}`}>
            <div className="bias-score-header">
              <span className="bias-score-label">{biasScore.label}</span>
              <div className="bias-score-badges">
                {politicalLean && politicalLean !== 'none' && (
                  <span className={`lean-badge lean-${politicalLean}`}>
                    {politicalLean.replace('-', ' ')}
                  </span>
                )}
                <span className="bias-score-number">{biasScore.score}/10</span>
              </div>
            </div>
            <p className="bias-score-summary">{biasScore.summary}</p>
          </div>
        )}

        {/* Summary - shows while streaming */}
        {summaryText && (
          <ErrorBoundary>
            <section className="section">
              <h2>Summary</h2>
              <p className="summary-text">{DOMPurify.sanitize(summaryText)}</p>
            </section>
          </ErrorBoundary>
        )}

        {/* Key Facts - shows as they arrive */}
        {keyFacts.length > 0 && (
          <ErrorBoundary>
            <KeyFacts facts={keyFacts} />
          </ErrorBoundary>
        )}

        {/* Missing Context */}
        {missingContext.length > 0 && (
          <ErrorBoundary>
            <section className="section missing-context">
              <h2>Missing Context</h2>
              <ul>
                {missingContext.map((ctx, i) => (
                  <li key={i}>{DOMPurify.sanitize(ctx)}</li>
                ))}
              </ul>
            </section>
          </ErrorBoundary>
        )}

        {/* Bias Indicators - shows as they arrive */}
        {biasIndicators.length > 0 && (
          <ErrorBoundary>
            <BiasFlags indicators={biasIndicators} />
          </ErrorBoundary>
        )}

        {/* Other Perspectives - loads after analysis complete */}
        {analysisComplete && (
          <ErrorBoundary>
            <section className="section">
              <h2>Other Perspectives</h2>
              {loadingPerspectives ? (
                <div className="loading-inline">
                  <div className="spinner-small"></div>
                  <span>Finding other sources...</span>
                </div>
              ) : perspectives ? (
                <OtherPerspectives sources={perspectives.sources} />
              ) : null}
            </section>
          </ErrorBoundary>
        )}

        {/* What Research Shows - only for political articles */}
        {analysisComplete && isPolitical && (
          <ErrorBoundary>
            <section className="section">
              <h2>What Research Shows</h2>
              {loadingEvidence ? (
                <div className="loading-inline">
                  <div className="spinner-small"></div>
                  <span>Researching evidence...</span>
                </div>
              ) : evidence ? (
                <WhatResearchShows evidence={evidence} />
              ) : null}
            </section>
          </ErrorBoundary>
        )}
      </main>

      <Disclaimer />
    </div>
  );
}

export default App;
