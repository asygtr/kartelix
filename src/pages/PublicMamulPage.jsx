import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { resolveColorPalette, isDarkPalette } from '../utils/colorPalette';

const v = (val) => String(val || '').trim() || null;
const EASE = [0.16, 1, 0.3, 1];

/* â”€â”€â”€ Ã‡eviriler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const T = {
  TR: {
    fabric: 'KumaÅŸ Hikayesi', material: 'Hammadde', process: 'Ãœretim SÃ¼reci',
    technical: 'Teknik', related: 'AynÄ± Gruptan', width: 'En', weight: 'Gramaj',
    article: 'Article', color: 'Renk', order: 'Bu KumaÅŸÄ± SipariÅŸ Et',
    care: 'BakÄ±m TalimatlarÄ±', notFound: 'ÃœrÃ¼n bulunamadÄ±', searching: 'AranÄ±yor...',
    share: 'PaylaÅŸ', copied: 'BaÄŸlantÄ± kopyalandÄ±!',
    careLabels: {
      yikama: 'YÄ±kama', kurutma: 'Kurutma', utuleme: 'ÃœtÃ¼leme',
      kimyasal: 'Kuru Temizleme', agartma: 'AÄŸartma',
    },
  },
  EN: {
    fabric: 'Fabric Story', material: 'Raw Material', process: 'Production Process',
    technical: 'Technical', related: 'From Same Group', width: 'Width', weight: 'Weight',
    article: 'Article', color: 'Color', order: 'Order This Fabric',
    care: 'Care Instructions', notFound: 'Product not found', searching: 'Loading...',
    share: 'Share', copied: 'Link copied!',
    careLabels: {
      yikama: 'Washing', kurutma: 'Drying', utuleme: 'Ironing',
      kimyasal: 'Dry Cleaning', agartma: 'Bleaching',
    },
  },
};

/* â”€â”€â”€ BakÄ±m ikonlarÄ± (SVG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€ BakÄ±m talimatlarÄ±nÄ± parse et â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const parseCare = (raw) => {
  if (!raw) return [];
  // "yikama:30,utuleme:orta,kurutma:yok" veya JSON veya dÃ¼z metin
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return Object.entries(parsed).map(([key, val]) => ({ key, val }));
  } catch {
    // virgÃ¼lle ayrÄ±lmÄ±ÅŸ "key:val" formatÄ±
    return raw.split(',').map(s => {
      const [key, ...rest] = s.trim().split(':');
      return { key: key.trim().toLowerCase(), val: rest.join(':').trim() };
    }).filter(c => c.key);
  }
};

/* â”€â”€â”€ SVG Weave Pattern (gÃ¶rsel yoksa fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    <rect width="100%" height="100%" fill={`url(#weave)`} />
    <rect width="100%" height="100%" fill={`linear-gradient(180deg, ${P.accent}22, ${P.accentDeep}44)`} />
  </svg>
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

/* â”€â”€â”€ Ana bileÅŸen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PublicMamulPage = () => {
  const { slug } = useParams();
  const [mamul, setMamul] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('TR');
  const [shareMsg, setShareMsg] = useState('');
  const pageRef = useRef(null);
  const t = T[lang];

  const { scrollY } = useScroll({ container: pageRef });
  const heroY       = useTransform(scrollY, [0, 500], [0, -70]);
  const heroOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const heroScale   = useTransform(scrollY, [0, 350], [1, 0.95]);
  const orbY1       = useTransform(scrollY, [0, 800], [0, -130]);
  const orbY2       = useTransform(scrollY, [0, 800], [0, -60]);
  const orbY3       = useTransform(scrollY, [0, 800], [0, -180]);

  useEffect(() => {
    fetch(`/api/public/mamuller/${slug}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.error || 'BulunamadÄ±');
        setMamul(res.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const P    = useMemo(() => resolveColorPalette(mamul?.renk), [mamul?.renk]);
  const dark = isDarkPalette(P);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: mamul?.mamul_adi || 'KumaÅŸ', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShareMsg(t.copied);
      setTimeout(() => setShareMsg(''), 2200);
    }
  };

  const composition = v(mamul?.kompozisyon_ozeti);
  const story       = v(mamul?.tanitim_hikayesi) || v(mamul?.aciklama) || v(mamul?.materyal_notlari);
  const hasYarn     = mamul?.iplikler?.length > 0;
  const hasRelated  = mamul?.benzer_urunler?.length > 0;
  const careItems   = useMemo(() => parseCare(mamul?.bakim_talimatlari), [mamul?.bakim_talimatlari]);
  const gorselUrl   = v(mamul?.gorsel_url);

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3efe7' }}>
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
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3efe7', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>âœ¦</div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#172023', margin: 0 }}>{t.notFound}</h1>
        <p style={{ fontSize: '0.85rem', color: '#667178', marginTop: '0.5rem' }}>{error}</p>
      </motion.div>
    </div>
  );

  if (!mamul) return null;

  return (
    <div ref={pageRef} style={{
      fontFamily: 'Manrope, Inter, sans-serif',
      color: P.text,
      background: P.bg,
      height: '100dvh',
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>

      {/* â”€â”€ Atmosfer â”€â”€ */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${P.grad}, ${P.bgDeep} 0%, ${P.bg} 55%, ${P.bgDeep} 100%)` }} />
        <motion.div style={{ position: 'absolute', top: '-8%', left: '-4%', width: '60vw', height: '60vw', maxWidth: 560, maxHeight: 560, borderRadius: '50%', background: P.glow, filter: 'blur(70px)', opacity: 0.65, y: orbY1 }} />
        <motion.div style={{ position: 'absolute', top: '18%', right: '-8%', width: '45vw', height: '45vw', maxWidth: 440, maxHeight: 440, borderRadius: '50%', background: P.glow, filter: 'blur(90px)', opacity: 0.4, y: orbY2 }} />
        <motion.div style={{ position: 'absolute', bottom: '8%', left: '18%', width: '38vw', height: '38vw', maxWidth: 360, maxHeight: 360, borderRadius: '50%', background: P.glow, filter: 'blur(80px)', opacity: 0.3, y: orbY3 }} />
        <div style={{ position: 'absolute', inset: 0, opacity: dark ? 0.06 : 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px' }} />
      </div>

      {/* â”€â”€ Ä°Ã§erik â”€â”€ */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '36rem', margin: '0 auto', padding: '0 1rem 5rem' }}>

        {/* â•â• HERO â•â• */}
        <motion.section style={{ y: heroY, opacity: heroOpacity, scale: heroScale, paddingTop: '3.5rem', paddingBottom: '1.5rem', willChange: 'transform' }}>

          {/* Ãœst bar: marka + dil toggle + paylaÅŸ */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '0.5rem' }}
          >
            <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: P.accent, opacity: 0.75 }}>KARTELIX</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Dil toggle */}
              <button
                onClick={() => setLang(l => l === 'TR' ? 'EN' : 'TR')}
                style={{
                  fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em',
                  padding: '0.25rem 0.55rem', borderRadius: '999px',
                  background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  border: `1px solid ${P.border}`, color: P.textMuted, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {lang === 'TR' ? 'EN' : 'TR'}
              </button>

              {/* PaylaÅŸ butonu */}
              <button
                onClick={handleShare}
                style={{
                  fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em',
                  padding: '0.25rem 0.65rem', borderRadius: '999px',
                  background: `${P.accent}18`, border: `1px solid ${P.accent}40`,
                  color: P.accent, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                  <path d="M18 16a3 3 0 0 0-2.02.79L8.9 12.7A3 3 0 0 0 9 12a3 3 0 0 0-.1-.7l7-4.05A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.1 9.75A3 3 0 1 0 8 15a3 3 0 0 0 1.98-.79l7.1 4.12A3 3 0 1 0 18 16Z" />
                </svg>
                {shareMsg || t.share}
              </button>
            </div>
          </motion.div>

          {/* Swatch + baÅŸlÄ±k */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.1rem', alignItems: 'start' }}>

            {/* GÃ¶rsel / Swatch */}
            <TiltCard>
              <motion.div
                initial={{ opacity: 0, scale: 0.72, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
                style={{
                  width: '5rem', height: '6.5rem', borderRadius: '1.15rem',
                  background: `linear-gradient(140deg, ${P.accent}, ${P.accentDeep})`,
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
                  {v(mamul.renk) || 'â€”'}
                </div>
              </motion.div>
            </TiltCard>

            {/* BaÅŸlÄ±k */}
            <div style={{ paddingTop: '0.2rem' }}>
              <motion.div
                initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
                style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.45rem' }}
              >
                {v(mamul.article_code)}
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
                {v(mamul.gramaj)  && <Pill P={P} dark={dark}>{mamul.gramaj} gr/mÂ²</Pill>}
                {composition      && <Pill P={P} dark={dark} accent>{composition}</Pill>}
              </motion.div>
            </div>
          </div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.55, ease: EASE }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              marginTop: '1.75rem', width: '100%',
              padding: '0.95rem 1.25rem', borderRadius: '999px',
              background: `linear-gradient(135deg, ${P.accent}, ${P.accentDeep})`,
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.03em',
              boxShadow: `0 14px 36px ${P.glow}`,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>âœ¦</span>
            <span>{t.order}</span>
          </motion.button>
        </motion.section>

        {/* â•â• GÃ–RSEL (bÃ¼yÃ¼k â€” varsa) â•â• */}
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

        {/* â•â• HÄ°KAYE â•â• */}
        {story && (
          <Reveal delay={0.04}>
            <div style={{ ...cardStyle(P, dark), marginBottom: '0.85rem' }}>
              <SectionLabel P={P}>{t.fabric}</SectionLabel>
              <p style={{ margin: '0.7rem 0 0', fontSize: '0.9rem', lineHeight: 1.82, color: P.textMuted }}>{story}</p>
            </div>
          </Reveal>
        )}

        {/* â•â• BAKIM TALÄ°MATLARI â•â• */}
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

        {/* â•â• Ä°PLÄ°K â•â• */}
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


        {/* â•â• TEKNÄ°K â•â• */}
        <Reveal delay={0.05} x={20}>
          <div style={{ ...cardStyle(P, dark), marginBottom: '0.85rem' }}>
            <SectionLabel P={P}>{t.technical}</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.9rem' }}>
              {[
                { label: t.width,   val: mamul.en      ? `${mamul.en} cm`        : null },
                { label: t.weight,  val: mamul.gramaj  ? `${mamul.gramaj} gr/mÂ²` : null },
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

        {/* â•â• BENZER â•â• */}
        {hasRelated && (
          <Reveal delay={0.04}>
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.75rem', paddingLeft: '0.2rem' }}>
                {t.related}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(8.5rem,1fr))', gap: '0.6rem' }}>
                {mamul.benzer_urunler.map((item, i) => <RelatedCard key={item.id} item={item} index={i} />)}
              </div>
            </div>
          </Reveal>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          style={{ textAlign: 'center', paddingTop: '1.75rem' }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: P.accent, opacity: 0.55 }}>KARTELIX</div>
          <div style={{ fontSize: '0.58rem', color: P.textMuted, marginTop: '0.25rem', letterSpacing: '0.06em' }}>Tekstil Showroom</div>
        </motion.div>

      </div>
    </div>
  );
};

/* â”€â”€â”€ Alt bileÅŸenler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
        {item.aciklama && <div style={{ fontSize: '0.74rem', color: P.textMuted, marginTop: '0.18rem', lineHeight: 1.5 }}>{item.aciklama}</div>}
      </div>
      {item.proses_tipi && (
        <span style={{ flexShrink: 0, fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.textMuted, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
          {item.proses_tipi}
        </span>
      )}
    </motion.div>
  );
};

const RelatedCard = ({ item, index }) => {
  const P2     = resolveColorPalette(item.renk);
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px 0px' });
  const hasImg = v(item.gorsel_url);
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.04 + index * 0.05, ease: EASE }}
      whileHover={{ y: -3 }}
    >
      <Link to={`/u/${item.qr_slug}`} style={{ display: 'block', textDecoration: 'none' }}>
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
