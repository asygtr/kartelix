import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { getSession } from '../utils/auth';
import { authHeaders } from '../utils/auth';

const EASE = [0.2, 0.8, 0.2, 1];

/* ─── Odometer / slot-machine sayaç ─────────────────────────────────────── */
const DIGIT_H = 32;

const Digit = ({ digit }) => (
  <div style={{ height: DIGIT_H, overflow: 'hidden', display: 'inline-block', lineHeight: `${DIGIT_H}px` }}>
    <motion.div
      animate={{ y: -digit * DIGIT_H }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {[0,1,2,3,4,5,6,7,8,9].map(n => (
        <div key={n} style={{ height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}>{n}</div>
      ))}
    </motion.div>
  </div>
);

const Counter = ({ to }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const digits = String(inView ? (Number(to) || 0) : 0).split('').map(Number);
  return (
    <span ref={ref} style={{ display: 'inline-flex' }}>
      {digits.map((d, i) => <Digit key={i} digit={d} />)}
    </span>
  );
};

/* ─── Mini bar chart (SVG, chart.js gerektirmez) ─────────────────────────── */
const MiniBar = ({ value, max, color }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div ref={ref} style={{ height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <motion.div
        style={{ height: '100%', borderRadius: 999, background: color }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : {}}
        transition={{ duration: 0.9, ease: EASE }}
      />
    </div>
  );
};

/* ─── Stat kart ──────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon, color, delay = 0, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: EASE }}
    className="app-stat"
    style={{ position: 'relative', overflow: 'hidden' }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: color, borderRadius: '999px 0 0 999px' }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
      <div>
        <div className="app-stat-label">{label}</div>
        <div className="app-stat-value" style={{ color }}>
          <Counter to={Number(value) || 0} />
        </div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--app-text-muted)', marginTop: '0.15rem' }}>{sub}</div>}
      </div>
      <div style={{ fontSize: '1.4rem', opacity: 0.5, marginTop: '0.15rem' }}>{icon}</div>
    </div>
  </motion.div>
);

/* ─── Nav kart ───────────────────────────────────────────────────────────── */
const NavCard = ({ to, icon, title, desc, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.32, delay, ease: [0.32, 0.72, 0, 1] }}
    whileHover={{ y: -2, transition: { duration: 0.14 } }}
    whileTap={{ scale: 0.96, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
  >
    <Link to={to} className="app-card" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.95rem 1.1rem', textDecoration: 'none' }}>
      <div style={{ width: '2.6rem', height: '2.6rem', borderRadius: '0.7rem', background: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--app-text)', letterSpacing: '-0.01em' }}>{title}</div>
        {desc && <div style={{ fontSize: '0.72rem', color: 'var(--app-text-muted)', marginTop: '0.1rem' }}>{desc}</div>}
      </div>
      <div style={{ fontSize: '0.85rem', color, opacity: 0.6 }}>›</div>
    </Link>
  </motion.div>
);

/* ─── Ana bileşen ────────────────────────────────────────────────────────── */
const AdminLandingPage = () => {
  const [report, setReport] = useState(null);
  const session = getSession();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  useEffect(() => {
    fetch('/api/admin/reports/overview', { headers: authHeaders() })
      .then(r => r.json())
      .then(res => { if (res.success) setReport(res.data); })
      .catch(() => {});
  }, []);

  const maxOkutulma = Math.max(...(report?.enCokOkutulanlar?.map(i => i.okutulma) || [1]));
  const maxKg       = Math.max(...(report?.enCokSipariseGirenler?.map(i => i.toplam_kg) || [1]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Karşılama */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="app-panel"
        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
      >
        <div>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--app-text-muted)' }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--app-text)', marginTop: '0.15rem' }}>
            {greeting}, {session?.username || 'yönetici'} 👋
          </div>
        </div>
        <div style={{ fontSize: '1.5rem' }}>
          {hour < 6 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤' : '🌆'}
        </div>
      </motion.div>

      {/* Stat kartları — masaüstünde görünür, mobilde gizli */}
      {report && (
        <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <StatCard label="Toplam Mamül"   value={report.toplamMamul}               icon="🧵" color="var(--app-primary)"  delay={0.05} />
          <StatCard label="Aktif Ürün"     value={report.publicAktifMamul}          icon="✦"  color="var(--app-accent)"   delay={0.1}  />
          <StatCard label="Sipariş"        value={report.toplamSiparis}             icon="📋" color="#7c3aed"             delay={0.15} />
          <StatCard label="QR Görüntüleme" value={report.toplamPublicGoruntulenme}  icon="👁" color="#0891b2"             delay={0.2}  />
        </div>
      )}

      {/* En çok okutulanlar — masaüstünde görünür, mobilde gizli */}
      {report?.enCokOkutulanlar?.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.25, ease: EASE }}
          className="app-panel hidden md:block"
          style={{ padding: '1.1rem 1.25rem' }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.85rem' }}>
            En Çok Okutulan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {report.enCokOkutulanlar.map((item, i) => (
              <div key={item.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--app-text)' }}>{item.mamul_adi}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--app-primary)' }}>{item.okutulma}×</span>
                </div>
                <MiniBar value={item.okutulma} max={maxOkutulma} color="var(--app-primary)" />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* En çok siparişe girenler — masaüstünde görünür, mobilde gizli */}
      {report?.enCokSipariseGirenler?.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.3, ease: EASE }}
          className="app-panel hidden md:block"
          style={{ padding: '1.1rem 1.25rem' }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.85rem' }}>
            En Çok Sipariş
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {report.enCokSipariseGirenler.map((item) => (
              <div key={item.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--app-text)' }}>{item.mamul_adi}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--app-accent)' }}>{Number(item.toplam_kg).toFixed(0)} kg</span>
                </div>
                <MiniBar value={item.toplam_kg} max={maxKg} color="var(--app-accent)" />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Hızlı erişim başlığı — masaüstünde görünür, mobilde gizli */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="hidden md:block"
        style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--app-text-muted)', paddingLeft: '0.25rem' }}
      >
        Hızlı Erişim
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <NavCard to="/admin/mamuller"    icon="🧵" title="Mamül Kartları"     desc="Kumaş detayları ve fiyatlar"    color="var(--app-primary)"  delay={0.38} />
        <NavCard to="/staff/orders/new" icon="📋" title="Siparişler"         desc="Yeni sipariş ve takip"          color="#7c3aed"             delay={0.42} />
        <NavCard to="/mamul/labels"     icon="🏷" title="Etiket Bas"         desc="QR etiket oluştur"              color="var(--app-accent)"   delay={0.46} />
        <NavCard to="/admin/reports"    icon="📊" title="Raporlar"           desc="Satış ve görüntülenme analizi"  color="#0891b2"             delay={0.5}  />
        <NavCard to="/admin/settings"   icon="⚙️" title="Üretim Altyapısı"  desc="Ayarlar ve yapılandırma"        color="#64748b"             delay={0.54} />
      </div>

    </div>
  );
};

export default AdminLandingPage;
