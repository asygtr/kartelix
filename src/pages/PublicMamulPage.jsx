import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const formatNumber = (value, digits = 2) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number === 0) return '-';
  return number.toFixed(digits);
};

const valueOrDash = (value) => {
  const text = String(value || '').trim();
  return text || '-';
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-[color:var(--app-border)] py-3 last:border-b-0">
    <dt className="min-w-24 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-muted)]">{label}</dt>
    <dd className="text-right text-sm font-semibold text-[color:var(--app-text)]">{valueOrDash(value)}</dd>
  </div>
);

const PublicMamulPage = () => {
  const { slug } = useParams();
  const [mamul, setMamul] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMamul = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/mamuller/${slug}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Mamül bulunamadı');
        }

        setMamul(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMamul();
  }, [slug]);

  const qualityText = useMemo(() => {
    if (!mamul) return '';
    return mamul.tanitim_hikayesi || mamul.aciklama || mamul.materyal_notlari || mamul.kompozisyon_ozeti || '';
  }, [mamul]);

  return (
    <main className="min-h-screen bg-[color:var(--app-bg)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-8">
        {loading ? (
          <section className="app-panel p-6 text-sm text-[color:var(--app-text-muted)]">Mamül yükleniyor...</section>
        ) : null}

        {!loading && error ? (
          <section className="app-panel p-6">
            <h1 className="text-xl font-semibold text-[color:var(--app-text)]">Mamül bulunamadı</h1>
            <p className="mt-3 text-sm text-[color:var(--app-text-muted)]">{error}</p>
          </section>
        ) : null}

        {!loading && mamul ? (
          <div className="space-y-4 sm:space-y-6">
            <section className="app-panel p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--app-text-muted)]">
                    {valueOrDash(mamul.article_code)}
                  </div>
                  <h1 className="mt-2 text-2xl font-bold leading-tight text-[color:var(--app-text)] sm:text-4xl">
                    {valueOrDash(mamul.mamul_adi)}
                  </h1>
                </div>
                <div className="rounded-lg border border-[color:var(--app-border)] px-4 py-3 text-left sm:min-w-44 sm:text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-muted)]">Kumaş grubu</div>
                  <div className="mt-1 text-base font-bold text-[color:var(--app-text)]">{valueOrDash(mamul.mamul_turu_adi)}</div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="app-panel p-5 sm:p-6">
                <h2 className="text-base font-bold text-[color:var(--app-text)]">Teknik Kimlik</h2>
                <dl className="mt-4">
                  <InfoRow label="Article" value={mamul.article_no || mamul.article_code} />
                  <InfoRow label="Renk" value={mamul.renk} />
                  <InfoRow label="En" value={mamul.en ? `${mamul.en} cm` : ''} />
                  <InfoRow label="Gramaj" value={mamul.gramaj ? `${mamul.gramaj} gr/m2` : ''} />
                </dl>
              </div>

              <div className="app-panel p-5 sm:p-6">
                <h2 className="text-base font-bold text-[color:var(--app-text)]">Üretim Hikayesi</h2>
                {qualityText ? (
                  <p className="mt-4 text-sm leading-7 text-[color:var(--app-text-muted)]">
                    {qualityText}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="app-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-[color:var(--app-text)]">İplik Reçetesi</h2>
                <span className="text-xs font-semibold text-[color:var(--app-text-muted)]">{mamul.iplikler?.length || 0} satır</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {mamul.iplikler?.length ? mamul.iplikler.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[color:var(--app-border)] p-4">
                    <div className="text-sm font-bold text-[color:var(--app-text)]">{item.iplik_adi}</div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[color:var(--app-text-muted)]">
                      <div><span className="block font-semibold text-[color:var(--app-text)]">%{formatNumber(item.oran_yuzde)}</span> Oran</div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-[color:var(--app-border)] p-4 text-sm text-[color:var(--app-text-muted)]">
                    -
                  </div>
                )}
              </div>
            </section>

            <section className="app-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-[color:var(--app-text)]">Proses Akışı</h2>
                <span className="text-xs font-semibold text-[color:var(--app-text-muted)]">{mamul.prosesler?.length || 0} işlem</span>
              </div>
              <div className="mt-4 space-y-3">
                {mamul.prosesler?.length ? mamul.prosesler.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border border-[color:var(--app-border)] p-4">
                    <div>
                      <div className="text-sm font-bold text-[color:var(--app-text)]">{item.proses_adi}</div>
                      {item.aciklama ? <div className="mt-1 text-xs text-[color:var(--app-text-muted)]">{item.aciklama}</div> : null}
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--app-text-muted)]">{item.proses_tipi || '-'}</div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-[color:var(--app-border)] p-4 text-sm text-[color:var(--app-text-muted)]">
                    -
                  </div>
                )}
              </div>
            </section>

            {mamul.benzer_urunler?.length ? (
              <section className="app-panel p-5 sm:p-6">
                <h2 className="text-base font-bold text-[color:var(--app-text)]">Aynı Gruptan Kumaşlar</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {mamul.benzer_urunler.map((item) => (
                    <Link key={item.id} to={`/u/${item.qr_slug}`} className="rounded-lg border border-[color:var(--app-border)] p-4 no-underline">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-muted)]">{item.article_code}</div>
                      <div className="mt-2 text-sm font-bold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-1 text-xs text-[color:var(--app-text-muted)]">{item.renk || '-'}</div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default PublicMamulPage;
