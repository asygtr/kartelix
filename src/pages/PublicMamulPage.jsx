import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
} from 'framer-motion';
import { resolveColorPalette, isDarkPalette } from '../utils/colorPalette';

/* ─── Yardımcılar ─────────────────────────────────────────────────────────── */
const v = (val) => String(val || '').trim() || null;

const EASE = [0.16, 1, 0.3, 1];

/* ─── Scroll reveal wrapper ──────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, x = 0, y = 32, scale = 1 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, x, scale }}
      animate={inView ? { opacity: 1, y: 0, x: 0, scale: 1 } : {}}
      transition={{ duration: 0.72, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

/* ─── 3D tilt kart ───────────────────────────────────────────────────────── */
const TiltCard = ({ children, style, className }) => {
  const cardRef = useRef(null);
  const rotX = useSpring(0, { stiffness: 200, damping: 24 });
  const rotY = useSpring(0, { stiffness: 200, damping: 24 });
  const glow = useSpring(0, { stiffness: 200, damping: 24 });

  const handleMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    rotY.set((cx / rect.width) * 14);
    rotX.set(-(cy / rect.height) * 14);
    glow.set(1);
  };

  const handleLeave = () => {
    rotX.set(0); rotY.set(0); glow.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ ...style, rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d', perspective: 900 }}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchMove={(e) => {
        const t = e.touches[0];
        handleMove({ clientX: t.clientX, clientY: t.clientY });
      }}
      onTouchEnd={handleLeave}
    >
      {children}
    </motion.div>
  );
};

