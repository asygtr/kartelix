import React, { useEffect, useState } from 'react';
import QrCameraModal from './QrCameraModal';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor" />
  </svg>
);

const PageSearchBar = ({
  value,
  onChange,
  placeholder,
  onQrDetected,
  onSearch,
  qrLabel = 'QR okut',
  results = [],
  showResults = false,
  onResultSelect,
  getResultKey,
  getResultPrimary,
  getResultSecondary,
  emptyResultsText = 'Sonuç bulunamadı.'
}) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    setHighlightedIndex(results.length > 0 ? 0 : -1);
  }, [results, value]);

  const selectResult = (result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  return (
    <>
      <form
        className="app-searchbar"
        onSubmit={(event) => {
          event.preventDefault();
          if (onSearch) {
            onSearch(value);
          }
        }}
      >
        <div className="app-searchbar-field">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="app-input app-searchbar-input"
            onKeyDown={(event) => {
              if (!showResults || results.length === 0) {
                return;
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % results.length);
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlightedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
              }

              if (event.key === 'Enter' && highlightedIndex >= 0 && results[highlightedIndex]) {
                event.preventDefault();
                selectResult(results[highlightedIndex]);
              }

              if (event.key === 'Escape') {
                setHighlightedIndex(-1);
              }
            }}
          />
          <div className="app-searchbar-actions">
            <button type="submit" className="app-searchbar-submit" aria-label="Ara" title="Ara">
              <SearchIcon />
            </button>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="app-searchbar-qr"
              aria-label={qrLabel}
              title={qrLabel}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
                <path d="M4 4h5v2H6v3H4V4Zm10 0h6v6h-2V6h-4V4ZM4 15h2v3h3v2H4v-5Zm14 3v-3h2v5h-5v-2h3ZM8 8h8v8H8V8Zm2 2v4h4v-4h-4Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {showResults ? (
          <div className="app-searchbar-dropdown">
            {results.length > 0 ? (
              results.map((result) => (
                <button
                  key={getResultKey ? getResultKey(result) : result.id}
                  type="button"
                  className={`app-searchbar-result ${results[highlightedIndex] === result ? 'is-highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(results.indexOf(result))}
                  onClick={() => selectResult(result)}
                >
                  <div className="app-searchbar-result-primary">
                    {getResultPrimary ? getResultPrimary(result) : result.mamul_adi}
                  </div>
                  <div className="app-searchbar-result-secondary">
                    {getResultSecondary ? getResultSecondary(result) : result.article_code}
                  </div>
                </button>
              ))
            ) : (
              <div className="app-searchbar-empty">{emptyResultsText}</div>
            )}
          </div>
        ) : null}
      </form>

      {scannerOpen ? (
        <QrCameraModal
          title="QR okut"
          onClose={() => setScannerOpen(false)}
          onDetected={(detectedValue) => {
            setScannerOpen(false);
            onChange(detectedValue);
            if (onQrDetected) {
              onQrDetected(detectedValue);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default PageSearchBar;
