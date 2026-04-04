import React, { useEffect, useMemo, useState } from 'react';
import AppNavbar from '../components/AppNavbar';
import MamulEtiketModal from '../components/MamulEtiketModal';
import { clearSession } from '../utils/auth';
import PageSearchBar from '../components/PageSearchBar';

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const MamulLabelPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecords = async (term = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mamul-labels?term=${encodeURIComponent(term)}`);
      const result = await response.json();
      setRecords(result.success ? result.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadRecords(searchTerm);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const activeCount = useMemo(
    () => records.filter((item) => item.aktif).length,
    [records]
  );
  const hasSearchContext = Boolean(normalizeSearchValue(searchTerm)) || Boolean(selectedRecord);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const printSelected = () => {
    const selectedLabels = records.filter((item) => selectedIds.includes(item.id));
    if (selectedLabels.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    const content = selectedLabels.map((item) => {
      const publicUrl = `${window.location.origin}/u/${item.qr_slug}`;
      return `
        <div style="width:90mm;height:60mm;padding:2mm;page-break-after:always;">
          <div style="width:86mm;height:56mm;border:1px solid #111;padding:2mm;display:grid;grid-template-columns:4mm 1fr 15mm;gap:1.4mm;font-family:Arial,sans-serif;">
            <div style="display:flex;align-items:center;justify-content:flex-start;padding-left:.1mm;border-right:1px solid #111;">
              <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:5.8pt;font-weight:800;letter-spacing:.06em;">KARTELIX</div>
            </div>
            <div style="min-width:0;">
              <div style="display:grid;grid-template-columns:11mm 1fr;gap:.55mm;font-size:5.55pt;line-height:1.06;">
                <div style="font-weight:700;">ARTICLE:</div><div style="min-width:0;word-break:break-word;overflow-wrap:anywhere;">${item.article_code}</div>
                <div style="font-weight:700;">MAMUL:</div><div style="min-width:0;word-break:break-word;overflow-wrap:anywhere;">${item.mamul_adi || '-'}</div>
                <div style="font-weight:700;">KOMP:</div><div style="min-width:0;word-break:normal;overflow-wrap:anywhere;line-height:1.06;font-size:5.2pt;">${item.kompozisyon_ozeti || '-'}</div>
                <div style="font-weight:700;">RENK:</div><div style="min-width:0;word-break:break-word;overflow-wrap:anywhere;">${item.renk || '-'}</div>
                <div style="font-weight:700;">EN:</div><div style="min-width:0;word-break:break-word;overflow-wrap:anywhere;">${item.en || '-'}</div>
                <div style="font-weight:700;">GR:</div><div style="min-width:0;word-break:break-word;overflow-wrap:anywhere;">${item.gramaj || '-'}</div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.8mm;margin-top:1mm;">
                <div style="height:4.6mm;border:.35mm solid #111;border-radius:.8mm;display:flex;align-items:center;justify-content:center;font-size:2.85pt;font-weight:700;">30</div>
                <div style="height:4.6mm;border:.35mm solid #111;border-radius:.8mm;display:flex;align-items:center;justify-content:center;font-size:2.85pt;font-weight:700;">X</div>
                <div style="height:4.6mm;border:.35mm solid #111;border-radius:.8mm;display:flex;align-items:center;justify-content:center;font-size:2.85pt;font-weight:700;">I</div>
                <div style="height:4.6mm;border:.35mm solid #111;border-radius:.8mm;display:flex;align-items:center;justify-content:center;font-size:2.85pt;font-weight:700;">D</div>
                <div style="height:4.6mm;border:.35mm solid #111;border-radius:.8mm;display:flex;align-items:center;justify-content:center;font-size:2.85pt;font-weight:700;">P</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;text-align:center;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(publicUrl)}" alt="QR" style="width:13.75mm;height:13.75mm;" />
              <div style="font-size:4.8pt;font-weight:800;margin-top:.7mm;transform:rotate(-7deg);align-self:center;">↗ BENI TARA</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Toplu Etiket</title></head><body>${content}<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script></body></html>`);
    printWindow.document.close();
  };

  const resolveRecordMatch = (rawValue) => {
    const term = normalizeSearchValue(rawValue);
    if (!term) return null;

    return records.find((item) =>
      [item.article_no, item.article_code, item.qr_slug].some((field) => normalizeSearchValue(field) === term)
    ) || records.find((item) =>
      [item.mamul_adi, item.article_no, item.article_code, item.renk, item.qr_slug]
        .some((field) => normalizeSearchValue(field).includes(term))
    ) || null;
  };

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          eyebrow="Kartelix / Etiket"
          title="Mamül etiket basım merkezi"
          description="Kayıtlı mamül kartlarından etiketi seçin, QR önizlemesini görün ve müşteri sayfasına giden baskıyı alın."
          links={[
            { to: '/mamul', label: 'Mamül merkezi' },
            { to: '/mamul/create', label: 'Mamül ekle' }
          ]}
          onLogout={handleLogout}
        />

        <PageSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Article no, article code, mamül adı veya renk ara"
          onSearch={(term) => {
            const match = resolveRecordMatch(term);
            if (match) {
              setSelectedRecord(match);
            }
            loadRecords(term);
          }}
          onQrDetected={(detectedValue) => {
            const match = resolveRecordMatch(detectedValue);
            if (match) {
              setSelectedRecord(match);
            }
          }}
          showResults={Boolean(normalizeSearchValue(searchTerm))}
          results={records.slice(0, 6)}
          onResultSelect={(item) => {
            setSearchTerm(item.article_code || item.article_no || item.mamul_adi || '');
            setSelectedRecord(item);
          }}
          getResultPrimary={(item) => item.mamul_adi}
          getResultSecondary={(item) => `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''}`}
          emptyResultsText="Bu aramaya uygun etiket bulunamadı."
        />

        {hasSearchContext ? (
          <div className="grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
          <section className="app-panel p-6">
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Etiket filtresi</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="app-stat">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Toplam etiket</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{records.length}</div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Public aktif</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-700">{activeCount}</div>
              </div>
            </div>

            <div className="app-soft-panel mt-6 p-4 text-sm text-[color:var(--app-text-muted)]">
              Buradaki tüm etiketler doğrudan mamül kartlarından gelir. Ayarlarda tanımlanan tür, renk, iplik ve proses yapısı etikete dolaylı olarak yansır.
            </div>
          </section>

            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Kayıtlı mamül etiketleri</h2>
                <div className="flex items-center gap-3">
                  {selectedIds.length > 0 ? (
                    <button type="button" onClick={printSelected} className="app-btn-primary">
                      Toplu yazdır ({selectedIds.length})
                    </button>
                  ) : null}
                  {loading ? <span className="text-sm text-[color:var(--app-text-muted)]">Yükleniyor...</span> : null}
                </div>
              </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {!loading && records.length === 0 ? (
                <div className="app-soft-panel px-4 py-8 text-sm text-[color:var(--app-text-muted)]">
                  Filtreye uygun etiket bulunamadı.
                </div>
              ) : null}

                {records.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 p-5 text-left transition hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                        Seç
                      </label>
                      <button type="button" onClick={() => setSelectedRecord(item)} className="app-btn-secondary">Aç</button>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.mamul_turu_adi}</div>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.mamul_adi}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.aktif ? 'Public aktif' : 'Pasif'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-600">
                    <div>{item.article_code} / {item.article_no}</div>
                    <div>{item.renk || 'Renk tanımsız'} {item.renk_kodu ? `(${item.renk_kodu})` : ''}</div>
                    <div>{item.kompozisyon_ozeti || 'Kompozisyon girilmedi'}</div>
                  </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">1 kg satış: {Number(item.bir_kg_satis_fiyati || 0).toFixed(2)}</span>
                      <span className="font-medium text-emerald-700">Etiketi aç</span>
                    </div>
                  </div>
                ))}
              </div>
          </section>
          </div>
        ) : null}
      </div>

      <MamulEtiketModal mamul={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
};

export default MamulLabelPage;
