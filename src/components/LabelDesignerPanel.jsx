import React, { useState } from 'react';
import LabelPreviewCard from './LabelPreviewCard';
import {
  createLabelTemplate,
  defaultLabelTemplate,
  deleteLabelTemplate,
  getActiveLabelTemplateId,
  labelFieldCatalog,
  listLabelTemplates,
  loadLabelTemplate,
  mergeLabelTemplate,
  printLabels,
  renameLabelTemplate,
  saveLabelTemplate
} from '../utils/labelTemplate';

const previewRecord = {
  id: 'preview-record',
  article_code: '10-10124',
  mamul_adi: 'Soft Suprem Indigo',
  kompozisyon_ozeti: '%95 Organik Pamuk / %5 Elastan',
  renk: 'Indigo',
  en: '175',
  gramaj: '190',
  mamul_turu_adi: 'Suprem',
  qr_slug: 'preview-soft-suprem-indigo'
};

const LabelDesignerPanel = () => {
  const [templates, setTemplates] = useState(() => listLabelTemplates());
  const [activeTemplateId, setActiveTemplateId] = useState(() => getActiveLabelTemplateId());
  const [template, setTemplate] = useState(() => loadLabelTemplate(getActiveLabelTemplateId()));
  const [status, setStatus] = useState('');
  const [previewLang, setPreviewLang] = useState(loadLabelTemplate().previewLang || 'tr');

  const updateTemplate = (patch) => {
    setTemplate((prev) => mergeLabelTemplate({ ...prev, ...patch }));
  };

  const refreshTemplateLibrary = (nextActiveTemplateId = activeTemplateId) => {
    setTemplates(listLabelTemplates());
    setActiveTemplateId(nextActiveTemplateId);
    setTemplate(loadLabelTemplate(nextActiveTemplateId));
  };

  const toggleField = (fieldId) => {
    setTemplate((prev) => {
      const hiddenFields = prev.hiddenFields.includes(fieldId)
        ? prev.hiddenFields.filter((item) => item !== fieldId)
        : [...prev.hiddenFields, fieldId];

      return mergeLabelTemplate({ ...prev, hiddenFields });
    });
  };

  const moveField = (fieldId, direction) => {
    setTemplate((prev) => {
      const currentIndex = prev.fieldOrder.indexOf(fieldId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= prev.fieldOrder.length) {
        return prev;
      }

      const nextOrder = [...prev.fieldOrder];
      const [field] = nextOrder.splice(currentIndex, 1);
      nextOrder.splice(targetIndex, 0, field);
      return mergeLabelTemplate({ ...prev, fieldOrder: nextOrder });
    });
  };

  const updateCareIcon = (iconId, patch) => {
    setTemplate((prev) => mergeLabelTemplate({
      ...prev,
      careIcons: prev.careIcons.map((icon) => (icon.id === iconId ? { ...icon, ...patch } : icon))
    }));
  };

  const visibleCount = template.fieldOrder.filter((fieldId) => !template.hiddenFields.includes(fieldId)).length;

  return (
    <div className="app-label-designer">
      {status ? <div className="app-soft-panel px-4 py-3 text-sm text-[color:var(--app-text)]">{status}</div> : null}

      <div className="app-label-designer-grid">
        <div className="app-label-designer-stack">
          <section className="app-panel p-5 app-reveal-up app-reveal-delay-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Tasarım düzeni</div>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">Kart iskeleti</h3>
              </div>
            </div>

            <div className="mt-4 app-label-compact-grid">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Genişlik</div>
                <input className="app-input" type="number" value={template.widthMm} onChange={(event) => updateTemplate({ widthMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Yükseklik</div>
                <input className="app-input" type="number" value={template.heightMm} onChange={(event) => updateTemplate({ heightMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Başlık sütunu</div>
                <input className="app-input" type="number" step="0.5" value={template.labelColumnMm} onChange={(event) => updateTemplate({ labelColumnMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">QR sütunu</div>
                <input className="app-input" type="number" step="0.5" value={template.qrColumnWidthMm} onChange={(event) => updateTemplate({ qrColumnWidthMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Marka şeridi</div>
                <input className="app-input" type="number" step="0.5" value={template.railWidthMm} onChange={(event) => updateTemplate({ railWidthMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">QR boyutu</div>
                <input className="app-input" type="number" step="0.5" value={template.qrSizeMm} onChange={(event) => updateTemplate({ qrSizeMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Ana font</div>
                <input className="app-input" type="number" step="0.1" value={template.bodyFontPt} onChange={(event) => updateTemplate({ bodyFontPt: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Kompakt font</div>
                <input className="app-input" type="number" step="0.1" value={template.compactFontPt} onChange={(event) => updateTemplate({ compactFontPt: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Satır aralığı</div>
                <input className="app-input" type="number" step="0.05" value={template.rowGapMm} onChange={(event) => updateTemplate({ rowGapMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Kolon aralığı</div>
                <input className="app-input" type="number" step="0.05" value={template.columnGapMm} onChange={(event) => updateTemplate({ columnGapMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Blok aralığı</div>
                <input className="app-input" type="number" step="0.05" value={template.contentGapMm} onChange={(event) => updateTemplate({ contentGapMm: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">İkon üst boşluğu</div>
                <input className="app-input" type="number" step="0.05" value={template.careTopGapMm} onChange={(event) => updateTemplate({ careTopGapMm: event.target.value })} />
              </label>
            </div>

            <div className="mt-4 app-label-compact-grid">
              <label className="block app-label-compact-span-2">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Marka metni</div>
                <input className="app-input" value={template.brandName} onChange={(event) => updateTemplate({ brandName: event.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Marka konumu</div>
                <select className="app-select" value={template.brandPosition} onChange={(event) => updateTemplate({ brandPosition: event.target.value })}>
                  <option value="left">Sol</option>
                  <option value="right">Sağ</option>
                  <option value="top">Üst</option>
                  <option value="bottom">Alt</option>
                </select>
              </label>
              <label className="block app-label-compact-span-2">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">TR tarama notu</div>
                <input className="app-input" value={template.scanTextTr} onChange={(event) => updateTemplate({ scanTextTr: event.target.value })} />
              </label>
              <label className="block app-label-compact-span-2">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">EN tarama notu</div>
                <input className="app-input" value={template.scanTextEn} onChange={(event) => updateTemplate({ scanTextEn: event.target.value })} />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="app-label-toggle">
                <input type="checkbox" checked={template.showBrandRail} onChange={(event) => updateTemplate({ showBrandRail: event.target.checked })} />
                Marka şeridi
              </label>
              <label className="app-label-toggle">
                <input type="checkbox" checked={template.showQr} onChange={(event) => updateTemplate({ showQr: event.target.checked })} />
                QR alanı
              </label>
              <label className="app-label-toggle">
                <input type="checkbox" checked={template.showCareIcons} onChange={(event) => updateTemplate({ showCareIcons: event.target.checked })} />
                Bakım ikonları
              </label>
            </div>
          </section>

          <section className="app-panel p-5 app-reveal-up app-reveal-delay-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Alanlar</div>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">İçerik sırası</h3>
              </div>
              <div className="app-chip">{visibleCount} alan görünür</div>
            </div>

            <div className="mt-4 space-y-3">
              {template.fieldOrder.map((fieldId, index) => {
                const field = labelFieldCatalog.find((item) => item.id === fieldId);
                const hidden = template.hiddenFields.includes(fieldId);
                return (
                  <div key={fieldId} className="app-label-field-row">
                    <label className="flex min-w-0 items-center gap-3">
                      <input type="checkbox" checked={!hidden} onChange={() => toggleField(fieldId)} />
                      <span className="truncate text-sm font-semibold text-[color:var(--app-text)]">{field?.labelTr}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button type="button" className="app-btn-secondary" onClick={() => moveField(fieldId, -1)} disabled={index === 0}>Yukarı</button>
                      <button type="button" className="app-btn-secondary" onClick={() => moveField(fieldId, 1)} disabled={index === template.fieldOrder.length - 1}>Aşağı</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="app-panel p-5 app-reveal-up app-reveal-delay-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Bakım ikonları</div>
            <h3 className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">İkon seti</h3>

            <div className="mt-4 space-y-3">
              {template.careIcons.map((icon) => (
                <div key={icon.id} className="app-label-care-row">
                  <label className="app-label-toggle">
                    <input type="checkbox" checked={icon.enabled} onChange={(event) => updateCareIcon(icon.id, { enabled: event.target.checked })} />
                    Göster
                  </label>
                  <input className="app-input" value={icon.label} onChange={(event) => updateCareIcon(icon.id, { label: event.target.value })} placeholder="Kısa ikon" />
                  <input className="app-input" value={icon.title} onChange={(event) => updateCareIcon(icon.id, { title: event.target.value })} placeholder="Açıklama" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="app-label-designer-preview-column">
          <section className="app-panel p-5 app-label-preview-panel app-reveal-up app-reveal-delay-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Canlı önizleme</div>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">Örnek kart</h3>
              </div>
              <div className="flex flex-col gap-2">
                <select
                  className="app-select min-w-[220px]"
                  value={activeTemplateId}
                  onChange={(event) => refreshTemplateLibrary(event.target.value)}
                >
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <select
                  className="app-select min-w-[220px]"
                  value={previewLang}
                  onChange={(event) => setPreviewLang(event.target.value)}
                >
                  <option value="tr">Önizleme: Türkçe</option>
                  <option value="en">Preview: English</option>
                </select>
              </div>
            </div>

            <LabelPreviewCard record={previewRecord} template={template} lang={previewLang} className="mt-5" />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" className="app-btn-secondary" onClick={() => printLabels([previewRecord], template, 'tr')}>
                Yazdır (TR)
              </button>
              <button type="button" className="app-btn-secondary" onClick={() => printLabels([previewRecord], template, 'en')}>
                Print (EN)
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => {
                  saveLabelTemplate({ ...template, previewLang }, { templateId: activeTemplateId });
                  refreshTemplateLibrary(activeTemplateId);
                  setStatus('Etiket tasarımı kaydedildi.');
                }}
              >
                Tasarımı kaydet
              </button>
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => {
                  const name = window.prompt('Yeni şablon adı', `Şablon ${templates.length + 1}`);
                  if (!name) return;
                  const state = createLabelTemplate(name, template);
                  refreshTemplateLibrary(state.activeTemplateId);
                  setStatus(`Yeni şablon oluşturuldu: ${name}`);
                }}
              >
                Yeni şablon
              </button>
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => {
                  const current = templates.find((item) => item.id === activeTemplateId);
                  const name = window.prompt('Şablon adını güncelle', current?.name || '');
                  if (!name) return;
                  renameLabelTemplate(activeTemplateId, name);
                  refreshTemplateLibrary(activeTemplateId);
                  setStatus('Şablon adı güncellendi.');
                }}
              >
                Yeniden adlandır
              </button>
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => {
                  setTemplate(defaultLabelTemplate);
                  setPreviewLang(defaultLabelTemplate.previewLang);
                  setStatus('Varsayılan tasarım yüklendi.');
                }}
              >
                Varsayılana dön
              </button>
              <button
                type="button"
                className="app-btn-danger"
                onClick={() => {
                  const current = templates.find((item) => item.id === activeTemplateId);
                  if (!current || templates.length <= 1) return;
                  if (!window.confirm(`"${current.name}" şablonunu silmek istiyor musunuz?`)) return;
                  const state = deleteLabelTemplate(activeTemplateId);
                  refreshTemplateLibrary(state.activeTemplateId);
                  setStatus('Şablon silindi.');
                }}
                disabled={templates.length <= 1}
              >
                Şablonu sil
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LabelDesignerPanel;
