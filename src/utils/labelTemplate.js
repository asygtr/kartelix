const STORAGE_KEY = 'kartelix-label-template-library-v1';

export const labelFieldCatalog = [
  { id: 'article_code', labelTr: 'Article No', labelEn: 'Article No' },
  { id: 'mamul_adi', labelTr: 'Mamül', labelEn: 'Product' },
  { id: 'kompozisyon_ozeti', labelTr: 'Kompozisyon', labelEn: 'Composition', compact: true },
  { id: 'renk', labelTr: 'Renk', labelEn: 'Color' },
  { id: 'en', labelTr: 'En (cm)', labelEn: 'Width (cm)' },
  { id: 'gramaj', labelTr: 'Gramaj (gr/m²)', labelEn: 'Weight (gr/m²)' },
  { id: 'mamul_turu_adi', labelTr: 'Tür', labelEn: 'Type' }
];

export const defaultCareIcons = [
  { id: 'wash-30', label: '30', title: '30°C yıkama', enabled: true },
  { id: 'bleach-no', label: 'X', title: 'Çamaşır suyu yok', enabled: true },
  { id: 'iron-low', label: 'I', title: 'Düşük ısı ütü', enabled: true },
  { id: 'dry-no', label: 'D', title: 'Kurutma yok', enabled: true },
  { id: 'dry-clean', label: 'P', title: 'Kuru temizleme', enabled: true }
];

export const defaultLabelTemplate = {
  brandName: 'KARTELIX',
  widthMm: 90,
  heightMm: 60,
  innerWidthMm: 86,
  innerHeightMm: 56,
  paddingMm: 2,
  pageMarginTopMm: 2,
  pageMarginRightMm: 2,
  pageMarginBottomMm: 2,
  pageMarginLeftMm: 2,
  railWidthMm: 4,
  brandPosition: 'left',
  qrColumnWidthMm: 15,
  qrSizeMm: 13.75,
  qrVerticalAlign: 'top',
  qrOffsetTopMm: 0,
  labelColumnMm: 10,
  rowGapMm: 0.45,
  columnGapMm: 0.45,
  contentGapMm: 1.2,
  careGapMm: 0.55,
  careTopGapMm: 0.7,
  borderRadiusMm: 0.4,
  borderWidthMm: 0.35,
  frameStyle: 'solid',
  cornerSizeMm: 3.2,
  borderColor: '#111827',
  accentColor: '#111827',
  backgroundColor: '#ffffff',
  scanTextTr: '↗ BENİ TARA',
  scanTextEn: '↗ SCAN ME',
  showBrandRail: true,
  showQr: true,
  showCareIcons: true,
  brandLetterSpacing: 0.06,
  bodyFontPt: 5.2,
  bodyLineHeight: 1.04,
  compactFontPt: 4.8,
  previewLang: 'tr',
  fieldOrder: labelFieldCatalog.map((field) => field.id),
  hiddenFields: [],
  careIcons: defaultCareIcons
};

const defaultTemplateRecord = {
  id: 'default-template',
  name: 'Standart Etiket',
  template: defaultLabelTemplate
};

const coerceNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const coerceNumberAllowZero = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const createTemplateId = () => `template-${Math.random().toString(36).slice(2, 10)}`;

export const extractColorName = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  const parts = str.split(/\s+/);
  const codePart = parts.find(p => /^\d+[A-Z]*$/i.test(p) || /^[A-Z]{2}\d+$/i.test(p));
  if (codePart && parts.length > 1) {
    return parts.filter(p => p !== codePart).join(' ');
  }
  return str;
};

const colorNameToHex = (colorName) => {
  if (!colorName) return null;
  const normalized = extractColorName(colorName).toLowerCase();
  const colorMap = {
    'red': '#ef4444', 'kirmizi': '#ef4444',
    'blue': '#3b82f6', 'mavi': '#3b82f6',
    'navy': '#1e3a8a', 'lacivert': '#1e3a8a',
    'green': '#22c55e', 'yesil': '#22c55e',
    'black': '#000000', 'siyah': '#000000',
    'white': '#ffffff', 'beyaz': '#ffffff',
    'gray': '#6b7280', 'grey': '#6b7280', 'gri': '#6b7280',
    'indigo': '#6366f1', 'teal': '#14b8a6',
    'orange': '#f97316', 'turuncu': '#f97316',
    'purple': '#a855f7', 'mor': '#a855f7',
    'pink': '#ec4899', 'pembe': '#ec4899',
    'brown': '#a3a3a3', 'bege': '#d6d3d1', 'beige': '#d6d3d1',
    'yellow': '#eab308', 'sari': '#eab308'
  };
  return colorMap[normalized] || null;
};