/* ─── Ana Bileşen ─────────────────────────────────────────────────────────── */
const PublicMamulPage = () => {
  const { slug } = useParams();
  const [mamul, setMamul] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const { scrollY } = useScroll();

  // Parallax değerleri
  const heroY = useTransform(scrollY, [0, 600], [0, -90]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.94]);
  const bgY = useTransform(scrollY, [0, 800], [0, 120]);
  const orbY1 = useTransform(scrollY, [0, 800], [0, -160]);
  const orbY2 = useTransform(scrollY, [0, 800], [0, -80]);
  const orbY3 = useTransform(scrollY, [0, 800], [0, -220]);

  useEffect(() => {
    fetch(`/api/public/mamuller/${slug}`)
      .then(r => r.json())
      .then(result => {
        if (!result.success) throw new Error(result.error || 'Bulunamadı');
        setMamul(result.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const P = useMemo(() => resolveColorPalette(mamul?.renk), [mamul?.renk]);
  const dark = isDarkPalette(P);

  const composition = v(mamul?.kompozisyon_ozeti);
  const story = v(mamul?.tanitim_hikayesi) || v(mamul?.aciklama) || v(mamul?.materyal_notlari);
  const hasYarn = mamul?.iplikler?.length > 0;
  const hasProcess = mamul?.prosesler?.length > 0;
  const hasRelated = mamul?.benzer_urunler?.length > 0;

  /* ── CSS değişkenleri renk temasına göre ── */
  const cssVars = {
    '--p-bg': P.bg,
    '--p-bg-deep': P.bgDeep,
    '--p-surface': P.surface,
    '--p-border': P.border,
    '--p-accent': P.accent,
    '--p-accent-deep': P.accentDeep,
    '--p-text': P.text,
    '--p-muted': P.textMuted,
    '--p-glow': P.glow,
  };

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3efe7', fontFamily: 'Manrope,sans-serif' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[0,1,2].map(i => (
          <motion.div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#b9793a' }}
            animate={{ y: [0, -10, 0] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3efe7', fontFamily: 'Manrope,sans-serif', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✦</div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#172023' }}>Ürün bulunamadı</h1>
        <p style={{ fontSize: '0.85rem', color: '#667178', marginTop: '0.5rem' }}>{error}</p>
      </motion.div>
    </div>
  );

  if (!mamul) return null;

  return (
    <div ref={containerRef} style={{ ...cssVars, fontFamily: 'Manrope,sans-serif', color: P.text, background: P.bg, minHeight: '100dvh', position: 'relative', overflowX: 'hidden' }}>

      {/* ── Arka plan atmosfer katmanı ── */}
      <motion.div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', y: bgY }}>
        {/* Ana gradient */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${P.grad}, ${P.bgDeep} 0%, ${P.bg} 60%, ${P.bgDeep} 100%)` }} />
        {/* Işıklı orb 1 */}
        <motion.div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '65vw', height: '65vw', maxWidth: 600, maxHeight: 600, borderRadius: '50%', background: P.glow, filter: 'blur(80px)', opacity: 0.7, y: orbY1 }} />
        {/* Işıklı orb 2 */}
        <motion.div style={{ position: 'absolute', top: '20%', right: '-10%', width: '50vw', height: '50vw', maxWidth: 480, maxHeight: 480, borderRadius: '50%', background: P.glow, filter: 'blur(100px)', opacity: 0.45, y: orbY2 }} />
        {/* Işıklı orb 3 */}
        <motion.div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '40vw', height: '40vw', maxWidth: 380, maxHeight: 380, borderRadius: '50%', background: P.glow, filter: 'blur(90px)', opacity: 0.35, y: orbY3 }} />
        {/* İnce doku */}
        <div style={{ position: 'absolute', inset: 0, opacity: dark ? 0.06 : 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '180px' }} />
      </motion.div>

      {/* ── İçerik ── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '38rem', margin: '0 auto', padding: '0 1rem 5rem' }}>

        {/* ════════════════════════════════
            HERO
        ════════════════════════════════ */}
        <motion.section style={{ y: heroY, opacity: heroOpacity, scale: heroScale, paddingTop: '4.5rem', paddingBottom: '1.5rem' }}>

          {/* Üst marka şeridi */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: P.accent, opacity: 0.8 }}>
              KARTELIX
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', color: P.textMuted, textTransform: 'uppercase' }}>
              {v(mamul.mamul_turu_adi) || 'Tekstil'}
            </div>
          </motion.div>

          {/* Renk swatchi + başlık */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem', alignItems: 'start' }}>

            {/* 3D renk swatchi */}
            <TiltCard>
              <motion.div
                initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
                style={{
                  width: '5.5rem', height: '7rem',
                  borderRadius: '1.25rem',
                  background: `linear-gradient(135deg, ${P.accent} 0%, ${P.accentDeep} 100%)`,
                  boxShadow: `0 20px 50px ${P.glow}, 0 2px 0 rgba(255,255,255,0.18) inset`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '0.65rem 0.5rem',
                  position: 'relative', overflow: 'hidden',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* İç parlaklık */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.18), transparent)', borderRadius: '1.25rem 1.25rem 0 0' }} />
                {/* Renk adı */}
                <div style={{ fontSize: '0.52rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.3, zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {v(mamul.renk) || '—'}
                </div>
              </motion.div>
            </TiltCard>

            {/* Başlık bloğu */}
            <div style={{ paddingTop: '0.25rem' }}>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
                style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.55rem' }}>
                {v(mamul.article_code)}
              </motion.div>

              <motion.h1 initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
                style={{ margin: 0, fontSize: 'clamp(1.6rem, 6vw, 2.4rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: P.text }}>
                {v(mamul.mamul_adi)}
              </motion.h1>

              {/* Özellik piller */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.85rem' }}>
                {v(mamul.en) && <Pill P={P}>{mamul.en} cm</Pill>}
                {v(mamul.gramaj) && <Pill P={P}>{mamul.gramaj} gr/m²</Pill>}
                {composition && <Pill P={P} accent>{composition}</Pill>}
              </motion.div>
            </div>
          </div>

          {/* CTA butonu */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
            style={{ marginTop: '2rem' }}>
            <button
              style={{
                width: '100%', padding: '1rem 1.5rem',
                borderRadius: '999px',
                background: `linear-gradient(135deg, ${P.accent}, ${P.accentDeep})`,
                color: 'white', border: 'none', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.04em',
                boxShadow: `0 16px 40px ${P.glow}`,
                fontFamily: 'Manrope, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              }}
            >
              <span>✦</span>
              <span>Bu Kumaşı Sipariş Et</span>
            </button>
          </motion.div>
        </motion.section>

        {/* ════════════════════════════════
            KUMAŞ HİKAYESİ
        ════════════════════════════════ */}
        {story && (
          <Reveal delay={0.05}>
            <TiltCard style={{ ...cardStyle(P), marginBottom: '1rem' }}>
              <Label P={P}>Kumaş Hikayesi</Label>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.85, color: P.textMuted, marginTop: '0.75rem' }}>
                {story}
              </p>
            </TiltCard>
          </Reveal>
        )}

        {/* ════════════════════════════════
            İPLİK KOMPOZİSYONU
        ════════════════════════════════ */}
        {hasYarn && (
          <Reveal delay={0.08}>
            <div style={{ ...cardStyle(P), marginBottom: '1rem' }}>
              <Label P={P}>Hammadde</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                {mamul.iplikler.map((item, i) => (
                  <YarnRow key={item.id} item={item} index={i} P={P} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ════════════════════════════════
            ÜRETIM SÜRECİ
        ════════════════════════════════ */}
        {hasProcess && (
          <Reveal delay={0.1} x={-24}>
            <div style={{ ...cardStyle(P), marginBottom: '1rem' }}>
              <Label P={P}>Üretim Süreci</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' , marginTop: '1rem', position: 'relative' }}>
                {/* Dikey çizgi */}
                <div style={{ position: 'absolute', left: '0.7rem', top: '1rem', bottom: '1rem', width: '1px', background: `linear-gradient(180deg, ${P.accent}, transparent)`, opacity: 0.3 }} />
                {mamul.prosesler.map((item, i) => (
                  <ProcessRow key={item.id} item={item} index={i} P={P} total={mamul.prosesler.length} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ════════════════════════════════
            TEKNİK BİLGİ (minimal)
        ════════════════════════════════ */}
        <Reveal delay={0.06} x={24}>
          <div style={{ ...cardStyle(P), marginBottom: '1rem' }}>
            <Label P={P}>Teknik</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              {[
                { label: 'En', val: mamul.en ? `${mamul.en} cm` : null },
                { label: 'Gramaj', val: mamul.gramaj ? `${mamul.gramaj} gr/m²` : null },
                { label: 'Article', val: mamul.article_no || mamul.article_code },
                { label: 'Renk', val: mamul.renk },
              ].filter(r => r.val).map(({ label, val }) => (
                <div key={label} style={{ padding: '0.75rem 0.85rem', borderRadius: '0.75rem', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.3rem' }}>{label}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: P.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ════════════════════════════════
            BENZER ÜRÜNLER
        ════════════════════════════════ */}
        {hasRelated && (
          <Reveal delay={0.05}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: P.textMuted, marginBottom: '0.85rem', paddingLeft: '0.25rem' }}>
                Aynı Gruptan
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.7rem' }}>
                {mamul.benzer_urunler.map((item, i) => (
                  <RelatedCard key={item.id} item={item} index={i} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', paddingTop: '2rem', paddingBottom: '1rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: P.accent, opacity: 0.6 }}>KARTELIX</div>
          <div style={{ fontSize: '0.6rem', color: P.textMuted, marginTop: '0.3rem', letterSpacing: '0.08em' }}>Tekstil Showroom</div>
        </motion.div>

      </div>
    </div>
  );
};

/* ─── Alt bileşenler ──────────────────────────────────────────────────────── */

const Pill = ({ children, P, accent }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '0.3rem 0.75rem', borderRadius: '999px',
    fontSize: '0.72rem', fontWeight: 700,
    background: accent
      ? `${P.accent}22`
      : isDarkPalette(P) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    color: accent ? P.accent : P.textMuted,
    border: `1px solid ${accent ? P.accent + '44' : P.border}`,
  }}>{children}</span>
);

const Label = ({ P, children }) => (
  <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.accent, opacity: 0.85 }}>{children}</div>
);

const YarnRow = ({ item, index, P }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px 0px' });
  const pct = Math.min(Math.max(Number(item.oran_yuzde) || 0, 0), 100);

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: P.text }}>{item.iplik_adi}</span>
        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: P.accent }}>%{Math.round(pct)}</span>
      </div>
      <div style={{ height: '5px', borderRadius: '999px', background: isDarkPalette(P) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${P.accent}, ${P.accentDeep})` }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 0.9, delay: 0.1 + index * 0.08, ease: EASE }}
        />
      </div>
    </div>
  );
};

