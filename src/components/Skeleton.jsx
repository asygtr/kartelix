import React from 'react';

const Skeleton = ({ width = '100%', height = '1.2rem', radius = '0.5rem', className = '' }) => (
  <span
    className={`skeleton-box ${className}`}
    style={{ width, height, borderRadius: radius, display: 'block' }}
  />
);

export const SkeletonCard = () => (
  <div className="app-panel p-4 space-y-3">
    <Skeleton height="1rem" width="40%" />
    <Skeleton height="1.4rem" width="70%" />
    <Skeleton height="0.9rem" width="55%" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--app-border)]">
    <Skeleton height="1rem" width="30%" />
    <Skeleton height="1rem" width="25%" />
    <Skeleton height="1rem" width="20%" />
  </div>
);

export const SkeletonList = ({ count = 4 }) => (
  <div className="app-panel overflow-hidden">
    {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
  </div>
);

export default Skeleton;
