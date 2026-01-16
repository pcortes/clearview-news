import React, { useState } from 'react';
import DOMPurify from 'dompurify';

interface BiasIndicator {
  original_text: string;
  type: string;
  explanation: string;
}

interface BiasFlagsProps {
  indicators: BiasIndicator[];
}

const TYPE_LABELS: Record<string, string> = {
  loaded_language: 'Loaded Language',
  unsubstantiated: 'Unsubstantiated',
  missing_context: 'Missing Context',
  framing: 'Framing',
};

export function BiasFlags({ indicators }: BiasFlagsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!indicators.length) return null;

  return (
    <section className="section bias-flags">
      <h2 onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        Bias Indicators ({indicators.length}) {expanded ? '▼' : '▶'}
      </h2>
      {expanded && (
        <div className="bias-list">
          {indicators.map((indicator, i) => (
            <div key={i} className={`bias-item bias-${indicator.type}`}>
              <span className="bias-type">{TYPE_LABELS[indicator.type] || indicator.type}</span>
              <blockquote>{DOMPurify.sanitize(indicator.original_text)}</blockquote>
              <p className="explanation">{DOMPurify.sanitize(indicator.explanation)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