const ProcessRow = ({ item, index, P, total }) => (
  <Reveal delay={0.06 + index * 0.05} x={-12}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', paddingLeft: '0.25rem', paddingBottom: index < total - 1 ? '1rem' : 0 }}>
      <div style={{ flexShrink: 0, width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: `linear-gradient(135deg, ${P.accent}, ${P.accentDeep})`, color: 'white', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${P.glow}`, zIndex: 1 }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, paddingTop: '0.1rem' }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: P.text }}>{item.proses_adi}</div>
        {item.aciklama && <div style={{ fontSize: '0.76rem', color: P.textMuted, marginTop: '0.2rem', lineHeight: 1.5 }}>{item.aciklama}</div>}
      </div>
      {item.proses_tipi && (
        <span style={{ flexShrink: 0, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.textMuted, background: isDarkPalette(P) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', padding: '0.22rem 0.55rem', borderRadius: '999px' }}>
          {item.proses_tipi}
        </span>
      )}
    </div>
  </Reveal>
);

const RelatedCard = ({ item, index }) => {
  const P2 = resolveColorPalette(item.renk);
  return (
    <Reveal delay={0.05 + index * 0.06} y={20}>
      <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Link to={`/u/${item.qr_slug}`} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{
            borderRadius: '1rem', overflow: 'hidden',
            border: `1px solid ${P2.border}`,
            background: P2.surface,
            boxShadow: `0 8px 24px ${P2.glow}`,
          }}>
            {/* Renk bloğu */}
            <div style={{ height: '3.5rem', background: `linear-gradient(135deg, ${P2.accent}, ${P2.accentDeep})`, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.15), transparent)' }} />
            </div>
            <div style={{ padding: '0.65rem 0.75rem' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: P2.textMuted }}>{item.article_code}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: P2.text, marginTop: '0.2rem', lineHeight: 1.3 }}>{item.mamul_adi}</div>
              {item.renk && <div style={{ fontSize: '0.68rem', color: P2.accent, marginTop: '0.25rem', fontWeight: 600 }}>{item.renk}</div>}
            </div>
          </div>
        </Link>
      </motion.div>
    </Reveal>
  );
};

/* ─── Stil yardımcıları ───────────────────────────────────────────────────── */
const cardStyle = (P) => ({
  background: P.surface,
  border: `1px solid ${P.border}`,
  borderRadius: '1.15rem',
  padding: '1.4rem',
  boxShadow: `0 12px 40px rgba(0,0,0,${isDarkPalette(P) ? '0.3' : '0.07'}), 0 1px 0 rgba(255,255,255,${isDarkPalette(P) ? '0.06' : '0.7'}) inset`,
  position: 'relative',
  overflow: 'hidden',
});

export default PublicMamulPage;
