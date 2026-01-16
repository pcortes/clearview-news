import React from 'react';
import DOMPurify from 'dompurify';

interface KeyFactsProps {
  facts: string[];
}

export function KeyFacts({ facts }: KeyFactsProps) {
  if (!facts.length) return null;

  return (
    <section className="section key-facts">
      <h2>Key Facts</h2>
      <ul className="facts-list">
        {facts.map((fact, i) => (
          <li key={i}>{DOMPurify.sanitize(fact)}</li>
        ))}
      </ul>
    </section>
  );
}
