import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LabelPreviewCard from './LabelPreviewCard';
import { defaultLabelTemplate, mergeLabelTemplate, printLabels } from '../utils/labelTemplate';
import { authHeaders } from '../utils/auth';

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

  const publicUrl = `${window.location.origin}/u/${mamul.qr_slug}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto p-2 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl mx-auto my-auto rounded-[1rem] sm:rounded-[1.5rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
          <div>
            <p className="text-[0.65rem] sm:text-xs uppercase tracking-[0.24em] text-emerald-700">Kartelix / Etiket</p>
            <h2 className="mt-1 text-base sm:text-xl font-semibold text-slate-900">{mamul.article_code}</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{mamul.mamul_adi || '-'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            {templates.length > 0 && (
              <select
                className="app-select w-full"
                value={activeTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.template_id || t.id} value={t.template_id || t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => printLabels([mamul], template, 'en')} className="app-btn-primary inline-flex items-center justify-center gap-2">
                <PrintIcon />
                <span>Print (EN)</span>
              </button>
            </div>

            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="app-btn-secondary block text-center"
            >
              Müşteri görünümü
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MamulEtiketModal;