export const resolveColorHex = (record) => {
  const val = record?.renk_kodu || record?.renk || '';
  if (!val) return null;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) return val;
  return colorNameToHex(val);
};

export const normalizeLabelText = (value, lang = 'tr') => {
  // ² sembolünü geçici olarak koru
  const placeholder = '\x00SUP2\x00';
  const withPlaceholder = String(value || '-').replace(/²/g, placeholder);
  if (lang === 'en') {
    return withPlaceholder.toLocaleUpperCase('en-US').replace(new RegExp(placeholder, 'g'), '²');
  }
  // Türkçe: küçük harfleri locale-safe büyüt
  const preConverted = withPlaceholder
    .replace(/i/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/ü/g, 'U')
    .replace(/ç/g, 'C')
    .replace(/ğ/g, 'G')
    .replace(/ş/g, 'S')
    .replace(/ö/g, 'O');
  return preConverted
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/I\u0307/g, 'I')
    .replace(/Ü/g, 'U')
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(new RegExp(placeholder, 'g'), '²');
};

export const getFieldDefinition = (fieldId) =>
  labelFieldCatalog.find((field) => field.id === fieldId) || labelFieldCatalog[0];

export const getFieldLabel = (fieldId, lang = 'tr') => {
  const field = getFieldDefinition(fieldId);
  return lang === 'en' ? field.labelEn : field.labelTr;
};

export const getFieldValue = (record, fieldId) => {
  if (!record) return '-';
  return String(record[fieldId] ?? '-');
};

