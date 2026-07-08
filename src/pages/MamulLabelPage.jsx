import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MamulEtiketModal from '../components/MamulEtiketModal';
import PageSearchBar from '../components/PageSearchBar';
import { defaultLabelTemplate, formatArticleLabel, mergeLabelTemplate, printLabels } from '../utils/labelTemplate';
import { authHeaders } from '../utils/auth';
import { chromeSpring, defaultEase } from '../utils/motion';

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const MamulLabelPage = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRecordsMap, setSelectedRecordsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [trayImpact, setTrayImpact] = useState(0);
  const printTrayRef = useRef(null);

  // Load mamul from URL parameter if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mamulId = params.get('mamulId');
    if (mamulId) {
      const fetchMamul = async () => {
        try {
          const response = await fetch(`/api/mamul/${mamulId}`);
          const result = await response.json();
          if (result.success && result.data) {
            setSelectedRecord(result.data);
            setSelectedIds([result.data.id]);
            setSelectedRecordsMap({ [result.data.id]: result.data });
            setSearchTerm('');
          }
        } catch (error) {
          console.error('Failed to fetch mamul for pre-selection:', error);
        }
      };
      fetchMamul();
    }
  }, [location.search]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const h = { headers: authHeaders() };
        const [listRes, activeRes] = await Promise.all([
          fetch('/api/admin/label-templates', h).then(r => r.json()),
          fetch('/api/admin/label-templates/active', h).then(r => r.json()),
        ]);
        const list = listRes.success ? (listRes.data || []) : [];
        setTemplates(list);

        if (activeRes.success && activeRes.data) {
          const activeId = activeRes.data.id || activeRes.data.template_id || '';
          const merged = mergeLabelTemplate(activeRes.data);
          const realId = list.some(t => (t.template_id || t.id) === activeId) ? activeId : (list[0]?.template_id || list[0]?.id || '');
          setSelectedTemplateId(realId);
          if (realId && realId !== activeId) {
            const detailRes = await fetch(`/api/admin/label-templates/${realId}`, h).then(r => r.json());
            if (detailRes.success) setSelectedTemplate(mergeLabelTemplate(detailRes.data));
          } else {
            setSelectedTemplate(merged);
          }
        } else if (list.length > 0) {
          const firstId = list[0].template_id || list[0].id;
          setSelectedTemplateId(firstId);
          const detailRes = await fetch(`/api/admin/label-templates/${firstId}`, h).then(r => r.json());
          if (detailRes.success) setSelectedTemplate(mergeLabelTemplate(detailRes.data));
        }
      } catch {}
    };
    loadTemplates();
  }, []);

  const handleTemplateChange = async (id) => {
    setSelectedTemplateId(id);
    try {
      const res = await fetch(`/api/admin/label-templates/${id}`, { headers: authHeaders() }).then(r => r.json());
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

  useEffect(() => { loadRecords(); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => { loadRecords(searchTerm); }, 250);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const toggleSelected = (id, item) => {
    const willSelect = !selectedIds.includes(id);
    if (willSelect) setTrayImpact((value) => value + 1);

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedRecordsMap((prev) => {
      if (prev[id]) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: item };
    });
  };

  const printSelected = () => {
    const selectedLabels = selectedIds.map((id) => selectedRecordsMap[id]).filter(Boolean);
    if (selectedLabels.length === 0) return;
    printLabels(selectedLabels, selectedTemplate || mergeLabelTemplate(defaultLabelTemplate), 'en');
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
        className="app-searchbar-floating app-page-searchbar"
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Article no, article code, mamül adı veya renk ara"
        onSearch={(term) => {
          const match = resolveRecordMatch(term);
          if (match) {
            setSelectedRecord(match);
            setSearchTerm('');
          }
          loadRecords(term);
        }}
        onQrDetected={(detectedValue) => {
          const match = resolveRecordMatch(detectedValue);
          if (match) {
            setSelectedRecord(match);
            setSearchTerm('');
          }
        }}
        showResults={Boolean(normalizeSearchValue(searchTerm)) && !selectedRecord}
        results={records.slice(0, 6)}
        onResultSelect={(item) => {
          setSearchTerm('');
          setSelectedRecord(item);
        }}
        getResultPrimary={(item) => item.mamul_adi}
        getResultSecondary={(item) => `${formatArticleLabel(item.article_code, item.article_no)}${item.renk ? ` / ${item.renk}` : ''}`}
        emptyResultsText="Bu aramaya uygun etiket bulunamadı."
      />

      <section className="app-panel p-6 app-reveal-up app-reveal-delay-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[color:var(--app-text)]">Kayıtlı mamül etiketleri</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select className="app-select w-full sm:w-auto" value={selectedTemplateId} onChange={(event) => handleTemplateChange(event.target.value)}>
              {templates.map((item) => (
                <option key={item.template_id || item.id} value={item.template_id || item.id}>{item.name}</option>
              ))}
            </select>
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
                  data-label-row="true"
                  className={`hidden md:grid cursor-pointer grid-cols-[56px_110px_minmax(200px,1.4fr)_120px_100px_90px_80px] gap-2 border-b border-slate-100 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-emerald-50 ${selectedIds.includes(item.id) ? 'is-selected' : ''}`}
                  onClick={() => setSelectedRecord(item)}
                >
                  <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id, item)}
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
                  data-label-row="true"
                  className={`md:hidden border-b border-slate-100 px-3 py-3 ${selectedIds.includes(item.id) ? 'is-selected' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedRecord(item)}>
                      <div className="truncate text-sm font-semibold text-slate-900">{item.mamul_adi}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{formatArticleLabel(item.article_code, item.article_no)}</div>
                      <div className="app-label-mobile-meta mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
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
                        onChange={() => toggleSelected(item.id, item)}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {selectedIds.length > 0 ? (
          <motion.div
            ref={printTrayRef}
            className="app-label-print-tray"
            initial={{ opacity: 0, y: 32, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.94 }}
            transition={chromeSpring}
          >
            <motion.button
              type="button"
              onClick={printSelected}
              className="app-label-print-button"
              layout
              whileTap={{ scale: 0.96 }}
              animate={{
                scale: trayImpact ? [1, 1.09, 0.98, 1.03, 1] : 1,
                y: trayImpact ? [0, -8, 2, -3, 0] : 0,
              }}
              transition={{ duration: 0.42, ease: defaultEase }}
            >
              Yazdır ({selectedIds.length})
            </motion.button>
            <motion.span
              key={trayImpact}
              className="app-label-print-ripple"
              initial={{ opacity: 0, scale: 0.58 }}
              animate={{ opacity: trayImpact ? [0, 0.46, 0] : 0, scale: trayImpact ? [0.58, 1.2, 1.62] : 0.58 }}
              transition={{ duration: 0.52, ease: defaultEase }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MamulEtiketModal mamul={selectedRecord} templateId={selectedTemplateId} onClose={() => setSelectedRecord(null)} />
    </>
  );
};

export default MamulLabelPage;
