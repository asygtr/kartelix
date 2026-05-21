import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
          throw new Error(result.error || 'Mamul bulunamadi');
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

  const materialHighlights = mamul
    ? [
        mamul.materyal_notlari ? { label: 'Yüzey', value: mamul.materyal_notlari } : null,
        mamul.koleksiyon_adi ? { label: 'Koleksiyon', value: mamul.koleksiyon_adi } : null
      ].filter(Boolean)
    : [];

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        {loading ? <div className="app-panel p-8">Mamül yükleniyor...</div> : null}

        {!loading && error ? (
          <div className="app-panel p-8">
            <h2 className="text-2xl font-semibold text-[color:var(--app-text)]">Mamül bulunamadı</h2>
            <p className="mt-3 text-[color:var(--app-text-muted)]">{error}</p>
          </div>
        ) : null}

        {!loading && mamul ? (
          <>
            <section className="app-hero">
              <div className="flex flex-wrap gap-3">
                <span className="app-chip">{mamul.vurgu_etiketi || mamul.mamul_turu_adi}</span>
                <span className="app-chip">{mamul.article_code}</span>
                {mamul.koleksiyon_adi ? <span className="app-chip">{mamul.koleksiyon_adi}</span> : null}
              </div>
              <h2 className="mt-6 text-5xl font-extrabold leading-tight">
                {mamul.tanitim_basligi || mamul.mamul_adi}
              </h2>
              {(mamul.tanitim_hikayesi || mamul.aciklama) ? (
                <p className="mt-5 max-w-3xl text-base leading-8 text-[color:var(--app-text-muted)]">
                  {mamul.tanitim_hikayesi || mamul.aciklama}
                </p>
              ) : null}
              <div className="public-hero-notes">
                <div className="public-hero-note">
                  <span className="public-hero-note-label">Mamül</span>
                  <strong>{mamul.mamul_adi}</strong>
                </div>
                <div className="public-hero-note">
                  <span className="public-hero-note-label">Renk</span>
                  <strong>{mamul.renk || '-'}</strong>
                </div>
                <div className="public-hero-note">
                  <span className="public-hero-note-label">Ölçü</span>
                  <strong>{mamul.en || '-'} EN / {mamul.gramaj || '-'} GR</strong>
                </div>
              </div>
            </section>

            <section className="public-product-grid">
              <div className="public-visual app-panel" style={mamul.gorsel_url ? { backgroundImage: `url('${mamul.gorsel_url}')` } : undefined}>
                {!mamul.gorsel_url ? null : null}
              </div>

              <div className="space-y-4">
                <div className="app-panel p-6">
                  <div className="app-chip">Teknik Özet</div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="app-stat">
                      <div className="app-stat-label">Article No</div>
                      <div className="mt-2 text-xl font-bold">{mamul.article_no}</div>
                    </div>
                    <div className="app-stat">
                      <div className="app-stat-label">Renk</div>
                      <div className="mt-2 text-xl font-bold">{mamul.renk || '-'}</div>
                    </div>
                    <div className="app-stat">
                      <div className="app-stat-label">Kompozisyon</div>
                      <div className="mt-2 text-base font-semibold">{mamul.kompozisyon_ozeti || '-'}</div>
                    </div>
                    <div className="app-stat">
                      <div className="app-stat-label">Ölçü</div>
                      <div className="mt-2 text-base font-semibold">{mamul.en || '-'} EN / {mamul.gramaj || '-'} GR</div>
                    </div>
                  </div>
                </div>

                {materialHighlights.length ? (
                  <div className="app-panel p-6">
                    <div className="mt-1 grid gap-3">
                      {materialHighlights.map((item) => (
                        <div key={item.label} className="public-story-card">
                          <div className="public-story-card-label">{item.label}</div>
                          <div className="public-story-card-value">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {mamul.benzer_urunler?.length ? (
                  <div className="app-panel p-6">
                    <div className="app-chip">Benzer Ürünler</div>
                    <div className="mt-4 grid gap-3">
                      {mamul.benzer_urunler.map((item) => (
                        <Link key={item.id} to={`/u/${item.qr_slug}`} className="public-related-card no-underline">
                          <div className="public-related-card-badge">{item.article_code}</div>
                          <div className="mt-3 font-semibold text-[color:var(--app-text)]">{item.tanitim_basligi || item.mamul_adi}</div>
                          <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{item.renk ? item.renk : 'Renk bekleniyor'}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PublicMamulPage;
