import React, { useEffect, useState } from 'react';
import LabelPreviewCard from './LabelPreviewCard';
import { loadLabelTemplate, printLabels } from '../utils/labelTemplate';

const MamulEtiketModal = ({ mamul, templateId, onClose }) => {
  const [template, setTemplate] = useState(() => loadLabelTemplate(templateId));

  useEffect(() => {
    setTemplate(loadLabelTemplate(templateId));
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
      <div className="w-full max-w-4xl rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Kartelix / Etiket</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{mamul.article_code}</h2>
            <p className="mt-1 text-sm text-slate-500">{mamul.mamul_adi || '-'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
          >
            Kapat
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div>
            <LabelPreviewCard record={mamul} template={template} lang="tr" />
          </div>

          <div className="space-y-4">
            <div className="app-soft-panel p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Canlı veri</div>
              <div className="mt-3 grid gap-3 text-sm text-[color:var(--app-text-muted)]">
                <div><strong className="text-slate-900">Article:</strong> {mamul.article_code || '-'}</div>
                <div><strong className="text-slate-900">Mamül:</strong> {mamul.mamul_adi || '-'}</div>
                <div><strong className="text-slate-900">Renk:</strong> {mamul.renk || '-'}</div>
                <div><strong className="text-slate-900">Kompozisyon:</strong> {mamul.kompozisyon_ozeti || '-'}</div>
              </div>
            </div>

            <div className="app-soft-panel p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Tasarım kaynağı</div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--app-text-muted)]">
                Bu önizleme ve yazdırma akışı Ayarlar içindeki etiket tasarımcısında kaydettiğiniz şablonu kullanır.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="app-btn-secondary text-center"
              >
                Public sayfayi ac
              </a>
              <button type="button" onClick={() => printLabels([mamul], template, 'tr')} className="app-btn-primary">
                Yazdir (TR)
              </button>
              <button type="button" onClick={() => printLabels([mamul], template, 'en')} className="app-btn-secondary">
                Print (EN)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MamulEtiketModal;
