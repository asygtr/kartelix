import React, { useEffect, useState } from 'react';
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
          title="Etiket"
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

            {!loading && records.length === 0 ? (
              <div className="mt-5 app-soft-panel px-4 py-8 text-sm text-[color:var(--app-text-muted)]">
                Filtreye uygun etiket bulunamadı.
              </div>
            ) : null}

            {records.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[56px_120px_minmax(220px,1.4fr)_140px_120px_120px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <div>Seç</div>
                  <div>Article</div>
                  <div>Mamül</div>
                  <div>Tür</div>
                  <div>Renk</div>
                  <div>En</div>
                  <div>Gramaj</div>
                </div>

                <div className="max-h-[68vh] overflow-y-auto">
                  {records.map((item) => (
                    <div
                      key={item.id}
                      className="grid cursor-pointer grid-cols-[56px_120px_minmax(220px,1.4fr)_140px_120px_120px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:bg-emerald-50"
                      onClick={() => setSelectedRecord(item)}
                    >
                      <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </div>
                      <div className="flex items-center font-medium text-slate-900">{item.article_code}</div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">{item.mamul_adi}</div>
                        <div className="truncate text-xs text-slate-500">{item.kompozisyon_ozeti || '-'}</div>
                      </div>
                      <div className="flex items-center">{item.mamul_turu_adi || '-'}</div>
                      <div className="flex items-center">{item.renk || '-'}</div>
                      <div className="flex items-center">{item.en || '-'}</div>
                      <div className="flex items-center">{item.gramaj || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <MamulEtiketModal mamul={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
};

export default MamulLabelPage;
