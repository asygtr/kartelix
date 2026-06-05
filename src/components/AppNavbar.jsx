import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { getSession } from '../utils/auth';
import QrCameraModal from './QrCameraModal';
import MobileBottomNav from './MobileBottomNav';
import { isMobileCameraDevice } from '../utils/qr';

const navSets = {
  admin: [
    { to: '/admin', label: 'Yönetim' },
    { to: '/admin/mamuller', label: 'Mamül Kartı' },
    { to: '/mamul/labels', label: 'Etiket Bas' },
    { to: '/staff/orders/new', label: 'Siparişler' },
    { to: '/admin/reports', label: 'Raporlar' }
  ],
  mamul: [
    { to: '/mamul', label: 'Mamül Merkezi' },
    { to: '/mamul/labels', label: 'Etiket Bas' }
  ],
  staff: [
    { to: '/staff/orders/new', label: 'Sipariş Oluştur' }
  ],
  guest: []
};

const isActiveLink = (pathname, target) => {
  if (target === '/') return pathname === '/';
  if (target === '/admin' || target === '/mamul') {
    return pathname === target;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
};

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M12 4 4 10.5V20h5.5v-5h5V20H20v-9.5L12 4Z" fill="currentColor" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor" />
  </svg>
);

const OrderIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M5 4h11l3 3v13H5V4Zm2 2v12h10V8.2L15.8 6H7Zm2 3h6v2H9V9Zm0 4h6v2H9v-2Z" fill="currentColor" />
  </svg>
);

const LabelIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M4 7a3 3 0 0 1 3-3h6l7 7-8 8-7-7V7Zm4 1.5A1.5 1.5 0 1 0 8 5.5a1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
  </svg>
);

const FabricIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M6 4h12v4l-2 1.5V20H8V9.5L6 8V4Zm2 2v1l2 1.5V18h4V8.5L16 7V6H8Z" fill="currentColor" />
  </svg>
);

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M5 5h14v14H5V5Zm2 2v10h10V7H7Zm1 7h2v2H8v-2Zm3-4h2v6h-2v-6Zm3-3h2v9h-2V7Z" fill="currentColor" />
  </svg>
);