export const mergeLabelTemplate = (incomingTemplate = {}) => {
  const nextOrder = Array.isArray(incomingTemplate.fieldOrder)
    ? incomingTemplate.fieldOrder.filter((fieldId) => labelFieldCatalog.some((field) => field.id === fieldId))
    : defaultLabelTemplate.fieldOrder;

  const remainingFields = labelFieldCatalog
    .map((field) => field.id)
    .filter((fieldId) => !nextOrder.includes(fieldId));

  const nextCareIcons = Array.isArray(incomingTemplate.careIcons)
    ? incomingTemplate.careIcons.slice(0, 8).map((icon, index) => ({
        id: icon.id || `care-${index}`,
        label: String(icon.label || ''),
        title: String(icon.title || ''),
        enabled: icon.enabled !== false
      }))
    : defaultCareIcons;

  return {
    ...defaultLabelTemplate,
    ...incomingTemplate,
    widthMm: coerceNumber(incomingTemplate.widthMm, defaultLabelTemplate.widthMm),
    heightMm: coerceNumber(incomingTemplate.heightMm, defaultLabelTemplate.heightMm),
    innerWidthMm: coerceNumber(incomingTemplate.innerWidthMm, defaultLabelTemplate.innerWidthMm),
    innerHeightMm: coerceNumber(incomingTemplate.innerHeightMm, defaultLabelTemplate.innerHeightMm),
    paddingMm: coerceNumber(incomingTemplate.paddingMm, defaultLabelTemplate.paddingMm),
    pageMarginTopMm: coerceNumber(incomingTemplate.pageMarginTopMm, incomingTemplate.paddingMm ?? defaultLabelTemplate.pageMarginTopMm),
    pageMarginRightMm: coerceNumber(incomingTemplate.pageMarginRightMm, incomingTemplate.paddingMm ?? defaultLabelTemplate.pageMarginRightMm),
    pageMarginBottomMm: coerceNumber(incomingTemplate.pageMarginBottomMm, incomingTemplate.paddingMm ?? defaultLabelTemplate.pageMarginBottomMm),
    pageMarginLeftMm: coerceNumber(incomingTemplate.pageMarginLeftMm, incomingTemplate.paddingMm ?? defaultLabelTemplate.pageMarginLeftMm),
    railWidthMm: coerceNumber(incomingTemplate.railWidthMm, defaultLabelTemplate.railWidthMm),
    qrColumnWidthMm: coerceNumber(incomingTemplate.qrColumnWidthMm, defaultLabelTemplate.qrColumnWidthMm),
    qrSizeMm: coerceNumber(incomingTemplate.qrSizeMm, defaultLabelTemplate.qrSizeMm),
    qrOffsetTopMm: coerceNumberAllowZero(incomingTemplate.qrOffsetTopMm, defaultLabelTemplate.qrOffsetTopMm),
    labelColumnMm: coerceNumber(incomingTemplate.labelColumnMm, defaultLabelTemplate.labelColumnMm),
    rowGapMm: coerceNumber(incomingTemplate.rowGapMm, defaultLabelTemplate.rowGapMm),
    columnGapMm: coerceNumber(incomingTemplate.columnGapMm, defaultLabelTemplate.columnGapMm),
    contentGapMm: coerceNumber(incomingTemplate.contentGapMm, defaultLabelTemplate.contentGapMm),
    careGapMm: coerceNumber(incomingTemplate.careGapMm, defaultLabelTemplate.careGapMm),
    careTopGapMm: coerceNumber(incomingTemplate.careTopGapMm, defaultLabelTemplate.careTopGapMm),
    borderRadiusMm: coerceNumber(incomingTemplate.borderRadiusMm, defaultLabelTemplate.borderRadiusMm),
    borderWidthMm: coerceNumber(incomingTemplate.borderWidthMm, defaultLabelTemplate.borderWidthMm),
    cornerSizeMm: coerceNumber(incomingTemplate.cornerSizeMm, defaultLabelTemplate.cornerSizeMm),
    bodyFontPt: coerceNumber(incomingTemplate.bodyFontPt, defaultLabelTemplate.bodyFontPt),
    compactFontPt: coerceNumber(incomingTemplate.compactFontPt, defaultLabelTemplate.compactFontPt),
    bodyLineHeight: coerceNumber(incomingTemplate.bodyLineHeight, defaultLabelTemplate.bodyLineHeight),
    brandLetterSpacing: coerceNumber(incomingTemplate.brandLetterSpacing, defaultLabelTemplate.brandLetterSpacing),
    brandPosition: ['left', 'right', 'top', 'bottom'].includes(incomingTemplate.brandPosition) ? incomingTemplate.brandPosition : defaultLabelTemplate.brandPosition,
    qrVerticalAlign: ['top', 'center', 'bottom'].includes(incomingTemplate.qrVerticalAlign) ? incomingTemplate.qrVerticalAlign : defaultLabelTemplate.qrVerticalAlign,
    frameStyle: ['none', 'solid', 'double', 'dashed', 'corners'].includes(incomingTemplate.frameStyle) ? incomingTemplate.frameStyle : defaultLabelTemplate.frameStyle,
    fieldOrder: [...nextOrder, ...remainingFields],
    hiddenFields: Array.isArray(incomingTemplate.hiddenFields) ? incomingTemplate.hiddenFields : [],
    careIcons: nextCareIcons
  };
};

const getDefaultLibrary = () => ({
  activeTemplateId: defaultTemplateRecord.id,
  templates: [{ ...defaultTemplateRecord, template: mergeLabelTemplate(defaultTemplateRecord.template) }]
});

const loadTemplateLibraryState = () => {
  if (typeof window === 'undefined') {
    return getDefaultLibrary();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultLibrary();
    const parsed = JSON.parse(raw);
    const templates = Array.isArray(parsed.templates) && parsed.templates.length
      ? parsed.templates.map((item, index) => ({
          id: item.id || `template-${index}`,
          name: item.name || `Şablon ${index + 1}`,
          template: mergeLabelTemplate(item.template || {})
        }))
      : getDefaultLibrary().templates;

    const activeTemplateId = templates.some((item) => item.id === parsed.activeTemplateId)
      ? parsed.activeTemplateId
      : templates[0].id;

    return { activeTemplateId, templates };
  } catch (error) {
    return getDefaultLibrary();
  }
};

