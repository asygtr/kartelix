import React, { useEffect, useState } from 'react';
import MamulEtiketModal from '../components/MamulEtiketModal';
import PageSearchBar from '../components/PageSearchBar';
import { getActiveLabelTemplateId, listLabelTemplates, loadLabelTemplate, printLabels } from '../utils/labelTemplate';

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const MamulLabelPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates] = useState(() => listLabelTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => getActiveLabelTemplateId());

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

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const printSelected = () => {
    const selectedLabels = records.filter((item) => selectedIds.includes(item.id));
    if (selectedLabels.length === 0) return;
    printLabels(selectedLabels, loadLabelTemplate(selectedTemplateId), 'tr');
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
    <>
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
          <section className="app-panel p-6 app-reveal-up app-reveal-delay-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Kayıtlı mamül etiketleri</h2>
              <div className="flex items-center gap-3">
                <select className="app-select max-w-[220px]" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {selectedIds.length > 0 ? (
                  <button type="button" onClick={printSelected} className="app-btn-primary">
                    Toplu yazdir ({selectedIds.length})
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
      <MamulEtiketModal mamul={selectedRecord} templateId={selectedTemplateId} onClose={() => setSelectedRecord(null)} />
    </>
  );
};

export default MamulLabelPage;
