import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { resolveColorPalette, isDarkPalette } from '../utils/colorPalette';
import { authHeaders } from '../utils/auth';
import { normalizeGenelAyarlar, resolveDisplayPrice } from '../utils/generalSettings';
import { useGenelAyarlar } from '../theme/ThemeProvider';

const v = (val) => String(val || '').trim() || null;
const EASE = [0.16, 1, 0.3, 1];

const prettifyText = (value) => String(value || '')
  .trim()
  .replace(/_/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/\bBaskili\b/gi, 'Baskılı')
  .replace(/\bSuprem\b/gi, 'Süprem')
  .replace(/\b\w/g, (char) => char.toLocaleUpperCase('tr-TR'));

const formatTypeLabel = (value) => {
  const text = prettifyText(value);
  return text ? `${text} Kumaş` : 'Kumaş';
};

const swatchGradient = (palette, deg = 135) =>
  `linear-gradient(${deg}deg, ${palette.swatch || palette.accent}, ${palette.swatchDeep || palette.accentDeep})`;

/* â”€â”€â”€ Çeviriler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const T = {
  TR: {
    fabric: 'Kumaş Hikayesi', material: 'Hammadde', process: 'Üretim Süreci',
    technical: 'Teknik', related: 'Aynı Gruptan', width: 'En', weight: 'Gramaj',
    article: 'Article', color: 'Renk', order: 'Bu Kumaşı Sipariş Et',
    care: 'Bakım Talimatları', notFound: 'Ürün bulunamadı', searching: 'Aranıyor...',
    price: 'Fiyat', salesPrice: '1 kg satış', costPrice: '1 kg maliyet',
    share: 'Paylaş', copied: 'Bağlantı kopyalandı!',
    careLabels: {
      yikama: 'Yıkama', kurutma: 'Kurutma', utuleme: 'Ütüleme',
      kimyasal: 'Kuru Temizleme', agartma: 'Ağartma',
    },
  },
  EN: {
    fabric: 'Fabric Story', material: 'Raw Material', process: 'Production Process',
    technical: 'Technical', related: 'From Same Group', width: 'Width', weight: 'Weight',
    article: 'Article', color: 'Color', order: 'Order This Fabric',
    care: 'Care Instructions', notFound: 'Product not found', searching: 'Loading...',
    price: 'Pricing', salesPrice: '1 kg sales', costPrice: '1 kg cost',
    share: 'Share', copied: 'Link copied!',
    careLabels: {
      yikama: 'Washing', kurutma: 'Drying', utuleme: 'Ironing',
      kimyasal: 'Dry Cleaning', agartma: 'Bleaching',
    },
  },
};

/* â”€â”€â”€ Bakım ikonları (SVG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CARE_ICONS = {
  yikama: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 7h18M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M5 7l1 12h12l1-12" />
      <path d="M9 11c1 2 5 2 6 0" />
    </svg>
  ),
  kurutma: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  utuleme: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 16h13a3 3 0 0 0 3-3V9H4v7Z" />
      <path d="M4 16l-1 3h2" />
      <path d="M9 13v.01M12 13v.01M15 13v.01" />
    </svg>
  ),
  kimyasal: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 3h6M10 3v5l-4 8a2 2 0 0 0 1.8 3h8.4a2 2 0 0 0 1.8-3l-4-8V3" />
    </svg>
  ),
  agartma: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v3M6.3 6.3l2.1 2.1M3 12h3M6.3 17.7l2.1-2.1M12 21v-3M17.7 17.7l-2.1-2.1M21 12h-3M17.7 6.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

/* â”€â”€â”€ Bakım talimatlarını parse et â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const parseCare = (raw) => {
  if (!raw) return [];
  // "yikama:30,utuleme:orta,kurutma:yok" veya JSON veya düz metin
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return Object.entries(parsed).map(([key, val]) => ({ key, val }));
  } catch {
    // virgülle ayrılmış "key:val" formatı
    return raw.split(',').map(s => {
      const [key, ...rest] = s.trim().split(':');
      return { key: key.trim().toLowerCase(), val: rest.join(':').trim() };
    }).filter(c => c.key);
  }
};

/* â”€â”€â”€ SVG Weave Pattern (görsel yoksa fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const WeavePattern = ({ P, dark }) => (
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <pattern id="weave" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="transparent" />
        <rect x="0" y="0" width="6" height="3" fill={P.accent} opacity="0.18" />
        <rect x="6" y="3" width="6" height="3" fill={P.accent} opacity="0.18" />
        <rect x="0" y="6" width="6" height="3" fill={P.accentDeep} opacity="0.12" />
        <rect x="6" y="9" width="6" height="3" fill={P.accentDeep} opacity="0.12" />
        <line x1="0" y1="3" x2="12" y2="3" stroke={P.accent} strokeWidth="0.4" opacity="0.2" />
        <line x1="0" y1="6" x2="12" y2="6" stroke={P.accent} strokeWidth="0.4" opacity="0.2" />
        <line x1="0" y1="9" x2="12" y2="9" stroke={P.accent} strokeWidth="0.4" opacity="0.2" />
        <line x1="6" y1="0" x2="6" y2="12" stroke={P.accent} strokeWidth="0.4" opacity="0.2" />
      </pattern>
    </defs>
    <motion.rect
      width="110%"
      height="110%"
      x="-5%"
      y="-5%"
      fill={`url(#weave)`}
      animate={{ x: ['-5%', '-12%'], y: ['-5%', '0%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    />
    <rect width="100%" height="100%" fill={`linear-gradient(180deg, ${P.accent}22, ${P.accentDeep}44)`} />
  </svg>
);

const FabricAtmosphere = ({ P, dark }) => (
  <motion.svg
    aria-hidden="true"
    viewBox="0 0 900 1400"
    preserveAspectRatio="xMidYMid slice"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark ? 0.5 : 0.42 }}
  >
    <defs>
      <linearGradient id="fabricBase" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={P.bgDeep} />
        <stop offset="50%" stopColor={P.bg} />
        <stop offset="100%" stopColor={P.bgDeep} />
      </linearGradient>
      <linearGradient id="fabricFoldLight" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity={dark ? 0.11 : 0.18} />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="fabricFoldShadow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="black" stopOpacity="0" />
        <stop offset="50%" stopColor="black" stopOpacity={dark ? 0.24 : 0.13} />
        <stop offset="100%" stopColor="black" stopOpacity="0" />
      </linearGradient>
      <pattern id="fabricThreads" width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M0 6 H18 M0 12 H18" stroke={P.accent} strokeWidth="0.55" opacity={dark ? 0.18 : 0.13} />
        <path d="M6 0 V18 M12 0 V18" stroke={P.accentDeep} strokeWidth="0.5" opacity={dark ? 0.16 : 0.11} />
      </pattern>
      <filter id="fabricGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.7 0.9" numOctaves="2" seed="9" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.08" />
        </feComponentTransfer>
      </filter>
      <filter id="softFabricBlur" x="-15%" y="-15%" width="130%" height="130%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>

    <rect width="900" height="1400" fill="url(#fabricBase)" />
    <motion.g
      animate={{ y: [0, -8, 0], opacity: [0.72, 0.86, 0.72] }}
      transition={{ duration: 24, repeat: Infinity, ease: EASE }}
    >
      <path
        d="M-180 230 C90 95 240 360 455 245 C650 140 760 120 1080 210"
        fill="none"
        stroke="url(#fabricFoldLight)"
        strokeWidth="130"
        strokeLinecap="round"
        opacity={dark ? 0.48 : 0.62}
        filter="url(#softFabricBlur)"
      />
      <path
        d="M-180 580 C80 430 250 735 490 590 C675 480 780 465 1080 560"
        fill="none"
        stroke="url(#fabricFoldShadow)"
        strokeWidth="150"
        strokeLinecap="round"
        opacity={dark ? 0.5 : 0.42}
        filter="url(#softFabricBlur)"
      />
      <path
        d="M-180 1010 C110 850 270 1155 540 995 C720 888 840 890 1080 970"
        fill="none"
        stroke="url(#fabricFoldLight)"
        strokeWidth="128"
        strokeLinecap="round"
        opacity={dark ? 0.36 : 0.48}
        filter="url(#softFabricBlur)"
      />
    </motion.g>
    <motion.rect
      x="-40"
      y="-40"
      width="980"
      height="1480"
      fill="url(#fabricThreads)"
      animate={{ x: [-40, -46, -40], y: [-40, -34, -40] }}
      transition={{ duration: 28, repeat: Infinity, ease: EASE }}
    />
    <rect width="900" height="1400" filter="url(#fabricGrain)" opacity={dark ? 0.7 : 0.55} />
  </motion.svg>
);

/* â”€â”€â”€ Scroll reveal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Reveal = ({ children, delay = 0, x = 0, y = 28 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px 0px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y, x }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >{children}</motion.div>
  );
};

/* â”€â”€â”€ 3D tilt (sadece mouse) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TiltCard = ({ children, style }) => {
  const ref = useRef(null);
  const rotX = useSpring(0, { stiffness: 180, damping: 22 });
  const rotY = useSpring(0, { stiffness: 180, damping: 22 });
  return (
    <motion.div ref={ref}
      style={{ ...style, rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d', perspective: 800 }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        rotY.set(((e.clientX - r.left - r.width / 2) / r.width) * 12);
        rotX.set(-((e.clientY - r.top - r.height / 2) / r.height) * 12);
      }}
      onMouseLeave={() => { rotX.set(0); rotY.set(0); }}
    >{children}</motion.div>
  );
};

/* â”€â”€â”€ Ana bileşen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PublicMamulPage = ({ mode = 'public' }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isInternal = mode === 'internal';
  const [mamul, setMamul] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('TR');
  const { genelAyarlar: contextGenelAyarlar, loadGenelAyarlar } = useGenelAyarlar();
  const normalizedGenelAyarlar = useMemo(() => normalizeGenelAyarlar(contextGenelAyarlar), [contextGenelAyarlar]);
  const [shareMsg, setShareMsg] = useState('');
  const pageRef = useRef(null);
  const t = T[lang];

  const { scrollY } = useScroll({ container: pageRef });
  const heroY       = useTransform(scrollY, [0, 500], [0, -70]);
  const heroOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const heroScale   = useTransform(scrollY, [0, 350], [1, 0.95]);
  const orbY1       = useTransform(scrollY, [0, 800], [0, -130]);

  useEffect(() => {
    const mamulRequest = isInternal
      ? fetch(`/api/admin/mamul-lookup?code=${encodeURIComponent(slug)}`, { headers: authHeaders() }).then(r => r.json())
      : fetch(`/api/public/mamuller/${slug}`).then(r => r.json());

    mamulRequest.then((mamulRes) => {
      if (!mamulRes.success) throw new Error(mamulRes.error || 'Bulunamadı');
      setMamul(mamulRes.data);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, isInternal]);

  useEffect(() => {
    loadGenelAyarlar();
  }, [loadGenelAyarlar]);

  const P    = useMemo(() => resolveColorPalette(mamul?.renk), [mamul?.renk]);
  const dark = isDarkPalette(P);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: mamul?.mamul_adi || 'Kumaş', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShareMsg(t.copied);
      setTimeout(() => setShareMsg(''), 2200);
    }
  };

  const composition  = v(mamul?.kompozisyon_ozeti);
  const prosesAcik   = isInternal || normalizedGenelAyarlar.publicProsesGoster === true;
  const hikayeAcik   = isInternal || normalizedGenelAyarlar.publicHikayeGoster !== false;
  const story        = hikayeAcik ? (v(mamul?.tanitim_hikayesi) || v(mamul?.aciklama) || v(mamul?.materyal_notlari)) : null;
  const hasYarn = mamul?.iplikler?.length > 0 && (isInternal || normalizedGenelAyarlar.publicHammaddeGoster !== false);
  const hasRelated   = mamul?.benzer_urunler?.length > 0;
  const hasProsesler = prosesAcik && mamul?.prosesler?.length > 0;
  const careItems    = useMemo(() => parseCare(mamul?.bakim_talimatlari), [mamul?.bakim_talimatlari]);
  const gorselUrl    = v(mamul?.gorsel_url);
  const satisFiyati  = useMemo(() => resolveDisplayPrice(mamul?.bir_kg_maliyet, mamul?.bir_kg_satis_fiyati, normalizedGenelAyarlar), [mamul?.bir_kg_maliyet, mamul?.bir_kg_satis_fiyati, normalizedGenelAyarlar]);
  const hasPrice = isInternal
    ? (Number(mamul?.bir_kg_satis_fiyati || 0) > 0 || Number(mamul?.bir_kg_maliyet || 0) > 0)
    : (normalizedGenelAyarlar.publicFiyatGoster === true && satisFiyati > 0);

  if (loading || contextGenelAyarlar === null) return (
    <div style={{ minHeight: isInternal ? '60vh' : '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isInternal ? 'transparent' : '#f3efe7' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[0,1,2].map(i => (
          <motion.div key={i}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#b9793a' }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: isInternal ? '60vh' : '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isInternal ? 'transparent' : '#f3efe7', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#172023', margin: 0 }}>{t.notFound}</h1>
        <p style={{ fontSize: '0.85rem', color: '#667178', marginTop: '0.5rem' }}>{error}</p>
      </motion.div>
    </div>
  );

  if (!mamul) return null;

  if (isInternal) {
    const maliyet = Number(mamul.bir_kg_maliyet || 0);
    const satis = Number(satisFiyati || 0);
    const pb = mamul.para_birimi || 'TRY';
    const kar = maliyet > 0 && satis > 0 && satis !== maliyet
      ? (((satis - maliyet) / maliyet) * 100).toFixed(1) : null;
    const colorLabel = v(mamul.renk) || '-';
    const typeLabel = formatTypeLabel(mamul.mamul_turu_adi);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ fontFamily: 'Manrope, Inter, sans-serif', color: 'var(--app-text)', minHeight: '100%', overflowY: 'auto', paddingBottom: '2rem' }}>
        {/* Üst bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.7rem', borderRadius: '999px', background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
            Geri
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a href={`/u/${mamul.qr_slug}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', borderRadius: '999px', background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Müşteri nasıl görüyor?
            </a>
          </div>
        </div>

        {/* Ana grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.65fr)', gap: '1rem', alignItems: 'start' }}>

          {/* Sol */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Görsel */}
            <div style={{ borderRadius: '1.1rem', overflow: 'hidden', background: `linear-gradient(135deg,${P.bg},${P.bgDeep})`, aspectRatio: '4/5', position: 'relative', border: `1px solid ${P.border}`, boxShadow: `0 14px 34px ${P.glow}` }}>
              {gorselUrl
                ? <img src={gorselUrl} alt={mamul.mamul_adi} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', padding: '1.2rem' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.78 }}>
                      <WeavePattern P={P} dark={dark} />
                    </div>
                    <div style={{ position: 'relative', width: '5.4rem', height: '5.4rem', borderRadius: '1.25rem', background: swatchGradient(P), border: `1px solid ${P.border}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.72), 0 12px 28px ${P.glow}` }} />
                    <div style={{ position: 'relative', fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.textMuted, opacity: 0.72 }}>Kumaş numunesi</div>
                  </div>
              }
              <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', background: dark ? 'rgba(0,0,0,0.46)' : 'rgba(255,255,255,0.74)', backdropFilter: 'blur(10px)', borderRadius: '0.7rem', padding: '0.45rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${P.border}` }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '0.25rem', background: swatchGradient(P), flexShrink: 0, border: '1px solid rgba(17,23,25,0.16)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: dark ? 'rgba(255,255,255,0.9)' : P.text, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{colorLabel}</span>
              </div>
            </div>

            {/* Kimlik */}
            <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '1rem', padding: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.02em', color: P.text, background: `${P.accent}18`, border: `1px solid ${P.accent}30`, borderRadius: '999px', padding: '0.26rem 0.6rem', marginBottom: '0.55rem' }}>{typeLabel}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--app-text)', lineHeight: 1.2 }}>{mamul.mamul_adi}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--app-text-muted)', marginTop: '0.4rem', fontWeight: 700 }}>
                <span style={{ fontSize: '0.54rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6 }}>ARTICLE NO</span>
                <span>{mamul.article_no || mamul.article_code}</span>
              </div>
              {mamul.koleksiyon_adi && !String(mamul.koleksiyon_adi).startsWith('Excel') && <div style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.64rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '999px', background: `${P.accent}18`, color: P.accent, border: `1px solid ${P.accent}30` }}>{mamul.koleksiyon_adi}</div>}
            </div>

            {/* Teknik */}
            <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '1rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.57rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.75rem' }}>Teknik Özellikler</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'En', val: mamul.en ? `${mamul.en} cm` : null },
                  { label: 'Gramaj', val: mamul.gramaj ? `${mamul.gramaj} gr/m²` : null },
                  { label: 'Kompozisyon', val: mamul.kompozisyon_ozeti },
                ].filter(r => r.val).map(({ label, val }) => (
                  <div key={label} style={{ padding: '0.5rem 0.6rem', borderRadius: '0.6rem', background: 'var(--app-soft)', border: '1px solid var(--app-border)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.18rem' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--app-text)' }}>{val}</div>
                </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Fiyat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '1rem', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.3rem' }}>1 kg Maliyet</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--app-text)' }}>{maliyet.toFixed(2)}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--app-text-muted)', marginTop: '0.1rem' }}>{pb}</div>
              </div>
              <div style={{ background: `linear-gradient(135deg,${P.accent}18,${P.accentDeep}28)`, border: `1px solid ${P.accent}30`, borderRadius: '1rem', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.accent, opacity: 0.75, marginBottom: '0.3rem' }}>1 kg Satış</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: P.accent }}>{satis.toFixed(2)}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem', flexWrap: 'wrap', gap: '0.2rem' }}>
                  <div style={{ fontSize: '0.6rem', color: P.accent, opacity: 0.7 }}>{pb}</div>
                  {kar !== null && (
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '999px', background: Number(kar) >= 0 ? '#16a34a20' : '#dc262620', color: Number(kar) >= 0 ? '#16a34a' : '#dc2626', border: `1px solid ${Number(kar) >= 0 ? '#16a34a30' : '#dc262630'}` }}>%{kar}</div>
                  )}
                </div>
              </div>
            </div>

            {/* İplik */}
            {mamul.iplikler?.length > 0 && (
              <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '1rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.57rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.85rem' }}>İplik Reçetesi</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {mamul.iplikler.map((item, i) => {
                    const pct = Math.min(Math.max(Number(item.oran_yuzde) || 0, 0), 100);
                    return (
                      <div key={item.id || i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--app-text)' }}>{item.iplik_adi}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: P.accent }}>%{Math.round(pct)}</span>
                        </div>
                        <div style={{ height: '5px', borderRadius: '999px', background: 'var(--app-soft)', overflow: 'hidden' }}>
                          <motion.div style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg,${P.accent},${P.accentDeep})` }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }} />
                        </div>
                        {Number(item.birim_fiyat) > 0 && <div style={{ fontSize: '0.64rem', color: 'var(--app-text-muted)', marginTop: '0.12rem' }}>{Number(item.birim_fiyat).toFixed(2)} {pb} / kg</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prosesler */}
            {mamul.prosesler?.length > 0 && (
              <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '1rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.57rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.85rem' }}>Prosesler</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {mamul.prosesler.map((item, i) => (
                    <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.55rem 0.7rem', borderRadius: '0.65rem', background: 'var(--app-soft)', border: '1px solid var(--app-border)' }}>
                      <div style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: `linear-gradient(135deg,${P.accent},${P.accentDeep})`, color: '#fff', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--app-text)' }}>{item.proses_adi}</div>
                        {item.proses_tipi && item.proses_tipi !== 'Excel' && <div style={{ fontSize: '0.64rem', color: 'var(--app-text-muted)' }}>{item.proses_tipi}</div>}
                      </div>
                      {Number(item.birim_maliyet) > 0 && <div style={{ fontSize: '0.75rem', fontWeight: 800, color: P.accent, flexShrink: 0 }}>{Number(item.birim_maliyet).toFixed(2)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notlar */}
            {story && (
              <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '1rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.57rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.6rem' }}>Kumaş Hikayesi</div>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--app-text-muted)' }}>{story}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div ref={pageRef} style={{
      fontFamily: 'Manrope, Inter, sans-serif',
      color: P.text,
      background: P.bg,
      ...(isInternal ? { minHeight: '100%' } : { height: '100dvh', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }),
      position: 'relative',
    }}>

      {/* â”€â”€ Atmosfer â”€â”€ */}
      <div aria-hidden="true" style={{ position: isInternal ? 'absolute' : 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <FabricAtmosphere P={P} dark={dark} />
        <motion.div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${P.grad}, transparent 0%, ${P.bg}14 48%, ${P.bgDeep}36 100%)`, y: orbY1 }} />
        <div style={{ position: 'absolute', inset: 0, opacity: dark ? 0.06 : 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px' }} />
      </div>

      {/* â”€â”€ İçerik â”€â”€ */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '36rem', margin: '0 auto', padding: '0 1rem 5rem' }}>

        {/* ╔╔ HERO ╔╔ */}
        <motion.section style={{ y: heroY, opacity: heroOpacity, scale: heroScale, paddingTop: '1.5rem', paddingBottom: '1.5rem', willChange: 'transform' }}>

          {/* Ust bar: geri / marka + dil toggle + paylas */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isInternal ? '1.25rem' : '2rem', gap: '0.5rem' }}
          >
            {isInternal ? (
              <button
                type='button'
                onClick={() => navigate(-1)}
                aria-label='Geri'
                title='Geri'
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 0.7rem 0.4rem 0.55rem', borderRadius: '999px',
                  background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  border: '1px solid ' + P.border, color: P.text,
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                }}
              >
                <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M15 18l-6-6 6-6' />
                </svg>
                <span>Geri</span>
              </button>
            ) : (
              <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: P.accent, opacity: 0.75 }}>KARTELIX</span>
            )}

            {!isInternal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setLang(l => l === 'TR' ? 'EN' : 'TR')}
                  style={{
                    fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em',
                    padding: '0.25rem 0.55rem', borderRadius: '999px',
                    background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    border: '1px solid ' + P.border, color: P.textMuted, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {lang === 'TR' ? 'EN' : 'TR'}
                </button>

                <button
                  onClick={handleShare}
                  style={{
                    fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em',
                    padding: '0.25rem 0.65rem', borderRadius: '999px',
                    background: P.accent + '18', border: '1px solid ' + P.accent + '40',
                    color: P.accent, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  <svg viewBox='0 0 24 24' width='11' height='11' fill='currentColor'>
                    <path d='M18 16a3 3 0 0 0-2.02.79L8.9 12.7A3 3 0 0 0 9 12a3 3 0 0 0-.1-.7l7-4.05A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.1 9.75A3 3 0 1 0 8 15a3 3 0 0 0 1.98-.79l7.1 4.12A3 3 0 1 0 18 16Z' />
                  </svg>
                  {shareMsg || t.share}
                </button>
              </div>
            ) : null}
          </motion.div>

          {/* Swatch + başlık */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.1rem', alignItems: 'start' }}>

            {/* Görsel / Swatch */}
            <TiltCard>
              <motion.div
                initial={{ opacity: 0, scale: 0.72, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
                style={{
                  width: '5rem', height: '6.5rem', borderRadius: '1.15rem',
                  background: swatchGradient(P, 140),
                  boxShadow: `0 18px 44px ${P.glow}, 0 1px 0 rgba(255,255,255,0.16) inset`,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {gorselUrl ? (
                  <img
                    src={gorselUrl}
                    alt={mamul.mamul_adi}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '1.15rem' }}
                  />
                ) : (
                  <>
                    <WeavePattern P={P} dark={dark} />
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg,rgba(255,255,255,0.16),transparent)', borderRadius: '1.15rem 1.15rem 0 0' }} />
                  </>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '0.5rem 0.45rem 0.55rem',
                  background: 'linear-gradient(0deg,rgba(0,0,0,0.38),transparent)',
                  borderRadius: '0 0 1.15rem 1.15rem',
                  fontSize: '0.42rem', fontWeight: 900, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)',
                  textAlign: 'center', lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}>
                  {v(mamul.renk) || '–'}
                </div>
              </motion.div>
            </TiltCard>

            {/* Başlık */}
            <div style={{ paddingTop: '0.2rem' }}>
              <motion.div
                initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
                style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.45rem' }}
              >
                <span style={{ opacity: 0.6, marginRight: '0.3rem' }}>ARTICLE NO</span>{v(mamul.article_code)}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.18, ease: EASE }}
                style={{ margin: 0, fontSize: 'clamp(1.55rem, 5.5vw, 2.3rem)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.018em', color: P.text }}
              >
                {v(mamul.mamul_adi)}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.45 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}
              >
                {v(mamul.en)      && <Pill P={P} dark={dark}>{mamul.en} cm</Pill>}
                {v(mamul.gramaj)  && <Pill P={P} dark={dark}>{mamul.gramaj} gr/m²</Pill>}
                {composition      && <Pill P={P} dark={dark} accent>{composition}</Pill>}
              </motion.div>

            </div>
          </div>

{!isInternal && (
           <motion.button
             initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.42, duration: 0.55, ease: EASE }}
             whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
             style={{
               marginTop: '1.75rem', width: '100%',
               padding: '0.95rem 1.25rem', borderRadius: '999px',
               background: `linear-gradient(135deg, ${P.accent}, ${P.accentDeep})`,
               color: 'white', border: 'none',
               fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.03em',
               boxShadow: `0 14px 36px ${P.glow}`,
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
               cursor: 'pointer', fontFamily: 'inherit',
             }}
           >
             <span style={{ fontSize: '0.7rem' }}>✦</span>
             <span>{t.order}</span>
           </motion.button>
         )}

         {/* Hero sonrası Hikaye (mobil için - ekranın tamamına yayılır) */}
         {!isInternal && story && (
           <div style={{ marginTop: '2rem', padding: '0 0.25rem' }}>
             <div style={{ ...cardStyle(P, dark), borderRadius: '1.4rem' }}>
               <SectionLabel P={P}>{t.fabric}</SectionLabel>
               <p style={{ margin: '1rem 0 0', fontSize: '0.95rem', lineHeight: 1.82, color: P.textMuted }}>{story}</p>
             </div>
           </div>
         )}
       </motion.section>

        {/* GÖRSEL (büyük – varsa) */}
        {gorselUrl && (
          <Reveal delay={0.03}>
            <div style={{ marginBottom: '0.85rem', borderRadius: '1.1rem', overflow: 'hidden', boxShadow: `0 18px 48px ${P.glow}` }}>
              <img
                src={gorselUrl}
                alt={mamul.mamul_adi}
                style={{ width: '100%', display: 'block', maxHeight: '22rem', objectFit: 'cover' }}
              />
            </div>
          </Reveal>
        )}

        {/* BAKIM TALİMATLARI */}
        {careItems.length > 0 && (
          <Reveal delay={0.05}>
            <div style={{ ...cardStyle(P, dark), marginBottom: '0.85rem' }}>
              <SectionLabel P={P}>{t.care}</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.9rem' }}>
                {careItems.map(({ key, val }) => (
                  <div key={key} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                    padding: '0.75rem 0.9rem', borderRadius: '0.85rem', minWidth: '4.5rem',
                    background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${P.border}`,
                  }}>
                    <div style={{ color: P.accent, opacity: 0.85 }}>
                      {CARE_ICONS[key] || CARE_ICONS.yikama}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: P.textMuted, textAlign: 'center', lineHeight: 1.3 }}>
                      {t.careLabels[key] || key}
                    </div>
                    {val && (
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: P.text, textAlign: 'center' }}>{val}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {hasProsesler && (
          <Reveal delay={0.055}>
            <div style={{ ...cardStyle(P, dark), marginBottom: "0.85rem" }}>
              <SectionLabel P={P}>{t.process}</SectionLabel>
              <div style={{ marginTop: "0.9rem" }}>
                {mamul.prosesler.map((item, i) => (<ProcessRow key={item.id} item={item} index={i} P={P} dark={dark} total={mamul.prosesler.length} />))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ╔╔ İPLİK ╔╔ */}
        {hasYarn && (
          <Reveal delay={0.06}>
            <div style={{ ...cardStyle(P, dark), marginBottom: '0.85rem' }}>
              <SectionLabel P={P}>{t.material}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.9rem' }}>
                {mamul.iplikler.map((item, i) => <YarnRow key={item.id} item={item} index={i} P={P} dark={dark} />)}
              </div>
            </div>
          </Reveal>
        )}


        {/* ╔╔ TEKNİK ╔╔ */}
        <Reveal delay={0.05} x={20}>
          <div style={{ ...cardStyle(P, dark), marginBottom: '0.85rem' }}>
            <SectionLabel P={P}>{t.technical}</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.9rem' }}>
              {[
                { label: t.width,   val: mamul.en      ? `${mamul.en} cm`        : null },
                { label: t.weight,  val: mamul.gramaj  ? `${mamul.gramaj} gr/m²` : null },
                { label: t.article, val: mamul.article_no || mamul.article_code },
                { label: t.color,   val: mamul.renk },
              ].filter(r => r.val).map(({ label, val }) => (
                <div key={label} style={{ padding: '0.7rem 0.8rem', borderRadius: '0.7rem', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.28rem' }}>{label}</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: P.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ╔╔ FİYAT ╔╔ */}
        {hasPrice && (
          <Reveal delay={0.045}>
            <div style={{ ...cardStyle(P, dark), marginBottom: '0.85rem' }}>
              <SectionLabel P={P}>{t.price}</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: isInternal ? '1fr 1fr' : '1fr', gap: '0.65rem', marginTop: '0.9rem' }}>
                <div style={{ padding: '0.7rem 0.8rem', borderRadius: '0.7rem', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.28rem' }}>{t.salesPrice}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: P.accent }}>{satisFiyati.toFixed(2)} TRY</div>
                </div>
                {isInternal && (
                  <div style={{ padding: '0.7rem 0.8rem', borderRadius: '0.7rem', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${P.border}` }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.28rem' }}>{t.costPrice}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: P.accent }}>{Number(mamul.bir_kg_maliyet || 0).toFixed(2)} TRY</div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )}

        {/* ╔╔ BENZER ╔╔ */}
        {!isInternal && hasRelated && (
          <Reveal delay={0.04}>
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.75rem', paddingLeft: '0.2rem' }}>
                {t.related}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(8.5rem,1fr))', gap: '0.6rem' }}>
                {mamul.benzer_urunler.map((item, i) => <RelatedCard key={item.id} item={item} index={i} isInternal={isInternal} />)}
              </div>
            </div>
          </Reveal>
        )}

        {/* Footer */}
        {!isInternal && (
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            style={{ textAlign: 'center', paddingTop: '1.75rem' }}
          >
            <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: P.accent, opacity: 0.55 }}>KARTELIX</div>
            <div style={{ fontSize: '0.58rem', color: P.textMuted, marginTop: '0.25rem', letterSpacing: '0.06em' }}>Tekstil Showroom</div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

/* â”€â”€â”€ Alt bileşenler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const Pill = ({ children, P, dark, accent }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '0.28rem 0.7rem', borderRadius: '999px',
    fontSize: '0.7rem', fontWeight: 700,
    background: accent ? `${P.accent}20` : dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    color: accent ? P.accent : P.textMuted,
    border: `1px solid ${accent ? P.accent + '40' : P.border}`,
  }}>{children}</span>
);

const SectionLabel = ({ P, children }) => (
  <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: P.accent, opacity: 0.82 }}>{children}</div>
);

const YarnRow = ({ item, index, P, dark }) => {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px 0px' });
  const pct    = Math.min(Math.max(Number(item.oran_yuzde) || 0, 0), 100);
  return (
    <div ref={ref}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: P.text }}>{item.iplik_adi}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: P.accent }}>%{Math.round(pct)}</span>
      </div>
      <div style={{ height: '4px', borderRadius: '999px', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg,${P.accent},${P.accentDeep})` }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 0.85, delay: 0.08 + index * 0.07, ease: EASE }}
        />
      </div>
    </div>
  );
};

const ProcessRow = ({ item, index, P, dark, total }) => {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px 0px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -14 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.06, ease: EASE }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', paddingLeft: '0.2rem', paddingBottom: index < total - 1 ? '0.9rem' : 0 }}
    >
      <div style={{ flexShrink: 0, width: '1.35rem', height: '1.35rem', borderRadius: '50%', background: `linear-gradient(135deg,${P.accent},${P.accentDeep})`, color: 'white', fontSize: '0.58rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${P.glow}`, zIndex: 1 }}>
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: P.text }}>{item.proses_adi}</div>
        {item.aciklama && !/^[A-Z]+\d+:/.test(item.aciklama) && <div style={{ fontSize: '0.74rem', color: P.textMuted, marginTop: '0.18rem', lineHeight: 1.5 }}>{item.aciklama}</div>}
      </div>

    </motion.div>
  );
};

const RelatedCard = ({ item, index, isInternal }) => {
  const P2     = resolveColorPalette(item.renk);
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px 0px' });
  const hasImg = v(item.gorsel_url);
  const href   = isInternal ? `/mamul/preview/${item.qr_slug}` : `/u/${item.qr_slug}`;
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.04 + index * 0.05, ease: EASE }}
      whileHover={{ y: -3 }}
    >
      <Link to={href} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ borderRadius: '0.9rem', overflow: 'hidden', border: `1px solid ${P2.border}`, background: P2.surface, boxShadow: `0 6px 20px ${P2.glow}` }}>
          <div style={{ height: '3.2rem', background: `linear-gradient(135deg,${P2.accent},${P2.accentDeep})`, position: 'relative', overflow: 'hidden' }}>
            {hasImg
              ? <img src={item.gorsel_url} alt={item.mamul_adi} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,0.14),transparent)' }} />
            }
          </div>
          <div style={{ padding: '0.6rem 0.7rem' }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: P2.textMuted }}>{item.article_code}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: P2.text, marginTop: '0.18rem', lineHeight: 1.3 }}>{item.mamul_adi}</div>
            {item.renk && <div style={{ fontSize: '0.65rem', color: P2.accent, marginTop: '0.2rem', fontWeight: 600 }}>{item.renk}</div>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const cardStyle = (P, dark) => ({
  background: P.surface,
  border: `1px solid ${P.border}`,
  borderRadius: '1.1rem',
  padding: '1.3rem',
  boxShadow: `0 10px 36px rgba(0,0,0,${dark ? '0.28' : '0.06'}), 0 1px 0 rgba(255,255,255,${dark ? '0.05' : '0.65'}) inset`,
  position: 'relative',
  overflow: 'hidden',
});

export default PublicMamulPage;