const saveTemplateLibraryState = (state) => {
  const normalized = {
    activeTemplateId: state.activeTemplateId,
    templates: state.templates.map((item) => ({
      id: item.id,
      name: item.name,
      template: mergeLabelTemplate(item.template)
    }))
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
};

export const listLabelTemplates = () => loadTemplateLibraryState().templates;

export const getActiveLabelTemplateId = () => loadTemplateLibraryState().activeTemplateId;

export const setActiveLabelTemplateId = (templateId) => {
  const state = loadTemplateLibraryState();
  if (!state.templates.some((item) => item.id === templateId)) {
    return state.activeTemplateId;
  }
  return saveTemplateLibraryState({ ...state, activeTemplateId: templateId }).activeTemplateId;
};

export const loadLabelTemplate = (templateId) => {
  const state = loadTemplateLibraryState();
  const resolvedId = templateId || state.activeTemplateId;
  return state.templates.find((item) => item.id === resolvedId)?.template || state.templates[0].template;
};

export const saveLabelTemplate = (template, options = {}) => {
  const state = loadTemplateLibraryState();
  const targetId = options.templateId || state.activeTemplateId;
  const normalizedTemplate = mergeLabelTemplate(template);
  const nextTemplates = state.templates.map((item) => (
    item.id === targetId
      ? { ...item, name: options.name || item.name, template: normalizedTemplate }
      : item
  ));
  return saveTemplateLibraryState({ ...state, templates: nextTemplates });
};

export const createLabelTemplate = (name, baseTemplate = defaultLabelTemplate) => {
  const state = loadTemplateLibraryState();
  const newTemplate = {
    id: createTemplateId(),
    name: String(name || `Şablon ${state.templates.length + 1}`).trim(),
    template: mergeLabelTemplate(baseTemplate)
  };

  return saveTemplateLibraryState({
    activeTemplateId: newTemplate.id,
    templates: [...state.templates, newTemplate]
  });
};

export const renameLabelTemplate = (templateId, name) => {
  const state = loadTemplateLibraryState();
  return saveTemplateLibraryState({
    ...state,
    templates: state.templates.map((item) => (
      item.id === templateId ? { ...item, name: String(name || item.name).trim() } : item
    ))
  });
};

export const deleteLabelTemplate = (templateId) => {
  const state = loadTemplateLibraryState();
  if (state.templates.length <= 1) return state;

  const nextTemplates = state.templates.filter((item) => item.id !== templateId);
  const nextActiveTemplateId = state.activeTemplateId === templateId ? nextTemplates[0].id : state.activeTemplateId;
  return saveTemplateLibraryState({
    activeTemplateId: nextActiveTemplateId,
    templates: nextTemplates
  });
};

export const getVisibleFieldIds = (templateInput) => {
  const template = mergeLabelTemplate(templateInput);
  return template.fieldOrder.filter((fieldId) => !template.hiddenFields.includes(fieldId));
};

const getScanText = (template, lang) => String(lang === 'en' ? template.scanTextEn : template.scanTextTr || '').trim();

const withUnit = (value, unit) => `${value}${unit}`;

export const getFramePresentation = (templateInput, unit = 'mm') => {
  const template = mergeLabelTemplate(templateInput);
  const borderWidth = Math.max(template.borderWidthMm, 0.2);
  const borderRadius = Math.max(template.borderRadiusMm, 0);
  const cornerSize = Math.max(template.cornerSizeMm, borderWidth * 4);
  const innerInset = Math.max(borderWidth * 2.6, 0.9);

  if (template.frameStyle === 'none') {
    return {
      border: 'none',
      borderRadius: withUnit(borderRadius, unit),
      showInnerFrame: false,
      innerFrameStyle: {},
      showCorners: false,
      cornerStyle: {}
    };
  }

  const base = {
    border: `${withUnit(borderWidth, unit)} solid ${template.borderColor}`,
    borderRadius: withUnit(borderRadius, unit),
    showInnerFrame: false,
    innerFrameStyle: {},
    showCorners: false,
    cornerStyle: {
      width: withUnit(cornerSize, unit),
      height: withUnit(cornerSize, unit),
      borderColor: template.borderColor,
      borderWidth: withUnit(borderWidth, unit),
      borderRadius: withUnit(Math.max(borderRadius * 0.75, 0), unit)
    }
  };

  if (template.frameStyle === 'double') {
    return {
      ...base,
      showInnerFrame: true,
      innerFrameStyle: {
        inset: withUnit(innerInset, unit),
        border: `${withUnit(Math.max(borderWidth * 0.7, 0.2), unit)} solid ${template.borderColor}`,
        borderRadius: withUnit(Math.max(borderRadius * 0.72, 0), unit)
      }
    };
  }

  if (template.frameStyle === 'dashed') {
    return {
      ...base,
      border: `${withUnit(borderWidth, unit)} dashed ${template.borderColor}`
    };
  }

  if (template.frameStyle === 'corners') {
    return {
      ...base,
      showCorners: true
    };
  }

  return base;
};

export const getResolvedLabelMetrics = (templateInput) => {
  const template = mergeLabelTemplate(templateInput);
  const outerWidthMm = template.widthMm;
  const outerHeightMm = template.heightMm;
  const maxCardWidthMm = Math.max(outerWidthMm - template.pageMarginLeftMm - template.pageMarginRightMm, 10);
  const maxCardHeightMm = Math.max(outerHeightMm - template.pageMarginTopMm - template.pageMarginBottomMm, 10);
  const cardWidthMm = Math.min(template.innerWidthMm, maxCardWidthMm);
  const cardHeightMm = Math.min(template.innerHeightMm, maxCardHeightMm);

  return {
    ...template,
    outerWidthMm,
    outerHeightMm,
    cardWidthMm,
    cardHeightMm,
    maxCardWidthMm,
    maxCardHeightMm
  };
};

export const buildPublicUrl = (record) => `${window.location.origin}/u/${record?.qr_slug || ''}`;

const getCardLayout = (template) => {
  const hasBrandRail = template.showBrandRail;
  const hasQr = template.showQr;
  const qrJustifyContent = ({
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end'
  })[template.qrVerticalAlign] || 'flex-start';

  if (template.brandPosition === 'top' || template.brandPosition === 'bottom') {
    return {
      cardColumns: hasQr ? `1fr ${template.qrColumnWidthMm}mm` : '1fr',
      cardRows: hasBrandRail ? `${template.railWidthMm}mm 1fr` : '1fr',
      brandStyle: template.brandPosition === 'top'
        ? `grid-column: 1 / -1; grid-row: 1; border-bottom: 1px solid ${template.borderColor}; justify-content: center; align-items: center;`
        : `grid-column: 1 / -1; grid-row: 2; border-top: 1px solid ${template.borderColor}; justify-content: center; align-items: center;`,
      brandInnerStyle: 'writing-mode: horizontal-tb; transform: none;',
      mainStyle: hasBrandRail
        ? template.brandPosition === 'top'
          ? 'grid-column: 1; grid-row: 2;'
          : 'grid-column: 1; grid-row: 1;'
        : 'grid-column: 1; grid-row: 1;',
      qrStyle: hasQr
        ? hasBrandRail
          ? template.brandPosition === 'top'
            ? `grid-column: 2; grid-row: 2; justify-content:${qrJustifyContent}; padding-top:${template.qrOffsetTopMm}mm;`
            : `grid-column: 2; grid-row: 1; justify-content:${qrJustifyContent}; padding-top:${template.qrOffsetTopMm}mm;`
          : `grid-column: 2; grid-row: 1; justify-content:${qrJustifyContent}; padding-top:${template.qrOffsetTopMm}mm;`
        : ''
    };
  }

  const columns = [
    hasBrandRail && template.brandPosition === 'left' ? `${template.railWidthMm}mm` : null,
    '1fr',
    hasQr ? `${template.qrColumnWidthMm}mm` : null,
    hasBrandRail && template.brandPosition === 'right' ? `${template.railWidthMm}mm` : null
  ].filter(Boolean).join(' ');

  return {
    cardColumns: columns,
    cardRows: '1fr',
    brandStyle: template.brandPosition === 'left'
      ? `border-right: 1px solid ${template.borderColor}; justify-content:flex-start; align-items:center;`
      : `border-left: 1px solid ${template.borderColor}; justify-content:flex-start; align-items:center;`,
    brandInnerStyle: 'writing-mode: vertical-rl; transform: rotate(180deg);',
    mainStyle: 'grid-column: auto; grid-row: 1;',
    qrStyle: hasQr ? `grid-column: auto; grid-row: 1; justify-content:${qrJustifyContent}; padding-top:${template.qrOffsetTopMm}mm;` : ''
  };
};

export const buildLabelPrintMarkup = (record, templateInput, lang = 'tr') => {
  const template = getResolvedLabelMetrics(templateInput);
  const visibleFieldIds = getVisibleFieldIds(template);
  const publicUrl = buildPublicUrl(record);
  const layout = getCardLayout(template);
  const frame = getFramePresentation(template, 'mm');
  const scanText = getScanText(template, lang);

  const rowsMarkup = visibleFieldIds.map((fieldId) => {
    const definition = getFieldDefinition(fieldId);
    const value = normalizeLabelText(getFieldValue(record, fieldId), lang);
    const valueClass = definition.compact ? 'composition-value' : 'value';
    const labelClass = definition.compact ? 'label composition-label' : 'label';

    return `
      <div class="${labelClass}">${normalizeLabelText(getFieldLabel(fieldId, lang), lang)}:</div>
      <div class="${valueClass}">${value}</div>
    `;
  }).join('');

  const careIconsMarkup = template.showCareIcons
    ? template.careIcons
        .filter((icon) => icon.enabled && icon.label)
        .map((icon) => `<div class="wash-icon" title="${icon.title || icon.label}">${normalizeLabelText(icon.label, lang)}</div>`)
        .join('')
    : '';

  return `
    <div class="sheet">
      <div class="card">
        ${frame.showInnerFrame ? `<div class="frame-inner" style="inset:${frame.innerFrameStyle.inset}; border:${frame.innerFrameStyle.border}; border-radius:${frame.innerFrameStyle.borderRadius};"></div>` : ''}
        ${frame.showCorners ? `
          <div class="frame-corner top-left" style="width:${frame.cornerStyle.width}; height:${frame.cornerStyle.height}; border-color:${frame.cornerStyle.borderColor}; border-width:${frame.cornerStyle.borderWidth}; border-radius:${frame.cornerStyle.borderRadius};"></div>
          <div class="frame-corner top-right" style="width:${frame.cornerStyle.width}; height:${frame.cornerStyle.height}; border-color:${frame.cornerStyle.borderColor}; border-width:${frame.cornerStyle.borderWidth}; border-radius:${frame.cornerStyle.borderRadius};"></div>
          <div class="frame-corner bottom-left" style="width:${frame.cornerStyle.width}; height:${frame.cornerStyle.height}; border-color:${frame.cornerStyle.borderColor}; border-width:${frame.cornerStyle.borderWidth}; border-radius:${frame.cornerStyle.borderRadius};"></div>
          <div class="frame-corner bottom-right" style="width:${frame.cornerStyle.width}; height:${frame.cornerStyle.height}; border-color:${frame.cornerStyle.borderColor}; border-width:${frame.cornerStyle.borderWidth}; border-radius:${frame.cornerStyle.borderRadius};"></div>
        ` : ''}
        ${template.showBrandRail ? `
          <div class="brand-rail" style="${layout.brandStyle}">
            <div class="brand" style="${layout.brandInnerStyle}">${normalizeLabelText(template.brandName, lang)}</div>
          </div>
        ` : ''}
        <div class="left" style="${layout.mainStyle}">
          <div class="grid">${rowsMarkup}</div>
          ${template.showCareIcons && careIconsMarkup ? `<div class="wash">${careIconsMarkup}</div>` : ''}
        </div>
        ${template.showQr ? `
          <div class="qr" style="${layout.qrStyle}">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(publicUrl)}" alt="QR" />
            ${scanText ? `<div class="scan">${normalizeLabelText(scanText, lang)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

export const buildLabelPrintDocument = (records, templateInput, lang = 'tr') => {
  const template = getResolvedLabelMetrics(templateInput);
  const layout = getCardLayout(template);
  const frame = getFramePresentation(template, 'mm');
  const content = records.map((record) => buildLabelPrintMarkup(record, template, lang)).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Kartelix Etiket</title>
      <style>
        @page { size: ${template.outerWidthMm}mm ${template.outerHeightMm}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          background: ${template.backgroundColor};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .sheet {
          width: ${template.outerWidthMm}mm;
          height: ${template.outerHeightMm}mm;
          padding: ${template.pageMarginTopMm}mm ${template.pageMarginRightMm}mm ${template.pageMarginBottomMm}mm ${template.pageMarginLeftMm}mm;
          page-break-after: always;
        }
        .sheet:last-child { page-break-after: auto; }
        .card {
          width: ${template.cardWidthMm}mm;
          height: ${template.cardHeightMm}mm;
          border: ${frame.border};
          padding: ${template.paddingMm}mm;
          display: grid;
          grid-template-columns: ${layout.cardColumns};
          grid-template-rows: ${layout.cardRows};
          gap: ${template.contentGapMm}mm;
          background: ${template.backgroundColor};
          border-radius: ${template.borderRadiusMm}mm;
          position: relative;
          overflow: hidden;
        }
        .frame-inner { position:absolute; pointer-events:none; }
        .frame-corner {
          position:absolute;
          pointer-events:none;
          border-style:solid;
        }
        .frame-corner.top-left { top:0; left:0; border-right:none; border-bottom:none; }
        .frame-corner.top-right { top:0; right:0; border-left:none; border-bottom:none; }
        .frame-corner.bottom-left { bottom:0; left:0; border-right:none; border-top:none; }
        .frame-corner.bottom-right { bottom:0; right:0; border-left:none; border-top:none; }
        .brand-rail { display:flex; padding-left:.1mm; padding-right:.1mm; }
        .brand { font-size: 5.4pt; font-weight: 800; letter-spacing: ${template.brandLetterSpacing}em; }
        .left { min-width: 0; align-self: start; }
        .grid {
          display:grid;
          grid-template-columns: ${template.labelColumnMm}mm 1fr;
          row-gap: ${template.rowGapMm}mm;
          column-gap: ${template.columnGapMm}mm;
          font-size: ${template.bodyFontPt}pt;
          line-height: ${template.bodyLineHeight};
          align-items: start;
          align-content: start;
        }
        .label,
        .value,
        .composition-value {
          display: block;
          margin: 0;
          padding: 0;
          line-height: inherit;
        }
        .label {
          min-width: 0;
          font-weight: 700;
          white-space: nowrap;
          word-break: normal;
          overflow-wrap: normal;
          align-self: start;
        }
        .value { min-width:0; word-break: break-word; overflow-wrap: anywhere; align-self: start; }
        .composition-label { grid-column: 1; }
        .composition-value { grid-column: 2; min-width:0; overflow-wrap:anywhere; font-size:${template.compactFontPt}pt; align-self: start; }
        .wash {
          display:grid;
          grid-template-columns: repeat(${Math.max(template.careIcons.filter((icon) => icon.enabled && icon.label).length, 1)}, minmax(0, 1fr));
          gap:${template.careGapMm}mm;
          margin-top:${template.careTopGapMm}mm;
        }
        .wash-icon { height:4mm; border:.3mm solid ${template.borderColor}; border-radius:${template.borderRadiusMm}mm; display:flex; align-items:center; justify-content:center; font-size:2.65pt; font-weight:700; }
        .qr { display:flex; flex-direction:column; align-items:flex-end; justify-content:flex-start; align-self:start; text-align:center; min-width:0; }
        .qr img { width:${template.qrSizeMm}mm; height:${template.qrSizeMm}mm; }
        .scan { font-size:4.2pt; font-weight:800; margin-top:.55mm; line-height:1; transform:none; align-self:center; }
      </style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = function () {
          var images = Array.prototype.slice.call(document.images || []);
          var pending = images.filter(function (img) { return !img.complete; });

          var triggerPrint = function () {
            setTimeout(function () { window.print(); }, 150);
          };

          if (pending.length === 0) {
            triggerPrint();
            return;
          }

          var resolved = 0;
          var done = function () {
            resolved += 1;
            if (resolved >= pending.length) {
              triggerPrint();
            }
          };

          pending.forEach(function (img) {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });

          setTimeout(triggerPrint, 1200);
        };
      </script>
    </body>
    </html>
  `;
};

export const printLabels = (records, template, lang = 'tr') => {
  const safeRecords = (records || []).filter(Boolean);
  if (safeRecords.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=900,height=720');
  if (!printWindow) return;

  printWindow.document.write(buildLabelPrintDocument(safeRecords, template, lang));
  printWindow.document.close();
};
