import React, { useEffect, useState } from 'react';

const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await fetch('/api/admin/reports/overview');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Rapor verisi alınamadı');
      }
      setReport(result.data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <>
      {message ? <div className="app-panel p-3 sm:p-4 text-xs sm:text-sm">{message}</div> : null}
        {loading && !report ? <div className="app-panel p-3 sm:p-4 text-xs sm:text-sm">Rapor verisi yükleniyor...</div> : null}

        {report ? (
          <>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 app-reveal-up app-reveal-delay-1">
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

            <div className="grid gap-3 sm:gap-4 xl:grid-cols-2 app-reveal-up app-reveal-delay-2">
              <section className="app-panel p-4 sm:p-6">
                <h2 className="text-base sm:text-xl font-semibold text-[color:var(--app-text)]">En çok okutulanlar</h2>
                <div className="mt-3 sm:mt-5 space-y-2 sm:space-y-3">
                  {report.enCokOkutulanlar?.map((item) => (
                    <div key={item.id} className="app-soft-panel p-3 sm:p-4">
                      <div className="text-sm font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-0.5 text-xs text-[color:var(--app-text-muted)]">{item.article_code}</div>
                      <div className="mt-2 text-xs text-[color:var(--app-text-muted)]">
                        Okutulma: <span className="font-semibold text-[color:var(--app-text)]">{item.okutulma}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="app-panel p-4 sm:p-6">
                <h2 className="text-base sm:text-xl font-semibold text-[color:var(--app-text)]">En çok siparişe girenler</h2>
                <div className="mt-3 sm:mt-5 space-y-2 sm:space-y-3">
                  {report.enCokSipariseGirenler?.map((item) => (
                    <div key={item.id} className="app-soft-panel p-3 sm:p-4">
                      <div className="text-sm font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-0.5 text-xs text-[color:var(--app-text-muted)]">{item.article_code}</div>
                      <div className="mt-2 text-xs text-[color:var(--app-text-muted)]">
                        Toplam kg: <span className="font-semibold text-[color:var(--app-text)]">{Number(item.toplam_kg || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
    </>
  );
};

export default ReportsPage;
