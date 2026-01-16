import React from 'react';

interface SkeletonLoaderProps {
  label?: string;
}

export function SkeletonLoader({ label }: SkeletonLoaderProps) {
  return (
    <div className="skeleton-loader">
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
      <div className="skeleton-line"></div>
      {label && <span className="skeleton-label">{label}</span>}
    </div>
  );
}
