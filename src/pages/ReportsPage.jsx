import React, { useEffect, useRef, useState } from 'react';
import { authHeaders } from '../utils/auth';
import { motion, useInView } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, DoughnutController
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, DoughnutController);

const PRIMARY   = '#0f4c4f';
const ACCENT    = '#b9793a';
const PURPLE    = '#7c3aed';
const TEAL      = '#0891b2';
const COLORS    = [PRIMARY, ACCENT, PURPLE, TEAL, '#059669', '#d97706'];

/* ─── Animasyonlu sayaç ──────────────────────────────────────────────────── */
const Counter = ({ to, suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref  = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1100, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to]);
  return <span ref={ref}>{val}{suffix}</span>;
};

/* ─── Stat kart ──────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon, color, delay, suffix = '' }) => (
  <motion.div
    initial={false}
    className="app-stat"
    style={{ position: 'relative', overflow: 'hidden' }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: color }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="app-stat-label">{label}</div>
        <div className="app-stat-value" style={{ color }}>
          <Counter to={Number(value) || 0} suffix={suffix} />
        </div>
      </div>
      <span style={{ fontSize: '1.3rem', opacity: 0.45 }}>{icon}</span>
    </div>
  </motion.div>
);

/* ─── Bölüm başlığı ──────────────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--app-text-muted)', marginBottom: '0.75rem', paddingLeft: '0.1rem' }}>
    {children}
  </div>
);

/* ─── Ana bileşen ────────────────────────────────────────────────────────── */
const ReportsPage = () => {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/admin/reports/overview', { headers: authHeaders() })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.error || 'Hata');
        setReport(res.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="app-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--app-text-muted)', fontSize: '0.9rem' }}>
      Rapor yükleniyor...
    </div>
  );

  if (error) return (
    <div className="app-panel" style={{ padding: '1.25rem', color: 'var(--app-text-muted)', fontSize: '0.85rem' }}>{error}</div>
  );

  if (!report) return null;

  /* ── Chart verileri ── */
  const okutulanLabels = report.enCokOkutulanlar?.map(i => i.mamul_adi?.slice(0, 18)) || [];
  const okutulanData   = report.enCokOkutulanlar?.map(i => i.okutulma) || [];

  const siparisLabels  = report.enCokSipariseGirenler?.map(i => i.mamul_adi?.slice(0, 18)) || [];
  const siparisData    = report.enCokSipariseGirenler?.map(i => Number(i.toplam_kg || 0).toFixed(1)) || [];

  const doughnutData = {
    labels: ['Aktif Ürünler', 'Pasif / Taslak'],
    datasets: [{
      data: [report.publicAktifMamul, Math.max(0, report.toplamMamul - report.publicAktifMamul)],
      backgroundColor: [PRIMARY, 'rgba(0,0,0,0.08)'],
      borderColor: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.9)'],
      borderWidth: 3,
    }]
  };

  const barOpts = (label) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutCubic' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(23,32,35,0.92)',
        titleFont: { family: 'Manrope', size: 11 },
        bodyFont: { family: 'Manrope', size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (ctx) => ` ${ctx.parsed.y} ${label}` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Manrope', size: 10 }, color: '#667178', maxRotation: 30 }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { family: 'Manrope', size: 10 }, color: '#667178' },
        beginAtZero: true
      }
    }
  });

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    animation: { duration: 900, easing: 'easeOutCubic' },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Manrope', size: 11 }, padding: 16, color: '#667178' }
      },
      tooltip: {
        backgroundColor: 'rgba(23,32,35,0.92)',
        titleFont: { family: 'Manrope', size: 11 },
        bodyFont: { family: 'Manrope', size: 11 },
        padding: 10,
        cornerRadius: 8,
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Stat kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        <StatCard label="Toplam Mamül"    value={report.toplamMamul}              icon="🧵" color={PRIMARY}  delay={0.04} />
        <StatCard label="Aktif Ürün"      value={report.publicAktifMamul}         icon="✦"  color={ACCENT}   delay={0.09} />
        <StatCard label="Sipariş"         value={report.toplamSiparis}            icon="📋" color={PURPLE}   delay={0.14} />
        <StatCard label="QR Görüntüleme"  value={report.toplamPublicGoruntulenme} icon="👁" color={TEAL}     delay={0.19} />
      </div>

      {/* Aktif/Pasif doughnut */}
      {report.toplamMamul > 0 && (
        <motion.section
          initial={false}
          className="app-panel" style={{ padding: '1.25rem' }}
        >
          <SectionTitle>Ürün Durumu</SectionTitle>
          <div style={{ position: 'relative', height: 200 }}>
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
          {/* Ortada yüzde */}
          <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--app-text-muted)' }}>
            <span style={{ fontWeight: 800, color: PRIMARY }}>
              {report.toplamMamul > 0 ? Math.round((report.publicAktifMamul / report.toplamMamul) * 100) : 0}%
            </span>
            {' '}aktif yayında
          </div>
        </motion.section>
      )}

      {/* QR Okutulma bar chart */}
      {okutulanData.length > 0 && (
        <motion.section
          initial={false}
          className="app-panel" style={{ padding: '1.25rem' }}
        >
          <SectionTitle>QR Okutulma Sıralaması</SectionTitle>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: okutulanLabels,
                datasets: [{
                  data: okutulanData,
                  backgroundColor: COLORS.slice(0, okutulanData.length).map(c => c + 'cc'),
                  borderColor: COLORS.slice(0, okutulanData.length),
                  borderWidth: 1.5,
                  borderRadius: 6,
                  borderSkipped: false,
                }]
              }}
              options={barOpts('kez')}
            />
          </div>
        </motion.section>
      )}

      {/* Sipariş kg bar chart */}
      {siparisData.length > 0 && (
        <motion.section
          initial={false}
          className="app-panel" style={{ padding: '1.25rem' }}
        >
          <SectionTitle>Sipariş Sıralaması (kg)</SectionTitle>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: siparisLabels,
                datasets: [{
                  data: siparisData,
                  backgroundColor: COLORS.slice(0, siparisData.length).map(c => c + 'cc'),
                  borderColor: COLORS.slice(0, siparisData.length),
                  borderWidth: 1.5,
                  borderRadius: 6,
                  borderSkipped: false,
                }]
              }}
              options={barOpts('kg')}
            />
          </div>
        </motion.section>
      )}

      {/* Detay listeleri */}
      <div style={{ display: 'grid', gap: '0.85rem' }}>

        {report.enCokOkutulanlar?.length > 0 && (
          <motion.section
            initial={false}
            className="app-panel" style={{ padding: '1.1rem 1.25rem' }}
          >
            <SectionTitle>QR Detay</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {report.enCokOkutulanlar.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: COLORS[i % COLORS.length] + '20', border: `1.5px solid ${COLORS[i % COLORS.length]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.mamul_adi}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)' }}>{item.article_code}</div>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                    {item.okutulma}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {report.enCokSipariseGirenler?.length > 0 && (
          <motion.section
            initial={false}
            className="app-panel" style={{ padding: '1.1rem 1.25rem' }}
          >
            <SectionTitle>Sipariş Detay</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {report.enCokSipariseGirenler.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: COLORS[i % COLORS.length] + '20', border: `1.5px solid ${COLORS[i % COLORS.length]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.mamul_adi}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)' }}>{item.article_code}</div>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                    {Number(item.toplam_kg).toFixed(0)} kg
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>
    </div>
  );
};

export default ReportsPage;
