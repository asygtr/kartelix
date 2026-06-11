import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const valueOrDash = (v) => String(v || '').trim() || '-';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] }
  })
};

const PublicMamulPage = () => {
  const { slug } = useParams();
  const [mamul, setMamul] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/mamuller/${slug}`);
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || 'Mamül bulunamadı');
        setMamul(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const story = useMemo(() => {
    if (!mamul) return '';
    return mamul.tanitim_hikayesi || mamul.aciklama || mamul.materyal_notlari || mamul.kompozisyon_ozeti || '';
  }, [mamul]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadWrap}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={styles.loadDot}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, delay: i * 0.18, repeat: Infinity }}
            />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <motion.div style={{ ...styles.card, maxWidth: 420, margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#172023', marginBottom: '0.5rem' }}>Mamül bulunamadı</h1>
          <p style={{ fontSize: '0.9rem', color: '#667178' }}>{error}</p>
        </motion.div>
      </main>
    );
  }

  if (!mamul) return null;

  return (
    <main style={styles.page}>
      {/* Arka plan doku */}
      <div style={styles.bgGrain} aria-hidden="true" />

      <div style={styles.container}>

        {/* HERO */}
        <motion.section
          style={styles.hero}
          initial="hidden" animate="visible" variants={fadeUp} custom={0}
        >
          {/* Dekoratif şerit */}
          <div style={styles.heroAccent} />

          <div style={styles.heroInner}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <motion.div style={styles.eyebrow} variants={fadeUp} custom={1}>
                {valueOrDash(mamul.article_code)}
                {mamul.mamul_turu_adi && (
                  <span style={styles.badge}>{mamul.mamul_turu_adi}</span>
                )}
              </motion.div>

              <motion.h1 style={styles.heroTitle} variants={fadeUp} custom={2}>
                {valueOrDash(mamul.mamul_adi)}
              </motion.h1>

              {mamul.tanitim_basligi && mamul.tanitim_basligi !== mamul.mamul_adi && (
                <motion.p style={styles.heroSubtitle} variants={fadeUp} custom={3}>
                  {mamul.tanitim_basligi}
                </motion.p>
              )}
            </div>

            {/* Özellik piller */}
            <motion.div style={styles.pillRow} variants={fadeUp} custom={3}>
              {mamul.renk && <span style={styles.pill}>🎨 {mamul.renk}</span>}
              {mamul.en && <span style={styles.pill}>↔ {mamul.en} cm</span>}
              {mamul.gramaj && <span style={styles.pill}>⚖ {mamul.gramaj} gr/m²</span>}
            </motion.div>
          </div>
        </motion.section>

        {/* ORTA GRID */}
        <div style={styles.midGrid}>

          {/* Teknik kimlik */}
          <motion.section style={styles.card} initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <SectionHead icon="◈" title="Teknik Kimlik" />
            <dl style={{ margin: 0 }}>
              {[
                { label: 'Article No', value: mamul.article_no || mamul.article_code },
                { label: 'Renk', value: mamul.renk },
                { label: 'En', value: mamul.en ? `${mamul.en} cm` : '' },
                { label: 'Gramaj', value: mamul.gramaj ? `${mamul.gramaj} gr/m²` : '' },
                { label: 'Koleksiyon', value: mamul.koleksiyon_adi },
              ].map(({ label, value }) => value && value !== '-' ? (
                <div key={label} style={styles.infoRow}>
                  <dt style={styles.infoLabel}>{label}</dt>
                  <dd style={styles.infoValue}>{valueOrDash(value)}</dd>
                </div>
              ) : null)}
            </dl>
          </motion.section>

          {/* Hikaye */}
          {story ? (
            <motion.section style={styles.card} initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <SectionHead icon="◉" title="Üretim Hikayesi" />
              <p style={styles.storyText}>{story}</p>
            </motion.section>
          ) : null}
        </div>

        {/* İPLİK REÇETESİ */}
        {mamul.iplikler?.length > 0 && (
          <motion.section style={styles.card} initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <SectionHead icon="◎" title="İplik Reçetesi" count={mamul.iplikler.length} />
            <div style={styles.yarnGrid}>
              {mamul.iplikler.map((item, i) => (
                <motion.div
                  key={item.id}
                  style={styles.yarnCard}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div style={styles.yarnName}>{item.iplik_adi}</div>
                  <div style={styles.yarnRatio}>
                    <span style={styles.yarnRatioNum}>{Math.round(item.oran_yuzde)}</span>
                    <span style={styles.yarnRatioPct}>%</span>
                  </div>
                  {/* Dolum çubuğu */}
                  <div style={styles.yarnBar}>
                    <motion.div
                      style={styles.yarnBarFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.oran_yuzde, 100)}%` }}
                      transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* PROSES AKIŞI */}
        {mamul.prosesler?.length > 0 && (
          <motion.section style={styles.card} initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <SectionHead icon="◐" title="Proses Akışı" count={mamul.prosesler.length} />
            <div style={styles.processTimeline}>
              {mamul.prosesler.map((item, i) => (
                <motion.div
                  key={item.id}
                  style={styles.processItem}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div style={styles.processNumber}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.processName}>{item.proses_adi}</div>
                    {item.aciklama && <div style={styles.processDesc}>{item.aciklama}</div>}
                  </div>
                  {item.proses_tipi && (
                    <span style={styles.processType}>{item.proses_tipi}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* BENZER ÜRÜNLER */}
        {mamul.benzer_urunler?.length > 0 && (
          <motion.section style={styles.card} initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <SectionHead icon="◇" title="Aynı Gruptan Kumaşlar" />
            <div style={styles.relatedGrid}>
              {mamul.benzer_urunler.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.38 }}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                >
                  <Link to={`/u/${item.qr_slug}`} style={styles.relatedCard}>
                    <div style={styles.relatedCode}>{item.article_code}</div>
                    <div style={styles.relatedName}>{item.mamul_adi}</div>
                    {item.renk && <div style={styles.relatedColor}>{item.renk}</div>}
                    <div style={styles.relatedArrow}>→</div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Footer */}
        <motion.footer
          style={styles.footer}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        >
          <div style={styles.footerBrand}>KARTELIX</div>
          <div style={styles.footerSub}>Tekstil Showroom — {mamul.article_code}</div>
        </motion.footer>

      </div>
    </main>
  );
};

const SectionHead = ({ icon, title, count }) => (
  <div style={styles.sectionHead}>
    <span style={styles.sectionIcon}>{icon}</span>
    <h2 style={styles.sectionTitle}>{title}</h2>
    {count != null && <span style={styles.sectionCount}>{count}</span>}
  </div>
);

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const TOKEN = {
  bg: '#f3efe7',
  surface: 'rgba(255,253,248,0.92)',
  border: 'rgba(185,121,58,0.18)',
  text: '#172023',
  muted: '#667178',
  primary: '#0f4c4f',
  accent: '#b9793a',
};

const styles = {
  page: {
    minHeight: '100dvh',
    background: `
      radial-gradient(ellipse 80% 50% at 10% 0%, rgba(185,121,58,0.14) 0%, transparent 55%),
      radial-gradient(ellipse 70% 40% at 90% 5%, rgba(15,76,79,0.12) 0%, transparent 50%),
      linear-gradient(180deg, #f8f5ef 0%, #f3efe7 100%)
    `,
    position: 'relative',
    fontFamily: "'Manrope', sans-serif",
    color: TOKEN.text,
  },
  bgGrain: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.035,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
    backgroundSize: '200px',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '42rem',
    margin: '0 auto',
    padding: '2rem 1rem 4rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  loadWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    gap: '0.6rem',
  },
  loadDot: {
    width: '0.55rem',
    height: '0.55rem',
    borderRadius: '999px',
    background: TOKEN.accent,
  },

  /* Hero */
  hero: {
    background: `linear-gradient(145deg, rgba(255,253,248,0.98), rgba(246,239,229,0.9))`,
    border: `1px solid ${TOKEN.border}`,
    borderRadius: '1.25rem',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(17,23,25,0.1), 0 1px 0 rgba(255,255,255,0.8) inset',
    position: 'relative',
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: `linear-gradient(90deg, ${TOKEN.primary}, ${TOKEN.accent})`,
  },
  heroInner: {
    padding: '2rem 1.75rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: TOKEN.muted,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.22rem 0.65rem',
    borderRadius: '999px',
    background: `color-mix(in srgb, ${TOKEN.primary} 12%, white 88%)`,
    color: TOKEN.primary,
    fontSize: '0.65rem',
    fontWeight: 800,
    letterSpacing: '0.12em',
    border: `1px solid color-mix(in srgb, ${TOKEN.primary} 20%, transparent)`,
  },
  heroTitle: {
    margin: '0.4rem 0 0',
    fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
    fontWeight: 800,
    lineHeight: 1.08,
    color: TOKEN.text,
    letterSpacing: '-0.01em',
  },
  heroSubtitle: {
    margin: '0.5rem 0 0',
    fontSize: '1rem',
    color: TOKEN.muted,
    lineHeight: 1.5,
    fontWeight: 500,
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.45rem',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.38rem 0.85rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 700,
    background: 'rgba(255,253,248,0.8)',
    border: `1px solid ${TOKEN.border}`,
    color: TOKEN.text,
    backdropFilter: 'blur(8px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
  },

  /* Kart */
  card: {
    background: `linear-gradient(145deg, rgba(255,253,248,0.96), rgba(246,239,229,0.86))`,
    border: `1px solid ${TOKEN.border}`,
    borderRadius: '1.1rem',
    padding: '1.5rem',
    boxShadow: '0 18px 48px rgba(17,23,25,0.08), 0 1px 0 rgba(255,255,255,0.75) inset',
    overflow: 'hidden',
    position: 'relative',
  },

  /* Orta grid */
  midGrid: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: '1fr',
  },

  /* Section head */
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '1.1rem',
  },
  sectionIcon: {
    fontSize: '1rem',
    color: TOKEN.accent,
    lineHeight: 1,
  },
  sectionTitle: {
    margin: 0,
    fontSize: '0.92rem',
    fontWeight: 800,
    color: TOKEN.text,
    letterSpacing: '0.02em',
  },
  sectionCount: {
    marginLeft: 'auto',
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: TOKEN.muted,
    background: 'rgba(102,113,120,0.1)',
    padding: '0.18rem 0.55rem',
    borderRadius: '999px',
  },

  /* Info rows */
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.65rem 0',
    borderBottom: `1px solid ${TOKEN.border}`,
  },
  infoLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: TOKEN.muted,
  },
  infoValue: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: TOKEN.text,
    textAlign: 'right',
  },

  /* Story */
  storyText: {
    margin: 0,
    fontSize: '0.9rem',
    lineHeight: 1.8,
    color: TOKEN.muted,
  },

  /* Yarn */
  yarnGrid: {
    display: 'grid',
    gap: '0.75rem',
    gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
  },
  yarnCard: {
    padding: '1rem',
    borderRadius: '0.85rem',
    background: 'rgba(255,253,248,0.7)',
    border: `1px solid ${TOKEN.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  yarnName: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: TOKEN.text,
    lineHeight: 1.3,
  },
  yarnRatio: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.1rem',
    marginTop: '0.2rem',
  },
  yarnRatioNum: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: TOKEN.primary,
    lineHeight: 1,
  },
  yarnRatioPct: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: TOKEN.accent,
  },
  yarnBar: {
    height: '3px',
    borderRadius: '999px',
    background: 'rgba(15,76,79,0.1)',
    overflow: 'hidden',
    marginTop: '0.3rem',
  },
  yarnBarFill: {
    height: '100%',
    borderRadius: '999px',
    background: `linear-gradient(90deg, ${TOKEN.primary}, ${TOKEN.accent})`,
  },

  /* Process */
  processTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  processItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.85rem',
    padding: '0.85rem 1rem',
    borderRadius: '0.75rem',
    background: 'rgba(255,253,248,0.65)',
    border: `1px solid ${TOKEN.border}`,
  },
  processNumber: {
    flexShrink: 0,
    width: '1.6rem',
    height: '1.6rem',
    borderRadius: '999px',
    background: `linear-gradient(135deg, ${TOKEN.primary}, ${TOKEN.accent})`,
    color: 'white',
    fontSize: '0.7rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processName: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: TOKEN.text,
  },
  processDesc: {
    marginTop: '0.2rem',
    fontSize: '0.78rem',
    color: TOKEN.muted,
    lineHeight: 1.5,
  },
  processType: {
    flexShrink: 0,
    fontSize: '0.65rem',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: TOKEN.muted,
    background: 'rgba(102,113,120,0.1)',
    padding: '0.2rem 0.55rem',
    borderRadius: '999px',
  },

  /* Related */
  relatedGrid: {
    display: 'grid',
    gap: '0.65rem',
    gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
  },
  relatedCard: {
    display: 'block',
    padding: '1rem',
    borderRadius: '0.85rem',
    background: 'rgba(255,253,248,0.7)',
    border: `1px solid ${TOKEN.border}`,
    textDecoration: 'none',
    color: 'inherit',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 180ms',
  },
  relatedCode: {
    fontSize: '0.65rem',
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: TOKEN.muted,
  },
  relatedName: {
    marginTop: '0.3rem',
    fontSize: '0.88rem',
    fontWeight: 700,
    color: TOKEN.text,
    lineHeight: 1.3,
  },
  relatedColor: {
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: TOKEN.muted,
  },
  relatedArrow: {
    position: 'absolute',
    bottom: '0.75rem',
    right: '0.85rem',
    fontSize: '0.85rem',
    color: TOKEN.accent,
    fontWeight: 700,
  },

  /* Footer */
  footer: {
    textAlign: 'center',
    paddingTop: '1rem',
  },
  footerBrand: {
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.28em',
    color: TOKEN.primary,
  },
  footerSub: {
    marginTop: '0.3rem',
    fontSize: '0.68rem',
    color: TOKEN.muted,
    letterSpacing: '0.1em',
  },
};

export default PublicMamulPage;
