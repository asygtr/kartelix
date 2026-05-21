import React, { useCallback, useEffect, useState } from 'react';
import AppNavbar from '../components/AppNavbar';
import PageSearchBar from '../components/PageSearchBar';
import { clearSession } from '../utils/auth';

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const emptyForm = {
  tanitimBasligi: '',
  tanitimHikayesi: '',
  materyalNotlari: '',
  gorselUrl: '',
  vurguEtiketi: '',
  aciklama: ''
};

const MamulShowcasePage = () => {
  const [mamuller, setMamuller] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadMamuller = useCallback(async () => {
    const response = await fetch('/api/admin/mamuller');
    const result = await response.json();
    const data = result.success ? result.data : [];
    setMamuller(data);
    if (!selectedId && data[0]) {
      setSelectedId(String(data[0].id));
    }
  }, [selectedId]);

  useEffect(() => {
    loadMamuller();
  }, [loadMamuller]);

  useEffect(() => {
    const selected = mamuller.find((item) => String(item.id) === String(selectedId));
    if (selected) {
      setForm({
        tanitimBasligi: selected.tanitim_basligi || '',
        tanitimHikayesi: selected.tanitim_hikayesi || '',
        materyalNotlari: selected.materyal_notlari || '',
        gorselUrl: selected.gorsel_url || '',
        vurguEtiketi: selected.vurgu_etiketi || '',
        aciklama: selected.aciklama || ''
      });
    }
  }, [mamuller, selectedId]);

  const saveShowcase = async (event) => {
    event.preventDefault();
    if (!selectedId) return;

    const response = await fetch(`/api/admin/mamuller/${selectedId}/showcase`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.error || 'Kayit basarisiz');
      return;
    }

    setMessage('Urun tanitimi kaydedildi.');
    loadMamuller();
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  const selectedMamul = mamuller.find((item) => String(item.id) === String(selectedId));
  const normalizedSearch = normalizeSearchValue(searchTerm);
  const filteredMamuller = normalizedSearch
    ? mamuller.filter((item) =>
        [item.mamul_adi, item.article_code, item.article_no, item.renk, item.qr_slug]
          .filter(Boolean)
          .some((field) => normalizeSearchValue(field).includes(normalizedSearch))
      )
    : mamuller;

  const resolveMamulMatch = (rawValue) => {
    const term = normalizeSearchValue(rawValue);
    if (!term) return null;

    return mamuller.find((item) =>
      [item.article_no, item.article_code, item.qr_slug].some((field) => normalizeSearchValue(field) === term)
    ) || mamuller.find((item) =>
      [item.mamul_adi, item.article_no, item.article_code, item.renk, item.qr_slug]
        .some((field) => normalizeSearchValue(field).includes(term))
    ) || null;
  };

  const handleQrDetected = async (detectedValue) => {
    const localMatch = resolveMamulMatch(detectedValue);

    if (localMatch) {
      setMessage('');
      setSelectedId(String(localMatch.id));
      return;
    }

    const response = await fetch(`/api/admin/mamul-lookup?code=${encodeURIComponent(detectedValue)}`);
    const result = await response.json();

    if (response.ok && result.success) {
      setSelectedId(String(result.data.id));
    } else {
      setMessage(result.error || 'Mamül bulunamadı.');
    }
  };

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          title="Ürün Tanıtımı"
          onLogout={handleLogout}
        />

        <PageSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Article no, article code, mamül adı veya renk ile ara"
          onSearch={(term) => {
            const match = resolveMamulMatch(term);
            if (match) {
              setMessage('');
              setSelectedId(String(match.id));
            } else if (normalizeSearchValue(term)) {
              setMessage('Aramayla eşleşen mamül bulunamadı.');
            }
          }}
          onQrDetected={handleQrDetected}
          showResults={Boolean(normalizedSearch)}
          results={filteredMamuller.slice(0, 6)}
          onResultSelect={(item) => {
            setSearchTerm(item.article_code || item.article_no || item.mamul_adi || '');
            setMessage('');
            setSelectedId(String(item.id));
          }}
          getResultPrimary={(item) => item.mamul_adi}
          getResultSecondary={(item) => `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''}`}
          emptyResultsText="Bu aramaya uygun mamül bulunamadı."
        />

        {message ? <div className="app-panel p-4 text-sm">{message}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
          <section className="app-panel p-6">
            <div className="app-chip">Kayıtlı Mamüller</div>
            <div className="mt-5 space-y-3">
              {filteredMamuller.length === 0 ? (
                <div className="app-soft-panel p-4 text-sm text-[color:var(--app-text-muted)]">
                  Aramaya uygun mamül bulunamadı.
                </div>
              ) : null}
              {filteredMamuller.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(String(item.id))}
                  className="w-full rounded-3xl border p-4 text-left transition"
                  style={{
                    borderColor: String(selectedId) === String(item.id) ? 'var(--app-primary)' : 'var(--app-border)',
                    background: String(selectedId) === String(item.id) ? 'color-mix(in srgb, var(--app-primary) 10%, white 90%)' : 'transparent'
                  }}
                >
                  <div className="font-semibold">{item.mamul_adi}</div>
                  <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{item.article_code}</div>
                </button>
              ))}
            </div>
          </section>

          <form onSubmit={saveShowcase} className="space-y-6">
            <section className="app-panel p-6">
              <div className="app-chip">Vitrin Düzenleyici</div>
              <div className="mt-5 grid gap-4">
                <input className="app-input" placeholder="Tanıtım başlığı" value={form.tanitimBasligi} onChange={(e) => setForm((prev) => ({ ...prev, tanitimBasligi: e.target.value }))} />
                <input className="app-input" placeholder="Vurgu etiketi" value={form.vurguEtiketi} onChange={(e) => setForm((prev) => ({ ...prev, vurguEtiketi: e.target.value }))} />
                <input className="app-input" placeholder="Görsel URL" value={form.gorselUrl} onChange={(e) => setForm((prev) => ({ ...prev, gorselUrl: e.target.value }))} />
                <textarea className="app-textarea min-h-36" placeholder="Ürün hikâyesi" value={form.tanitimHikayesi} onChange={(e) => setForm((prev) => ({ ...prev, tanitimHikayesi: e.target.value }))} />
                <textarea className="app-textarea min-h-28" placeholder="Materyal ve yüzey dili notları" value={form.materyalNotlari} onChange={(e) => setForm((prev) => ({ ...prev, materyalNotlari: e.target.value }))} />
                <textarea className="app-textarea min-h-24" placeholder="Kısa tanıtım açıklaması" value={form.aciklama} onChange={(e) => setForm((prev) => ({ ...prev, aciklama: e.target.value }))} />
              </div>
              <button type="submit" className="app-btn-primary mt-6">Ürün tanıtımını kaydet</button>
            </section>

            <section className="app-hero">
              <div className="app-chip">{form.vurguEtiketi || selectedMamul?.mamul_turu_adi || 'Önizleme'}</div>
              <h2 className="mt-6 text-4xl font-extrabold">{form.tanitimBasligi || selectedMamul?.mamul_adi || 'Mamül seçin'}</h2>
              <p className="mt-4 max-w-3xl text-[color:var(--app-text-muted)] leading-8">
                {form.tanitimHikayesi || selectedMamul?.aciklama || ''}
              </p>
              <div className="mt-6 text-sm text-[color:var(--app-text-muted)]">
                Public link: {selectedMamul ? `/u/${selectedMamul.qr_slug}` : '-'}
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MamulShowcasePage;
