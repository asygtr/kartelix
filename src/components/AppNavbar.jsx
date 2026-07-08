import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../theme/ThemeProvider';
import { useGenelAyarlar } from '../theme/ThemeProvider';
import { getSession, authHeaders } from '../utils/auth';
import QrCameraModal from './QrCameraModal';
import { isMobileCameraDevice } from '../utils/qr';
import { normalizeGenelAyarlar, resolveDisplayPrice } from '../utils/generalSettings';
import { formatArticleLabel } from '../utils/labelTemplate';
import { Home, Search, ClipboardList, Tag, Layers, BarChart2, Settings, LogOut, X, QrCode, Menu } from './icons.jsx';
import { bottomSheetVariants, chromeSpring, defaultEase, navTapMotion, sheetBackdropVariants, sheetTransition, tapMotion } from '../utils/motion';

const MotionLink = motion.create(Link);

export const navSets = {
  admin: [
    { to: '/admin', label: 'Yönetim' },
    { to: '/admin/mamuller', label: 'Mamül Kartı' },
    { to: '/mamul/labels', label: 'Etiket Bas' },
    { to: '/staff/orders/new', label: 'Siparişler' },
    { to: '/admin/reports', label: 'Raporlar' }
  ],
  mamul: [
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


export const useNavItems = (role, onSearchOpen) => useMemo(() => {
  const items = [];
  items.push({ key: 'home', label: 'Ana Sayfa', icon: <Home className="app-nav-icon-svg" />, to: role === 'admin' ? '/admin' : role === 'mamul' ? '/mamul' : '/staff/orders/new' });
  items.push({ key: 'search', label: 'Ara', icon: <Search className="app-nav-icon-svg" />, action: () => onSearchOpen() });
  items.push({ key: 'orders', label: 'Siparişler', icon: <ClipboardList className="app-nav-icon-svg" />, to: role === 'admin' ? '/admin/orders' : role === 'staff' ? '/staff/orders/new' : null });
  items.push({ key: 'labels', label: 'Etiket Bas', icon: <Tag className="app-nav-icon-svg" />, to: role === 'admin' || role === 'mamul' ? '/mamul/labels' : null });
  items.push({ key: 'mamul', label: 'Mamül', icon: <Layers className="app-nav-icon-svg" />, to: role === 'admin' ? '/admin/mamuller' : null });
  if (role === 'admin') items.push({ key: 'reports', label: 'Raporlar', icon: <BarChart2 className="app-nav-icon-svg" />, to: '/admin/reports' });
  return items.filter((item) => item.to || item.action);
}, [role, onSearchOpen]);

const AppNavbar = ({ title, action, onLogout, searchOpen, setSearchOpen, compact = false }) => {
  const { appLogo } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const role = session?.yetki || 'guest';
  const primaryLinks = navSets[role] || navSets.guest;
  const showSettings = role === 'admin' && location.pathname !== '/admin/settings';
  const showSettingsMenu = role === 'admin' && location.pathname === '/admin/settings';
  const [searchValue, setSearchValue] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [canUseMobileQr] = useState(() => isMobileCameraDevice());
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileScreen(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setSearchMessage('');
      setSearchResult(null);
    } else {
      setSearchValue(''); // Clear search input when popup is closed
    }
  }, [searchOpen]);

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
      const response = await fetch(`/api/admin/mamul-lookup?code=${encodeURIComponent(lookupCode)}`, { headers: authHeaders() });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ürün bulunamadı');
      }

      setSearchOpen(false);
      setSearchValue('');
      navigate(`/mamul/preview/${result.data.qr_slug}`);
    } catch (error) {
      setSearchResult(null);
      setSearchMessage(error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const canSeeSearchPrices = role === 'admin';
  const { genelAyarlar } = useGenelAyarlar();
  const normalizedGenelAyarlar = normalizeGenelAyarlar(genelAyarlar);

  return (
    <>
    {!searchOpen ? (
    <motion.header
      className={`app-nav-shell${compact ? ' is-compact' : ''}`}
      initial={false}
      animate={{
        y: compact ? -6 : 0,
        scaleY: compact ? 0.978 : 1,
        opacity: compact ? 0.92 : 1,
      }}
      transition={chromeSpring}
      style={{ transformOrigin: '50% 0%' }}
    >
      <div className="app-nav-top">
        <div className="app-nav-brand">
          <Link to="/" className="app-nav-logo" aria-label="Kartelix ana sayfa">
            <img src={appLogo} alt="Kartelix logo" className="app-nav-logo-image" />
          </Link>
          <div className="app-nav-brand-copy">
            <div className="app-nav-brand-name">KARTELIX</div>
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
          {showSettingsMenu ? (
            <motion.button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('settings-menu:open'))}
              className="app-nav-icon-button"
              aria-label="Ayar bölümlerini aç"
              title="Ayar bölümlerini aç"
              whileTap={navTapMotion}
            >
              <Menu className="app-nav-icon-svg" />
            </motion.button>
          ) : null}
          {showSettings ? (
            <MotionLink
              to="/admin/settings"
              className="app-nav-icon-button"
              aria-label="Ayarlar"
              title="Ayarlar"
              whileTap={navTapMotion}
            >
              <Settings className="app-nav-icon-svg" />
            </MotionLink>
          ) : null}
          {onLogout ? (
            <motion.button type="button" onClick={onLogout} className="app-nav-icon-button" aria-label="Çıkış yap" title="Çıkış yap" whileTap={navTapMotion}>
              <LogOut className="app-nav-icon-svg" />
            </motion.button>
          ) : null}
          {action ? <div className="app-nav-utility">{action}</div> : null}
        </div>
      </div>
    </motion.header>
    ) : null}

    <AnimatePresence>
    {searchOpen ? (
      <motion.div
        className="app-mobile-search-sheet"
        variants={sheetBackdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.18, ease: defaultEase }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setSearchOpen(false);
          }
        }}
      >
        <motion.div
          className="app-mobile-search-panel"
          variants={bottomSheetVariants}
          transition={sheetTransition}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.18 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 86 || info.velocity.y > 680) {
              setSearchOpen(false);
            }
          }}
        >
          <div className="app-mobile-search-grabber" aria-hidden="true" />
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Ürünü aç</h2>
            <motion.button
              type="button"
              className="app-nav-icon-button"
              onClick={() => setSearchOpen(false)}
              aria-label="Aramayı kapat"
              title="Aramayı kapat"
              whileTap={tapMotion}
            >
              <X className="app-nav-icon-svg" />
            </motion.button>
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
                placeholder={isMobileScreen ? '' : 'Article code, article no veya QR değeri'}
                className="app-input app-searchbar-input"
              />
              <div className="app-searchbar-actions">
                <motion.button type="submit" className="app-searchbar-submit" aria-label="Ara" title="Ara" whileTap={tapMotion}>
                  <Search className="app-nav-icon-svg" />
                </motion.button>
                {canUseMobileQr ? (
                  <motion.button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="app-searchbar-qr"
                    aria-label="QR okut"
                    title="QR okut"
                    whileTap={tapMotion}
                  >
                    <QrCode className="app-nav-icon-svg" />
                  </motion.button>
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
              <div className="mt-2 text-sm text-[color:var(--app-text-muted)]">{formatArticleLabel(searchResult.article_code, searchResult.article_no)}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[color:var(--app-text-muted)]">
                <div>Renk: <span className="font-semibold text-[color:var(--app-text)]">{searchResult.renk || '-'}</span></div>
                <div>Kompozisyon: <span className="font-semibold text-[color:var(--app-text)]">{searchResult.kompozisyon_ozeti || '-'}</span></div>
              </div>



              {searchResult.prosesler?.length > 0 ? (
                <div className="app-soft-panel mt-3 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--app-text-muted)] mb-2">Prosesler</div>
                  <div className="space-y-1">
                    {searchResult.prosesler.map((p, i) => (
                      <div key={i} className="text-sm text-[color:var(--app-text)]">
                        {p.proses_adi}{p.proses_tipi ? <span className="text-[color:var(--app-text-muted)]"> / {p.proses_tipi}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(canSeeSearchPrices || normalizedGenelAyarlar.publicFiyatGoster) ? (
                <div className="app-mobile-search-pricing">
                  <div className="app-mobile-search-price-card">
                    <div className="app-mobile-search-summary-label">1 kg satış</div>
                    <div className="app-mobile-search-price-value">
                      {resolveDisplayPrice(searchResult.bir_kg_maliyet, searchResult.bir_kg_satis_fiyati, normalizedGenelAyarlar).toFixed(2)} {searchResult.para_birimi || 'TRY'}
                    </div>
                  </div>
                  <div className="app-mobile-search-price-card">
                    <div className="app-mobile-search-summary-label">1 kg maliyet</div>
                    <div className="app-mobile-search-price-value">{Number(searchResult.bir_kg_maliyet || 0).toFixed(2)} {searchResult.para_birimi || 'TRY'}</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a href={`/u/${searchResult.qr_slug}`} className="app-btn-secondary text-center" onClick={() => setSearchOpen(false)}>
                  Müşteri görünümü
                </a>
                {(role === 'admin' || role === 'mamul') ? (
                  <button
                    type="button"
                    className="app-btn-secondary"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(role === 'admin' ? `/admin/mamuller?id=${searchResult.mamul_id}` : `/mamul?id=${searchResult.mamul_id}`);
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
                      navigate(`/mamul/labels?mamulId=${searchResult.mamul_id}`);
                    }}
                  >
                    Etikete git
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    ) : null}
    </AnimatePresence>

    {scannerOpen && canUseMobileQr ? (
      <QrCameraModal
        title="QR ile ürün aç"
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => {
          setScannerOpen(false);
          setSearchOpen(false);
          setSearchValue('');
          const slug = value.includes('/u/') ? value.split('/u/')[1].split(/[?#]/)[0] : value.trim();
          navigate(`/mamul/preview/${slug}`);
        }}
      />
    ) : null}
    </>
  );
};

export default AppNavbar;
