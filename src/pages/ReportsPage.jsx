import React, { useEffect, useState } from 'react';
import AppNavbar from '../components/AppNavbar';
import { clearSession } from '../utils/auth';

const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');

  const loadReport = async () => {
    try {
      setMessage('');
      const response = await fetch('/api/admin/reports/overview');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Rapor verisi alınamadı');
      }
      setReport(result.data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          eyebrow="Kartelix / Raporlar"
          title="Yönetim içgörü ekranı"
          action={<button type="button" className="app-btn-secondary" onClick={loadReport}>Yenile</button>}
          onLogout={handleLogout}
        />

        {message ? <div className="app-panel p-4 text-sm">{message}</div> : null}

        {report ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="app-stat">
                <div className="app-stat-label">Toplam mamül</div>
                <div className="app-stat-value">{report.toplamMamul}</div>
              </div>
              <div className="app-stat">
                <div className="app-stat-label">Public aktif</div>
                <div className="app-stat-value">{report.publicAktifMamul}</div>
              </div>
              <div className="app-stat">
                <div className="app-stat-label">Toplam sipariş</div>
                <div className="app-stat-value">{report.toplamSiparis}</div>
              </div>
              <div className="app-stat">
                <div className="app-stat-label">Public görüntülenme</div>
                <div className="app-stat-value">{report.toplamPublicGoruntulenme}</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="app-panel p-6">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">En çok okutulanlar</h2>
                <div className="mt-5 space-y-3">
                  {report.enCokOkutulanlar?.map((item) => (
                    <div key={item.id} className="app-soft-panel p-4">
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{item.article_code}</div>
                      <div className="mt-3 text-sm text-[color:var(--app-text-muted)]">
                        Okutulma: <span className="font-semibold text-[color:var(--app-text)]">{item.okutulma}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="app-panel p-6">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">En çok siparişe girenler</h2>
                <div className="mt-5 space-y-3">
                  {report.enCokSipariseGirenler?.map((item) => (
                    <div key={item.id} className="app-soft-panel p-4">
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{item.article_code}</div>
                      <div className="mt-3 text-sm text-[color:var(--app-text-muted)]">
                        Toplam kg: <span className="font-semibold text-[color:var(--app-text)]">{Number(item.toplam_kg || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ReportsPage;