const AppNavbar = ({ title, action, onLogout }) => {
  const { appLogo } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const role = session?.yetki || 'guest';
  const primaryLinks = navSets[role] || navSets.guest;
  const showSettings = role === 'admin' && location.pathname !== '/admin/settings';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [canUseMobileQr] = useState(() => isMobileCameraDevice());

  useEffect(() => {
    if (searchOpen) {
      setSearchMessage('');
      setSearchResult(null);
    }
  }, [searchOpen]);

  const mobileNavItems = useMemo(() => {
    const items = [];

    items.push({
      key: 'home',
      label: 'Ana Sayfa',
      icon: <HomeIcon />,
      to: role === 'admin' ? '/admin' : role === 'mamul' ? '/mamul' : '/staff/orders/new'
    });

    items.push({
      key: 'search',
      label: 'Ara',
      icon: <SearchIcon />,
      action: () => setSearchOpen(true)
    });

    items.push({
      key: 'orders',
      label: 'Siparişler',
      icon: <OrderIcon />,
      to: role === 'admin' ? '/admin/orders' : role === 'staff' ? '/staff/orders/new' : null
    });

    items.push({
      key: 'labels',
      label: 'Etiket Bas',
      icon: <LabelIcon />,
      to: role === 'admin' || role === 'mamul' ? '/mamul/labels' : null
    });

    items.push({
      key: 'mamul',
      label: 'Mamül',
      icon: <FabricIcon />,
      to: role === 'admin' ? '/admin/mamuller' : role === 'mamul' ? '/mamul' : null
    });

    if (role === 'admin') {
      items.push({
        key: 'reports',
        label: 'Raporlar',
        icon: <ReportIcon />,
        to: '/admin/reports'
      });
    }

    return items.filter((item) => item.to || item.action);
  }, [role]);

  const runGlobalSearch = async (incomingValue) => {
    const lookupCode = String(incomingValue ?? searchValue).trim();

    if (!lookupCode) {
      setSearchMessage('Article code girin, QR okutun ya da ürün bağlantısı yapıştırın.');
      setSearchResult(null);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchMessage('');
      const response = await fetch(`/api/admin/mamul-lookup?code=${encodeURIComponent(lookupCode)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ürün bulunamadı');
      }

      setSearchValue(lookupCode);
      setSearchResult(result.data);
    } catch (error) {
      setSearchResult(null);
      setSearchMessage(error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const canSeeSearchPrices = role === 'admin';

  return (
    <>
    {!searchOpen ? (
    <header className="app-nav-shell">
      <div className="app-nav-top">
        <div className="app-nav-brand">
          <Link to="/" className="app-nav-logo" aria-label="Kartelix ana sayfa">
            <img src={appLogo} alt="Kartelix logo" className="app-nav-logo-image" />
          </Link>
          <div className="app-nav-brand-copy">
            <div className="app-nav-brand-name">Kartelix</div>
            <div className="app-nav-mobile-title">{title}</div>
          </div>
        </div>

        {primaryLinks.length ? (
          <nav className="app-nav-primary-inline" aria-label="Ana gezinme">
            <div className="app-nav-links app-nav-links-primary">
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`app-nav-link ${isActiveLink(location.pathname, link.to) ? 'is-active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        <div className="app-nav-actions">
          {showSettings ? (
            <Link to="/admin/settings?menu=1" className="app-nav-icon-button" aria-label="Ayarlar" title="Ayarlar">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
                <path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.12 7.12 0 0 0-1.63-.94l-.36-2.54a.49.49 0 0 0-.49-.42h-3.84a.49.49 0 0 0-.49.42l-.36 2.54a7.12 7.12 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54a.49.49 0 0 0 .49.42h3.84a.49.49 0 0 0 .49-.42l.36-2.54c.59-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" fill="currentColor" />
              </svg>
            </Link>
          ) : null}
          {onLogout ? (
            <button type="button" onClick={onLogout} className="app-nav-icon-button" aria-label="Çıkış yap" title="Çıkış yap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
                <path d="M10 17v-2h5V9h-5V7h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2Zm-4 3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5v2H6v12h5v2Zm11.59-7L14 9.41 15.41 8 21.83 14.41 15.41 20.83 14 19.41 17.59 16H9v-2Z" fill="currentColor" />
              </svg>
            </button>
          ) : null}
          {action ? <div className="app-nav-utility">{action}</div> : null}
        </div>
      </div>
    </header>
    ) : null}
    <MobileBottomNav
      items={mobileNavItems}
      location={location}
      searchOpen={searchOpen}
      onSearchClick={() => setSearchOpen(true)}
    />

    {searchOpen ? (
      <div className="app-mobile-search-sheet" onClick={(event) => {
        if (event.target === event.currentTarget) {
          setSearchOpen(false);
        }
      }}>
        <div className="app-mobile-search-panel">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Ürünü aç</h2>
            <button
              type="button"
              className="app-nav-icon-button"
              onClick={() => setSearchOpen(false)}
              aria-label="Aramayı kapat"
              title="Aramayı kapat"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
                <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              runGlobalSearch();
            }}
          >
            <div className="app-searchbar-field">
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Article code, article no veya QR değeri"
                className="app-input app-searchbar-input"
              />
              <div className="app-searchbar-actions">
                <button type="submit" className="app-searchbar-submit" aria-label="Ara" title="Ara">
                  <SearchIcon />
                </button>
                {canUseMobileQr ? (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="app-searchbar-qr"
                    aria-label="QR okut"
                    title="QR okut"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
                      <path d="M4 4h5v2H6v3H4V4Zm10 0h6v6h-2V6h-4V4ZM4 15h2v3h3v2H4v-5Zm14 3v-3h2v5h-5v-2h3ZM8 8h8v8H8V8Zm2 2v4h4v-4h-4Z" fill="currentColor" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          {searchLoading ? <div className="app-soft-panel mt-4 p-4 text-sm">Aranıyor...</div> : null}
          {searchMessage ? <div className="app-soft-panel mt-4 p-4 text-sm">{searchMessage}</div> : null}

          {searchResult ? (
            <div className="app-panel mt-4 p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--app-text-muted)]">{searchResult.mamul_turu_adi}</div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--app-text)]">{searchResult.mamul_adi}</div>
              <div className="mt-2 text-sm text-[color:var(--app-text-muted)]">{searchResult.article_code} / {searchResult.article_no}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[color:var(--app-text-muted)]">
                <div>Renk: <span className="font-semibold text-[color:var(--app-text)]">{searchResult.renk || '-'}</span></div>
                <div>Kompozisyon: <span className="font-semibold text-[color:var(--app-text)]">{searchResult.kompozisyon_ozeti || '-'}</span></div>
              </div>

              <div className="app-mobile-search-summary">
                <div className="app-mobile-search-summary-card">
                  <div className="app-mobile-search-summary-label">Yayın</div>
                  <div className="app-mobile-search-summary-value">{searchResult.yayin_durumu || '-'}</div>
                </div>
                <div className="app-mobile-search-summary-card">
                  <div className="app-mobile-search-summary-label">Ölçü</div>
                  <div className="app-mobile-search-summary-value">{searchResult.en || '-'} EN / {searchResult.gramaj || '-'} GR</div>
                </div>
              </div>

              {canSeeSearchPrices ? (
                <div className="app-mobile-search-pricing">
                  <div className="app-mobile-search-price-card">
                    <div className="app-mobile-search-summary-label">1 kg satış</div>
                    <div className="app-mobile-search-price-value">{Number(searchResult.bir_kg_satis_fiyati || 0).toFixed(2)} TRY</div>
                  </div>
                  <div className="app-mobile-search-price-card">
                    <div className="app-mobile-search-summary-label">1 kg maliyet</div>
                    <div className="app-mobile-search-price-value">{Number(searchResult.bir_kg_maliyet || 0).toFixed(2)} TRY</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a href={`/u/${searchResult.qr_slug}`} className="app-btn-secondary text-center" onClick={() => setSearchOpen(false)}>
                  Ürün bilgisi
                </a>
                {(role === 'admin' || role === 'mamul') ? (
                  <button
                    type="button"
                    className="app-btn-secondary"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(role === 'admin' ? '/admin/mamuller' : '/mamul');
                    }}
                  >
                    Mamüle git
                  </button>
                ) : null}
                {(role === 'admin' || role === 'staff') ? (
                  <button
                    type="button"
                    className="app-btn-primary"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(role === 'admin' ? '/admin/orders' : '/staff/orders/new');
                    }}
                  >
                    Siparişe git
                  </button>
                ) : null}
                {(role === 'admin' || role === 'mamul') ? (
                  <button
                    type="button"
                    className="app-btn-secondary"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate('/mamul/labels');
                    }}
                  >
                    Etikete git
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    ) : null}

    {scannerOpen && canUseMobileQr ? (
      <QrCameraModal
        title="QR ile ürün aç"
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => {
          setScannerOpen(false);
          setSearchValue(value);
          runGlobalSearch(value);
        }}
      />
    ) : null}
    </>
  );
};

export default AppNavbar;
