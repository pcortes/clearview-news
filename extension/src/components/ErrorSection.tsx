import React from 'react';

interface ErrorSectionProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorSection({ message, onRetry }: ErrorSectionProps) {
  return (
    <div className="error-section">
      <p className="error-message">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Retry
        </button>
      )}
    </div>
  );
}
