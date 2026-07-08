import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import QrCameraModal from './QrCameraModal';
import { isMobileCameraDevice } from '../utils/qr';
import { Search, QrCode } from './icons.jsx';
import { chromeSpring, tapMotion } from '../utils/motion';

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
  emptyResultsText = 'Sonuç bulunamadı.',
  className = ''
}) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [canUseQr] = useState(() => isMobileCameraDevice());
  const [dropdownRect, setDropdownRect] = useState(null);
  const [focused, setFocused] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const fieldRef = useRef(null);

  useEffect(() => {
    setHighlightedIndex(results.length > 0 ? 0 : -1);
  }, [results, value]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileScreen(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (showResults && fieldRef.current) {
      const rect = fieldRef.current.getBoundingClientRect();
      setDropdownRect(rect);
    }
  }, [showResults, results]);

  const selectResult = (result) => {
    if (onResultSelect) onResultSelect(result);
  };

  return (
    <>
      <motion.form
        className={`app-searchbar${className ? ` ${className}` : ''}`}
        initial={false}
        animate={{ scale: focused ? 1.018 : 1 }}
        transition={chromeSpring}
        onSubmit={(event) => {
          event.preventDefault();
          if (onSearch) onSearch(value);
        }}
      >
        <div
          className="app-searchbar-field"
          ref={fieldRef}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}
        >
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={isMobileScreen ? '' : placeholder}
            className="app-input app-searchbar-input"
            onKeyDown={(event) => {
              if (!showResults || results.length === 0) return;
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
              if (event.key === 'Escape') setHighlightedIndex(-1);
            }}
          />
          <div className="app-searchbar-actions">
            <motion.button
              type="submit"
              className="app-searchbar-submit"
              aria-label="Ara"
              title="Ara"
              whileTap={tapMotion}
              initial={false}
              animate={{ scaleX: focused ? 1.14 : 1, y: focused ? -2 : 0 }}
              transition={chromeSpring}
              style={{ transformOrigin: '50% 50%' }}
            >
              <Search className="app-nav-icon-svg" />
            </motion.button>
            {canUseQr ? (
              <motion.button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="app-searchbar-qr"
                aria-label={qrLabel}
                title={qrLabel}
                whileTap={tapMotion}
              >
                <QrCode className="app-nav-icon-svg" />
              </motion.button>
            ) : null}
          </div>
        </div>
      </motion.form>

      {showResults && dropdownRect ? createPortal(
        <div
          className="app-searchbar-dropdown"
          style={{
            position: 'fixed',
            top: dropdownRect.bottom + 4,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 99998,
          }}
        >
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
        </div>,
        document.body
      ) : null}

      {scannerOpen && canUseQr ? createPortal(
        <QrCameraModal
          title="QR ile ürün ara"
          onClose={() => setScannerOpen(false)}
          onDetected={(detectedValue) => {
            setScannerOpen(false);
            onChange(detectedValue);
            if (onQrDetected) {
              onQrDetected(detectedValue);
            }
          }}
        />,
        document.body
      ) : null}
    </>
  );
};

export default PageSearchBar;
