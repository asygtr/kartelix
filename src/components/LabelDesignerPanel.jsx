import React, { useEffect, useRef, useState } from 'react';
import LabelPreviewCard from './LabelPreviewCard';
import { authHeaders } from '../utils/auth';
import {
  defaultLabelTemplate,
  labelFieldCatalog,
  mergeLabelTemplate,
  printLabels
} from '../utils/labelTemplate';

const api = {
  getTemplates: () =>
    fetch('/api/admin/label-templates', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ success: false, data: [] })),
  getActive: () =>
    fetch('/api/admin/label-templates/active', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ success: false })),
  getById: (id) =>
    fetch(`/api/admin/label-templates/${id}`, { headers: authHeaders() }).then(r => r.json()).catch(() => ({ success: false })),
  save: (templateId, name, template, setActive) =>
    fetch('/api/admin/label-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ templateId, name, template, setActive })
    }).then(r => r.json()).catch(() => null),
  delete: (templateId) =>
    fetch(`/api/admin/label-templates/${templateId}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json()).catch(() => null),
  exportCsv: () => fetch('/api/admin/label-templates/export', { headers: authHeaders() }),
  importCsv: (text) =>
    fetch('/api/admin/label-templates/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv', ...authHeaders() },
      body: text
    }).then(r => r.json()).catch(() => null)
};

const NumericControl = ({ label, value, onChange, min = 0, max = 100, step = 0.5 }) => (
  <label className="app-label-control">
    <div className="app-label-control-head">
      <span className="text-sm font-medium text-[color:var(--app-text)]">{label}</span>
      <input
        className="app-input app-label-control-number"
        type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
    <input
      className="app-label-control-range"
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

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

const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
};

const LabelDesignerPanel = () => {
  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [template, setTemplate] = useState(defaultLabelTemplate);
  const [previewLang, setPreviewLang] = useState('tr');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const isMobileViewport = useIsMobileViewport();

  // İlk yüklemede şablon listesini ve aktifi getir
  useEffect(() => {
    const init = async () => {
      const [listRes, activeRes] = await Promise.all([api.getTemplates(), api.getActive()]);
      const list = listRes.success ? (listRes.data || []) : [];
      setTemplates(list);

      if (activeRes.success && activeRes.data) {
        const active = activeRes.data;
        const id = active.id || active.template_id || '';
        const name = list.find(t => (t.template_id || t.id) === id)?.name || active.name || 'Şablon';
        setActiveId(id);
        setTemplateName(name);
        setTemplate(mergeLabelTemplate(active));
      } else if (list.length > 0) {
        const first = list[0];
        const id = first.template_id || first.id;
        setActiveId(id);
        setTemplateName(first.name || 'Şablon');
        const detail = await api.getById(id);
        if (detail.success) setTemplate(mergeLabelTemplate(detail.data));
      }
    };
    init();
  }, []);

  const updateTemplate = (patch) =>
    setTemplate(prev => mergeLabelTemplate({ ...prev, ...patch }));

  const toggleField = (fieldId) =>
    setTemplate(prev => {
      const hidden = prev.hiddenFields.includes(fieldId)
        ? prev.hiddenFields.filter(f => f !== fieldId)
        : [...prev.hiddenFields, fieldId];
      return mergeLabelTemplate({ ...prev, hiddenFields: hidden });
    });

  const moveField = (fieldId, dir) =>
    setTemplate(prev => {
      const idx = prev.fieldOrder.indexOf(fieldId);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.fieldOrder.length) return prev;
      const order = [...prev.fieldOrder];
      order.splice(next, 0, order.splice(idx, 1)[0]);
      return mergeLabelTemplate({ ...prev, fieldOrder: order });
    });

  const updateCareIcon = (iconId, patch) =>
    setTemplate(prev => mergeLabelTemplate({
      ...prev,
      careIcons: prev.careIcons.map(icon => icon.id === iconId ? { ...icon, ...patch } : icon)
    }));

  // Şablon seçimi değişince içeriği yükle
  const handleSelectTemplate = async (id) => {
    const detail = await api.getById(id);
    if (!detail.success) return;
    const name = templates.find(t => (t.template_id || t.id) === id)?.name || detail.data?.name || 'Şablon';
    // Seçilen şablonu aktif yap (server'da)
    await api.save(id, name, mergeLabelTemplate(detail.data), true);
    setActiveId(id);
    setTemplateName(name);
    setTemplate(mergeLabelTemplate(detail.data));
    // Liste is_active durumunu güncelle
    setTemplates(prev => prev.map(t => ({ ...t, is_active: (t.template_id || t.id) === id ? 1 : 0 })));
  };

  // Mevcut şablonu kaydet
  const handleSave = async () => {
    if (!templateName.trim()) { setStatus('Şablon adı boş olamaz.'); return; }
    setSaving(true);
    const result = await api.save(activeId, templateName.trim(), template, true);
    if (result?.success) {
      setTemplates(prev => prev.map(t =>
        (t.template_id || t.id) === activeId ? { ...t, name: templateName.trim() } : t
      ));
      setStatus('Kaydedildi.');
    } else {
      setStatus('Kaydetme başarısız.');
    }
    setSaving(false);
    setTimeout(() => setStatus(''), 2500);
  };

  // Yeni şablon — mevcut tasarımı kopyalar, isim girmek gerekmez, sonra değiştirilebilir
  const handleNew = async () => {
    const name = `Şablon ${templates.length + 1}`;
    const newId = `template-${Date.now()}`;
    const result = await api.save(newId, name, template, true);
    if (result?.success) {
      const newEntry = { id: newId, template_id: newId, name, is_active: 1 };
      setTemplates(prev => [...prev.map(t => ({ ...t, is_active: 0 })), newEntry]);
      setActiveId(newId);
      setTemplateName(name);
      setStatus('Yeni şablon oluşturuldu. Adı değiştirip kaydedin.');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  // Şablonu sil
  const handleDelete = async () => {
    if (templates.length <= 1) { setStatus('Son şablon silinemez.'); return; }
    if (!window.confirm(`"${templateName}" şablonunu silmek istiyor musunuz?`)) return;
    await api.delete(activeId);
    const remaining = templates.filter(t => (t.template_id || t.id) !== activeId);
    const nextId = remaining[0]?.template_id || remaining[0]?.id || '';
    setTemplates(remaining);
    if (nextId) await handleSelectTemplate(nextId);
    setStatus('Şablon silindi.');
    setTimeout(() => setStatus(''), 2500);
  };

  const handleExport = async () => {
    const res = await api.exportCsv();
    if (!res.ok) { setStatus('Dışa aktarma başarısız.'); return; }
    const csv = await res.text();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `label-templates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setStatus('CSV dışa aktarıldı.');
    setTimeout(() => setStatus(''), 2500);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = await api.importCsv(text);
    if (result?.success) {
      const listRes = await api.getTemplates();
      if (listRes.success) setTemplates(listRes.data || []);
      setStatus(`${result.data?.importedCount || 0} şablon içe aktarıldı.`);
    } else {
      setStatus('İçe aktarma başarısız.');
    }
    e.target.value = '';
    setTimeout(() => setStatus(''), 2500);
  };

  const visibleCount = template.fieldOrder.filter(f => !template.hiddenFields.includes(f)).length;

  if (isMobileViewport) {
    return (
      <div className="app-label-designer">
        <section className="app-panel p-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
            Mobil görünümde etiket düzenleme yapılamıyor.
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Önizleme</div>
            <LabelPreviewCard record={previewRecord} template={template} lang={previewLang} className="mt-4" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-label-designer">
      {status && (
        <div className="app-soft-panel px-4 py-3 text-sm text-[color:var(--app-text)]">{status}</div>
      )}

      <div className="app-label-designer-grid">
        {/* Sol sütun — kontroller, kendi içinde scroll eder */}
        <div className="app-label-designer-stack app-label-designer-scroll-col">
          <section className="app-panel p-5 app-reveal-up app-reveal-delay-1">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Tasarım düzeni</div>
            <h3 className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">Kart iskeleti</h3>

            <div className="mt-4 app-label-compact-grid">
              <NumericControl label="Sayfa genişliği" value={template.widthMm} min={40} max={140} step={1} onChange={v => updateTemplate({ widthMm: v })} />
              <NumericControl label="Sayfa yüksekliği" value={template.heightMm} min={30} max={120} step={1} onChange={v => updateTemplate({ heightMm: v })} />
              <NumericControl label="Kart genişliği" value={template.innerWidthMm} min={20} max={120} step={0.5} onChange={v => updateTemplate({ innerWidthMm: v })} />
              <NumericControl label="Kart yüksekliği" value={template.innerHeightMm} min={20} max={100} step={0.5} onChange={v => updateTemplate({ innerHeightMm: v })} />
              <label className="app-label-control">
                <div className="app-label-control-head">
                  <span className="text-sm font-medium text-[color:var(--app-text)]">Çerçeve stili</span>
                </div>
                <select className="app-select" value={template.frameStyle} onChange={e => updateTemplate({ frameStyle: e.target.value })}>
                  <option value="none">Yok (çerçevesiz)</option>
                  <option value="solid">Düz çizgi</option>
                  <option value="double">Çift çizgi</option>
                  <option value="dashed">Kesik çizgi</option>
                  <option value="corners">Köşe süslemeli</option>
                </select>
              </label>
              <NumericControl label="Çerçeve kalınlığı" value={template.borderWidthMm} min={0.2} max={2} step={0.05} onChange={v => updateTemplate({ borderWidthMm: v })} />
              <NumericControl label="Köşe süs boyutu" value={template.cornerSizeMm} min={2} max={10} step={0.2} onChange={v => updateTemplate({ cornerSizeMm: v })} />
              <NumericControl label="Köşe yuvarlama" value={template.borderRadiusMm} min={0} max={6} step={0.1} onChange={v => updateTemplate({ borderRadiusMm: v })} />
              <NumericControl label="Üst boşluk" value={template.pageMarginTopMm} min={0} max={20} step={0.5} onChange={v => updateTemplate({ pageMarginTopMm: v })} />
              <NumericControl label="Sol boşluk" value={template.pageMarginLeftMm} min={0} max={20} step={0.5} onChange={v => updateTemplate({ pageMarginLeftMm: v })} />
              <NumericControl label="Sağ boşluk" value={template.pageMarginRightMm} min={0} max={20} step={0.5} onChange={v => updateTemplate({ pageMarginRightMm: v })} />
              <NumericControl label="Alt boşluk" value={template.pageMarginBottomMm} min={0} max={20} step={0.5} onChange={v => updateTemplate({ pageMarginBottomMm: v })} />
              <NumericControl label="Başlık sütunu" value={template.labelColumnMm} min={6} max={30} step={0.5} onChange={v => updateTemplate({ labelColumnMm: v })} />
              <NumericControl label="QR sütunu" value={template.qrColumnWidthMm} min={8} max={30} step={0.5} onChange={v => updateTemplate({ qrColumnWidthMm: v })} />
              <NumericControl label="Marka şeridi" value={template.railWidthMm} min={2} max={16} step={0.5} onChange={v => updateTemplate({ railWidthMm: v })} />
              <NumericControl label="Marka font" value={template.brandFontPt} min={3} max={16} step={0.1} onChange={v => updateTemplate({ brandFontPt: v })} />
              <NumericControl label="QR boyutu" value={template.qrSizeMm} min={8} max={24} step={0.5} onChange={v => updateTemplate({ qrSizeMm: v })} />
              <NumericControl label="Ana font" value={template.bodyFontPt} min={3} max={12} step={0.1} onChange={v => updateTemplate({ bodyFontPt: v })} />
              <NumericControl label="Kompakt font" value={template.compactFontPt} min={3} max={11} step={0.1} onChange={v => updateTemplate({ compactFontPt: v })} />
              <NumericControl label="Satır aralığı" value={template.rowGapMm} min={0} max={3} step={0.05} onChange={v => updateTemplate({ rowGapMm: v })} />
              <NumericControl label="Kolon aralığı" value={template.columnGapMm} min={0} max={3} step={0.05} onChange={v => updateTemplate({ columnGapMm: v })} />
              <NumericControl label="Blok aralığı" value={template.contentGapMm} min={0} max={6} step={0.05} onChange={v => updateTemplate({ contentGapMm: v })} />
              <label className="app-label-control">
                <div className="app-label-control-head">
                  <span className="text-sm font-medium text-[color:var(--app-text)]">QR dikey hizası</span>
                </div>
                <select className="app-select" value={template.qrVerticalAlign} onChange={e => updateTemplate({ qrVerticalAlign: e.target.value })}>
                  <option value="top">Üst</option>
                  <option value="center">Orta</option>
                  <option value="bottom">Alt</option>
                </select>
              </label>
              <NumericControl label="İkon üst boşluğu" value={template.careTopGapMm} min={0} max={6} step={0.05} onChange={v => updateTemplate({ careTopGapMm: v })} />
              <NumericControl label="QR üst offset" value={template.qrOffsetTopMm} min={0} max={20} step={0.5} onChange={v => updateTemplate({ qrOffsetTopMm: v })} />
            </div>

            <div className="mt-4 app-label-compact-grid">
              <label className="block app-label-compact-span-2">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Marka metni</div>
                <input className="app-input" value={template.brandName} onChange={e => updateTemplate({ brandName: e.target.value })} />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Marka konumu</div>
                <select className="app-select" value={template.brandPosition} onChange={e => updateTemplate({ brandPosition: e.target.value })}>
                  <option value="left">Sol</option>
                  <option value="right">Sağ</option>
                  <option value="top">Üst</option>
                  <option value="bottom">Alt</option>
                </select>
              </label>
              <label className="block app-label-compact-span-2">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">TR tarama notu</div>
                <input className="app-input" value={template.scanTextTr} onChange={e => updateTemplate({ scanTextTr: e.target.value })} />
              </label>
              <label className="block app-label-compact-span-2">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">EN tarama notu</div>
                <input className="app-input" value={template.scanTextEn} onChange={e => updateTemplate({ scanTextEn: e.target.value })} />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="app-label-toggle">
                <input type="checkbox" checked={template.showBrandRail} onChange={e => updateTemplate({ showBrandRail: e.target.checked })} />
                Marka şeridi
              </label>
              <label className="app-label-toggle">
                <input type="checkbox" checked={template.showQr} onChange={e => updateTemplate({ showQr: e.target.checked })} />
                QR alanı
              </label>
              <label className="app-label-toggle">
                <input type="checkbox" checked={template.showCareIcons} onChange={e => updateTemplate({ showCareIcons: e.target.checked })} />
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
                const field = labelFieldCatalog.find(f => f.id === fieldId);
                const hidden = template.hiddenFields.includes(fieldId);
                return (
                  <div key={fieldId} className="app-label-field-row">
                    <label className="flex min-w-0 items-center gap-3">
                      <input type="checkbox" checked={!hidden} onChange={() => toggleField(fieldId)} />
                      <span className="truncate text-sm font-semibold text-[color:var(--app-text)]">{field?.labelTr}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button type="button" className="app-btn-secondary" onClick={() => moveField(fieldId, -1)} disabled={index === 0}>↑</button>
                      <button type="button" className="app-btn-secondary" onClick={() => moveField(fieldId, 1)} disabled={index === template.fieldOrder.length - 1}>↓</button>
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
              {template.careIcons.map(icon => (
                <div key={icon.id} className="app-label-care-row">
                  <label className="app-label-toggle">
                    <input type="checkbox" checked={icon.enabled} onChange={e => updateCareIcon(icon.id, { enabled: e.target.checked })} />
                    Göster
                  </label>
                  <input className="app-input" value={icon.label} onChange={e => updateCareIcon(icon.id, { label: e.target.value })} placeholder="Kısa ikon" />
                  <input className="app-input" value={icon.title} onChange={e => updateCareIcon(icon.id, { title: e.target.value })} placeholder="Açıklama" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sağ sütun — önizleme + şablon yönetimi */}
        <div className="app-label-designer-preview-column">
          <section className="app-panel p-5 app-label-preview-panel app-reveal-up app-reveal-delay-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Önizleme</div>

            {/* Şablon seçici */}
            <div className="mt-3">
              <div className="text-xs font-semibold text-[color:var(--app-text-muted)] mb-1">Aktif şablon</div>
              <select
                className="app-select w-full"
                value={activeId}
                onChange={e => handleSelectTemplate(e.target.value)}
              >
                {templates.map(t => (
                  <option key={t.template_id || t.id} value={t.template_id || t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Şablon adı — inline düzenle */}
            <div className="mt-3">
              <div className="text-xs font-semibold text-[color:var(--app-text-muted)] mb-1">Şablon adı</div>
              <input
                className="app-input w-full"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Şablon adı"
              />
            </div>

            {/* Önizleme dili */}
            <div className="mt-3">
              <select className="app-select w-full" value={previewLang} onChange={e => setPreviewLang(e.target.value)}>
                <option value="tr">Önizleme: Türkçe</option>
                <option value="en">Preview: English</option>
              </select>
            </div>

            <LabelPreviewCard record={previewRecord} template={template} lang={previewLang} className="mt-4" />

            {/* Ana eylemler */}
            <div className="mt-4 grid gap-2 grid-cols-2">
              <button type="button" className="app-btn-primary col-span-2" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button type="button" className="app-btn-secondary" onClick={() => printLabels([previewRecord], template, 'tr')}>
                Yazdır TR
              </button>
              <button type="button" className="app-btn-secondary" onClick={() => printLabels([previewRecord], template, 'en')}>
                Print EN
              </button>
            </div>

            {/* Şablon yönetimi */}
            <div className="mt-4 border-t border-[color:var(--app-border)] pt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)] mb-3">Şablon yönetimi</div>
              <div className="grid gap-2 grid-cols-2">
                <button type="button" className="app-btn-secondary" onClick={handleNew}>
                  + Yeni şablon
                </button>
                <button type="button" className="app-btn-secondary" onClick={() => { setTemplate(defaultLabelTemplate); setStatus('Varsayılan yüklendi.'); setTimeout(() => setStatus(''), 2000); }}>
                  Varsayılana dön
                </button>
                <button type="button" className="app-btn-secondary" onClick={handleExport}>
                  CSV Dışa Aktar
                </button>
                <label className="app-btn-secondary text-center cursor-pointer">
                  CSV İçe Aktar
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
                </label>
                <button
                  type="button"
                  className="app-btn-danger col-span-2"
                  onClick={handleDelete}
                  disabled={templates.length <= 1}
                >
                  Bu şablonu sil
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LabelDesignerPanel;
