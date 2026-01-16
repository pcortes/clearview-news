import React, { useState } from 'react';
import DOMPurify from 'dompurify';

interface EvidenceItem {
  finding: string;
  source: string;
  sourceType: string;
  year: number;
  url: string;
  strength: 'strong' | 'moderate' | 'weak';
}

interface KeyStudy {
  title: string;
  authors: string;
  year: number;
  journal: string;
  keyFinding: string;
  url: string;
  doiVerified?: boolean;
}

interface ExpertVoice {
  name: string;
  credentials: string;
  position: 'supports' | 'opposes' | 'nuanced';
  quote: string;
  url: string;
}

interface EvidenceData {
  coreQuestion: string;
  expertConsensus: {
    level: string;
    direction: string;
    summary: string;
  };
  evidenceFor: EvidenceItem[];
  evidenceAgainst: EvidenceItem[];
  keyStudies: KeyStudy[];
  expertVoices: ExpertVoice[];
  bottomLine: {
    whatResearchShows: string;
    confidence: string;
    caveat: string;
  };
}

interface WhatResearchShowsProps {
  evidence: EvidenceData;
}

const CONSENSUS_COLORS: Record<string, { bg: string; text: string }> = {
  strong_consensus: { bg: '#dcfce7', text: '#166534' },
  moderate_consensus: { bg: '#fef9c3', text: '#854d0e' },
  divided: { bg: '#fee2e2', text: '#991b1b' },
  limited_research: { bg: '#f3f4f6', text: '#4b5563' },
};

const DIRECTION_LABELS: Record<string, string> = {
  supports_article: 'Research supports this position',
  refutes_article: 'Research challenges this position',
  mixed: 'Research is mixed',
  inconclusive: 'Research is inconclusive',
};

const STRENGTH_ICONS: Record<string, string> = {
  strong: '●●●',
  moderate: '●●○',
  weak: '●○○',
};

const POSITION_COLORS: Record<string, string> = {
  supports: '#16a34a',
  opposes: '#dc2626',
  nuanced: '#6b7280',
};

export function WhatResearchShows({ evidence }: WhatResearchShowsProps) {
  const [showAllStudies, setShowAllStudies] = useState(false);

  const consensusStyle = CONSENSUS_COLORS[evidence.expertConsensus?.level] || CONSENSUS_COLORS.limited_research;

  return (
    <div className="evidence-section">
      {/* Bottom Line - Most Important */}
      <div className="bottom-line">
        <div className="bottom-line-header">
          <span className="bottom-line-icon">📊</span>
          <span className="bottom-line-label">The Bottom Line</span>
          <span className={`confidence-badge confidence-${evidence.bottomLine?.confidence || 'low'}`}>
            {evidence.bottomLine?.confidence || 'low'} confidence
          </span>
        </div>
        <p className="bottom-line-text">
          {DOMPurify.sanitize(evidence.bottomLine?.whatResearchShows || 'Research on this topic is limited.')}
        </p>
        {evidence.bottomLine?.caveat && (
          <p className="bottom-line-caveat">
            <strong>Caveat:</strong> {DOMPurify.sanitize(evidence.bottomLine.caveat)}
          </p>
        )}
      </div>

      {/* Expert Consensus Badge */}
      <div
        className="consensus-badge"
        style={{ backgroundColor: consensusStyle.bg, color: consensusStyle.text }}
      >
        <div className="consensus-level">
          {evidence.expertConsensus?.level?.replace(/_/g, ' ') || 'Unknown'}
        </div>
        <div className="consensus-direction">
          {DIRECTION_LABELS[evidence.expertConsensus?.direction] || ''}
        </div>
      </div>

      {/* Evidence For */}
      {evidence.evidenceFor?.length > 0 && (
        <div className="evidence-group evidence-for">
          <h4 className="evidence-group-title">
            <span className="evidence-icon">✓</span> Evidence Supporting This View
          </h4>
          {evidence.evidenceFor.slice(0, 3).map((item, i) => (
            <div key={i} className="evidence-item">
              <div className="evidence-strength-indicator" title={`${item.strength} evidence`}>
                {STRENGTH_ICONS[item.strength] || '○○○'}
              </div>
              <div className="evidence-content">
                <p className="evidence-finding">{DOMPurify.sanitize(item.finding)}</p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="evidence-source">
                  {DOMPurify.sanitize(item.source)} ({item.year})
                </a>
                <span className="source-type">{item.sourceType?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Against */}
      {evidence.evidenceAgainst?.length > 0 && (
        <div className="evidence-group evidence-against">
          <h4 className="evidence-group-title">
            <span className="evidence-icon">✗</span> Evidence Challenging This View
          </h4>
          {evidence.evidenceAgainst.slice(0, 3).map((item, i) => (
            <div key={i} className="evidence-item">
              <div className="evidence-strength-indicator" title={`${item.strength} evidence`}>
                {STRENGTH_ICONS[item.strength] || '○○○'}
              </div>
              <div className="evidence-content">
                <p className="evidence-finding">{DOMPurify.sanitize(item.finding)}</p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="evidence-source">
                  {DOMPurify.sanitize(item.source)} ({item.year})
                </a>
                <span className="source-type">{item.sourceType?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expert Voices */}
      {evidence.expertVoices?.length > 0 && (
        <div className="expert-voices">
          <h4>What Experts Say</h4>
          {evidence.expertVoices.slice(0, 3).map((expert, i) => (
            <div key={i} className="expert-voice">
              <div
                className="expert-position"
                style={{ color: POSITION_COLORS[expert.position] }}
              >
                {expert.position === 'supports' ? '▲' : expert.position === 'opposes' ? '▼' : '●'}
              </div>
              <div className="expert-content">
                <blockquote className="expert-quote">
                  "{DOMPurify.sanitize(expert.quote)}"
                </blockquote>
                <cite className="expert-cite">
                  — <strong>{DOMPurify.sanitize(expert.name)}</strong>
                  <span className="expert-credentials">{DOMPurify.sanitize(expert.credentials)}</span>
                </cite>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Studies (collapsible) */}
      {evidence.keyStudies?.length > 0 && (
        <div className="key-studies">
          <button
            className="studies-toggle"
            onClick={() => setShowAllStudies(!showAllStudies)}
          >
            {showAllStudies ? '▼' : '▶'} Key Studies ({evidence.keyStudies.length})
          </button>
          {showAllStudies && (
            <div className="studies-list">
              {evidence.keyStudies.map((study, i) => (
                <div key={i} className="study-item">
                  <a href={study.url} target="_blank" rel="noopener noreferrer" className="study-title">
                    {DOMPurify.sanitize(study.title)}
                  </a>
                  <div className="study-meta">
                    {DOMPurify.sanitize(study.authors)} • {study.journal} ({study.year})
                    {study.doiVerified && <span className="doi-verified">✓ DOI</span>}
                  </div>
                  <p className="study-finding">{DOMPurify.sanitize(study.keyFinding)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
