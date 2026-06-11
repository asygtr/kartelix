import React, { useEffect, useState } from 'react';
import MamulEtiketModal from '../components/MamulEtiketModal';
import PageSearchBar from '../components/PageSearchBar';
import { mergeLabelTemplate, printLabels } from '../utils/labelTemplate';

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const MamulLabelPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Server'dan şablon listesini yükle
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [listRes, activeRes] = await Promise.all([
          fetch('/api/admin/label-templates').then(r => r.json()),
          fetch('/api/admin/label-templates/active').then(r => r.json()),
        ]);
        const list = listRes.success ? (listRes.data || []) : [];
        setTemplates(list);

        if (activeRes.success && activeRes.data) {
          const activeId = activeRes.data.id || activeRes.data.template_id || '';
          setSelectedTemplateId(activeId);
          setSelectedTemplate(mergeLabelTemplate(activeRes.data));
        } else if (list.length > 0) {
          const firstId = list[0].template_id || list[0].id;
          setSelectedTemplateId(firstId);
          // detayını çek
          const detailRes = await fetch(`/api/admin/label-templates/${firstId}`).then(r => r.json());
          if (detailRes.success) setSelectedTemplate(mergeLabelTemplate(detailRes.data));
        }
      } catch {}
    };
    loadTemplates();
  }, []);

  // Şablon seçimi değişince detayını çek
  const handleTemplateChange = async (id) => {
    setSelectedTemplateId(id);
    try {
      const res = await fetch(`/api/admin/label-templates/${id}`).then(r => r.json());
      if (res.success) setSelectedTemplate(mergeLabelTemplate(res.data));
    } catch {}
  };

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
    if (selectedLabels.length === 0 || !selectedTemplate) return;
    printLabels(selectedLabels, selectedTemplate, 'tr');
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[color:var(--app-text)]">Kayıtlı mamül etiketleri</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select className="app-select w-full sm:w-auto" value={selectedTemplateId} onChange={(event) => handleTemplateChange(event.target.value)}>
                  {templates.map((item) => (
                    <option key={item.template_id || item.id} value={item.template_id || item.id}>{item.name}</option>
                  ))}
                </select>
                {selectedIds.length > 0 ? (
                  <button type="button" onClick={printSelected} className="app-btn-primary">
                    Toplu yazdir ({selectedIds.length})
                  </button>
                ) : null}
                {loading ? <span className="text-xs text-[color:var(--app-text-muted)]">Yükleniyor...</span> : null}
              </div>
            </div>

            {!loading && records.length === 0 ? (
              <div className="mt-4 app-soft-panel px-3 py-5 text-xs text-[color:var(--app-text-muted)]">
                Filtreye uygun etiket bulunamadı.
              </div>
            ) : null}

            {records.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="hidden md:grid grid-cols-[56px_110px_minmax(200px,1.4fr)_120px_100px_90px_80px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <div>Seç</div>
                  <div>Article</div>
                  <div>Mamül</div>
                  <div>Tür</div>
                  <div>Renk</div>
                  <div>En</div>
                  <div>Gramaj</div>
                </div>

                <div className="max-h-[58vh] overflow-y-auto md:max-h-[62vh]">
                  {records.map((item) => (
                    <div
                      key={item.id}
                      className="hidden md:grid cursor-pointer grid-cols-[56px_110px_minmax(200px,1.4fr)_120px_100px_90px_80px] gap-2 border-b border-slate-100 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-emerald-50"
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
                  {records.map((item) => (
                    <div
                      key={`mobile-${item.id}`}
                      className="md:hidden border-b border-slate-100 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedRecord(item)}>
                          <div className="truncate text-sm font-semibold text-slate-900">{item.mamul_adi}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{item.article_code} / {item.article_no}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                            <span>{item.mamul_turu_adi || '-'}</span>
                            <span>{item.renk || '-'}</span>
                            <span>{item.en || '-'} EN</span>
                            <span>{item.gramaj || '-'} GR</span>
                          </div>
                        </div>
                        <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {records.length === 0 ? (
                    <div className="app-soft-panel m-3 px-4 py-5 text-xs text-[color:var(--app-text-muted)]">Henüz etiket bulunamadı.</div>
                  ) : null}
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
