import React from 'react';
import DOMPurify from 'dompurify';

interface Study {
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  doi_verified: boolean;
  finding: string;
  url: string;
}

interface ExpertQuote {
  expert: string;
  affiliation: string;
  quote: string;
  source_url: string;
}

interface EvidenceData {
  summary: string;
  evidence_strength: string;
  studies: Study[];
  expert_commentary: ExpertQuote[];
  limitations: string;
}

interface WhatResearchShowsProps {
  evidence: EvidenceData;
}

const STRENGTH_COLORS: Record<string, string> = {
  strong: '#22c55e',
  moderate: '#eab308',
  limited: '#f97316',
  contested: '#ef4444',
};

export function WhatResearchShows({ evidence }: WhatResearchShowsProps) {
  return (
    <div className="evidence-section">
      {/* Summary */}
      <p className="evidence-summary">{DOMPurify.sanitize(evidence.summary)}</p>

      {/* Evidence Strength */}
      <div className="evidence-strength">
        <span>Evidence Strength:</span>
        <span
          className="strength-badge"
          style={{ backgroundColor: STRENGTH_COLORS[evidence.evidence_strength] }}
        >
          {evidence.evidence_strength}
        </span>
      </div>

      {/* Studies */}
      {evidence.studies.length > 0 && (
        <div className="studies">
          <h4>Studies</h4>
          {evidence.studies.slice(0, 3).map((study, i) => (
            <div key={i} className="study-item">
              <a href={study.url} target="_blank" rel="noopener noreferrer">
                {DOMPurify.sanitize(study.title)}
              </a>
              <span className="study-meta">
                {study.authors.slice(0, 2).join(', ')} ({study.year})
                {study.doi_verified && <span className="verified">✓ DOI Verified</span>}
              </span>
              <p className="finding">{DOMPurify.sanitize(study.finding)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expert Commentary */}
      {evidence.expert_commentary.length > 0 && (
        <div className="expert-commentary">
          <h4>Expert Commentary</h4>
          {evidence.expert_commentary.slice(0, 2).map((comment, i) => (
            <blockquote key={i} className="expert-quote">
              "{DOMPurify.sanitize(comment.quote)}"
              <cite>
                — {DOMPurify.sanitize(comment.expert)}, {DOMPurify.sanitize(comment.affiliation)}
              </cite>
            </blockquote>
          ))}
        </div>
      )}

      {/* Limitations */}
      <p className="limitations">
        <strong>Note:</strong> {DOMPurify.sanitize(evidence.limitations)}
      </p>
    </div>
  );
}
