import React, { useEffect, useState } from 'react';
import LabelPreviewCard from './LabelPreviewCard';
import { defaultLabelTemplate, mergeLabelTemplate, printLabels } from '../utils/labelTemplate';

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

const fetchActiveTemplate = async () => {
  try {
    const response = await fetch('/api/admin/label-templates/active');
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return mergeLabelTemplate(result.data);
      }
    }
  } catch {}
  return mergeLabelTemplate(defaultLabelTemplate);
};

const fetchTemplateById = async (templateId) => {
  try {
    const response = await fetch(`/api/admin/label-templates/${templateId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return mergeLabelTemplate(result.data);
      }
    }
  } catch {}
  return mergeLabelTemplate(defaultLabelTemplate);
};

const MamulEtiketModal = ({ mamul, templateId, onClose }) => {
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    const loadTemplate = async () => {
      const loadedTemplate = templateId ? await fetchTemplateById(templateId) : await fetchActiveTemplate();
      setTemplate(loadedTemplate);
    };
    loadTemplate();
  }, [templateId]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl mx-auto rounded-[1.25rem] sm:rounded-[2rem] bg-white shadow-2xl">
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

        <div className="grid gap-4 sm:gap-6 p-4 sm:p-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div>
            <LabelPreviewCard record={mamul} template={template} lang="tr" />
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => printLabels([mamul], template, 'tr')} className="app-btn-primary inline-flex items-center justify-center gap-2">
                <PrintIcon />
                <span>Yazdır (TR)</span>
              </button>
              <button type="button" onClick={() => printLabels([mamul], template, 'en')} className="app-btn-secondary inline-flex items-center justify-center gap-2">
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
    </div>
  );
};

export default MamulEtiketModal;
