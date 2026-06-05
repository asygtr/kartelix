import React from 'react';
import { Link } from 'react-router-dom';

const cards = [
  {
    icon: 'label',
    title: 'Etiket Bas',
    to: '/mamul/labels'
  }
];

const iconMap = {
  label: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M4 7a3 3 0 0 1 3-3h6l7 7-8 8-7-7V7Zm4 1.5A1.5 1.5 0 1 0 8 5.5a1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
    </svg>
  ),
  fabric: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M6 4h12v4l-2 1.5V20H8V9.5L6 8V4Zm2 2v1l2 1.5V18h4V8.5L16 7V6H8Z" fill="currentColor" />
    </svg>
  ),
  story: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M6 5h12a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V7a2 2 0 0 1 2-2Zm0 2v8.76l2-.98 4 2 4-2 2 .98V7H6Zm2 2h8v2H8V9Zm0 4h5v2H8v-2Z" fill="currentColor" />
    </svg>
  )
};

const MamulLandingPage = () => {
  return (
    <div className="app-card-grid md:grid-cols-2">
      {cards.map((card) => (
        <Link key={card.to} to={card.to} className="app-card app-quick-card">
          <div className="app-quick-card-icon">{iconMap[card.icon]}</div>
          <div className="app-quick-card-copy">
            <h3 className="text-xl font-semibold text-[color:var(--app-text)]">{card.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default MamulLandingPage;
