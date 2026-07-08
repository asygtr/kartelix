import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LabelPreviewCard from './LabelPreviewCard';
import { defaultLabelTemplate, mergeLabelTemplate, printLabels } from '../utils/labelTemplate';
import { authHeaders } from '../utils/auth';
import { bottomSheetVariants, sheetBackdropVariants, sheetTransition, defaultEase } from '../utils/motion';
import { useHaptic } from '../utils/useHaptic';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
  </svg>
);

const PrintIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path d="M7 3h10v4H7V3Zm10 14v4H7v-4h10Zm2-8a2 2 0 0 1 2 2v5h-3v-2H6v2H3v-5a2 2 0 0 1 2-2h14Z" fill="currentColor" />
  </svg>
);

const fetchTemplateById = async (id) => {
  const res = await fetch(`/api/admin/label-templates/${id}`, { headers: authHeaders() }).then(r => r.json()).catch(() => ({ success: false }));
  return res.success ? mergeLabelTemplate(res.data) : null;
};

const fetchActiveTemplate = async () => {
  const res = await fetch('/api/admin/label-templates/active', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ success: false }));
  return res.success && res.data ? mergeLabelTemplate(res.data) : mergeLabelTemplate(defaultLabelTemplate);
};

const MamulEtiketModal = ({ mamul, templateId, onClose }) => {
  const [template, setTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(templateId || '');
  const haptic = useHaptic();

  useEffect(() => {
    fetch('/api/admin/label-templates', { headers: authHeaders() })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const list = res.data || [];
          setTemplates(list);
          if (!activeTemplateId && list.length > 0) {
            const firstId = list[0].template_id || list[0].id;
            setActiveTemplateId(firstId);
          }
        }
      })
      .catch(() => {});
  }, [activeTemplateId]);

  useEffect(() => {
    const loadTemplate = async () => {
      const tid = activeTemplateId || templateId;
      if (tid && tid !== 'default') {
        const loaded = await fetchTemplateById(tid);
        if (loaded) { setTemplate(loaded); return; }
      }
      const loaded = await fetchActiveTemplate();
      setTemplate(loaded);
    };
    loadTemplate();
  }, [activeTemplateId, templateId]);

  const handleTemplateChange = async (id) => {
    setActiveTemplateId(id);
    const loaded = await fetchTemplateById(id);
    if (loaded) setTemplate(loaded);
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!mamul) return null;
  const articleNo = mamul.article_no || mamul.article_code || '-';

  return createPortal(
    <AnimatePresence>
    <motion.div
      key="etiket-backdrop"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.52)', backdropFilter: 'blur(12px)' }}
      variants={sheetBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.18, ease: defaultEase }}
      onClick={(e) => { if (e.target === e.currentTarget) { haptic.light(); onClose(); } }}
    >
      <motion.div
        key="etiket-panel"
        className="w-full max-w-2xl mx-auto rounded-t-[1.45rem] sm:rounded-[1.45rem] bg-white shadow-2xl"
        variants={bottomSheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={sheetTransition}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.18 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 600) { haptic.light(); onClose(); } }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div style={{ width: '2.2rem', height: '0.26rem', borderRadius: 999, background: 'rgba(0,0,0,0.18)' }} />
        </div>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
          <div>
            <h2 className="text-base sm:text-xl font-semibold text-slate-900">ARTICLE NO {articleNo}</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{mamul.mamul_adi || '-'}</p>
          </div>
          <button
            type="button"
            onClick={() => { haptic.light(); onClose(); }}
            className="rounded-full bg-slate-100 p-1.5 sm:p-2 text-slate-700 hover:bg-slate-200"
            aria-label="Kapat"
            title="Kapat"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="min-w-0 overflow-x-auto">
            <LabelPreviewCard record={mamul} template={template} lang="en" />
          </div>

          <div className="space-y-4">
            <div className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800 md:hidden">
              Mobil görünümdesiniz. Yazdırma işlemi hatalı olabilir.
            </div>
            {templates.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="shrink-0">Şablon</span>
                <select
                  className="app-select w-40 sm:w-44"
                  value={activeTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.template_id || t.id} value={t.template_id || t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => { haptic.success(); printLabels([mamul], template, 'en'); }}
                className="app-btn-primary inline-flex items-center justify-center gap-2"
              >
                <PrintIcon />
                <span>Yazdır</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default MamulEtiketModal;
