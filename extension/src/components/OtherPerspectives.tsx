import React from 'react';
import DOMPurify from 'dompurify';

interface Source {
  name: string;
  url: string;
  title: string;
  lean: string;
  snippet: string;
}

interface OtherPerspectivesProps {
  sources: Source[];
}

const LEAN_COLORS: Record<string, string> = {
  left: '#3b82f6',
  'center-left': '#60a5fa',
  center: '#9ca3af',
  'center-right': '#f87171',
  right: '#ef4444',
};

export function OtherPerspectives({ sources }: OtherPerspectivesProps) {
  if (!sources.length) {
    return <p className="no-data">No other perspectives found.</p>;
  }

  return (
    <div className="perspectives-list">
      {sources.slice(0, 5).map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="perspective-item"
        >
          <div className="source-header">
            <span className="source-name">{DOMPurify.sanitize(source.name)}</span>
            <span
              className="source-lean"
              style={{ backgroundColor: LEAN_COLORS[source.lean] || LEAN_COLORS.center }}
            >
              {source.lean}
            </span>
          </div>
          <h3 className="source-title">{DOMPurify.sanitize(source.title)}</h3>
          <p className="source-snippet">{DOMPurify.sanitize(source.snippet)}</p>
        </a>
      ))}
    </div>
  );
}
