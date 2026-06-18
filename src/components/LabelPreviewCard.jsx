import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  buildPublicUrl,
  getFieldDefinition,
  getFramePresentation,
  getFieldLabel,
  getFieldValue,
  getResolvedLabelMetrics,
  getVisibleFieldIds,
  normalizeLabelText,
  resolveColorHex,
  extractColorName
} from '../utils/labelTemplate';

const PX_PER_MM = 96 / 25.4;
const PX_PER_PT = 96 / 72;

const ColorSwatch = ({ hex, size = 14 }) => {
  if (!hex) return null;
  return (
    <span
      className="inline-block rounded-sm border border-gray-300"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: hex,
        marginLeft: '4px',
        verticalAlign: 'middle',
        display: 'inline-block'
      }}
      title="Renk örneği"
    />
  );
};

const LabelPreviewCard = ({ record, template: templateInput, lang = 'tr', className = '' }) => {
  const template = getResolvedLabelMetrics(templateInput);
  const visibleFieldIds = getVisibleFieldIds(template);
  const careIcons = template.careIcons.filter((icon) => icon.enabled && icon.label);
  const scanText = String(lang === 'en' ? template.scanTextEn : template.scanTextTr || '').trim();
  const frame = getFramePresentation(template, 'px');
  const shellRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const stageWidthPx = template.outerWidthMm * PX_PER_MM;
  const stageHeightPx = template.outerHeightMm * PX_PER_MM;
  const cardPaddingPx = template.paddingMm * PX_PER_MM;
  const pageMarginTopPx = template.pageMarginTopMm * PX_PER_MM;
  const pageMarginRightPx = template.pageMarginRightMm * PX_PER_MM;
  const pageMarginBottomPx = template.pageMarginBottomMm * PX_PER_MM;
  const pageMarginLeftPx = template.pageMarginLeftMm * PX_PER_MM;
  const cardWidthPx = template.cardWidthMm * PX_PER_MM;
  const cardHeightPx = template.cardHeightMm * PX_PER_MM;
  const brandPx = template.railWidthMm * PX_PER_MM;
  const qrColumnPx = template.qrColumnWidthMm * PX_PER_MM;
  const labelColumnPx = template.labelColumnMm * PX_PER_MM;
  const contentGapPx = template.contentGapMm * PX_PER_MM;
  const rowGapPx = template.rowGapMm * PX_PER_MM;
  const columnGapPx = template.columnGapMm * PX_PER_MM;
  const careGapPx = template.careGapMm * PX_PER_MM;
  const careTopGapPx = template.careTopGapMm * PX_PER_MM;
  const bodyFontPx = template.bodyFontPt * PX_PER_PT;
  const compactFontPx = template.compactFontPt * PX_PER_PT;
  const brandFontPx = template.brandFontPt * PX_PER_PT;
  const scanFontPx = 4.2 * PX_PER_PT;
  const careFontPx = 2.65 * PX_PER_PT;
  const qrSizePx = template.qrSizeMm * PX_PER_MM;
  const qrOffsetTopPx = template.qrOffsetTopMm * PX_PER_MM;
  const careHeightPx = 4 * PX_PER_MM;
  const columns = [
    template.showBrandRail && template.brandPosition === 'left' ? `${brandPx}px` : null,
    'minmax(0,1fr)',
    template.showQr ? `${qrColumnPx}px` : null,
    template.showBrandRail && template.brandPosition === 'right' ? `${brandPx}px` : null
  ].filter(Boolean);
  const isVerticalBrand = template.brandPosition === 'left' || template.brandPosition === 'right';
  const previewGridColumns = columns.join(' ');
  const topBottomRows = template.showBrandRail && (template.brandPosition === 'top' || template.brandPosition === 'bottom');
  const availableWidth = Math.max(containerWidth - 16, Math.min(stageWidthPx, containerWidth));
  const previewScale = availableWidth / stageWidthPx;

  useEffect(() => {
    if (!shellRef.current || typeof ResizeObserver === 'undefined') return undefined;

    const node = shellRef.current;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || 0;
      setContainerWidth(nextWidth);
    });

    observer.observe(node);
    setContainerWidth(node.getBoundingClientRect().width || 0);

    return () => observer.disconnect();
  }, []);

  if (!record) {
    return (
      <div className={`app-label-preview-empty ${className}`}>
        Tasarım önizlemesi için listeden gerçek bir mamül seçin.
      </div>
    );
  }

  return (
    <div ref={shellRef} className={`app-label-preview-shell ${className}`}>
      <div
        className="app-label-preview-stage"
        style={{ height: `${stageHeightPx * previewScale}px`, width: `${containerWidth || stageWidthPx}px` }}
      >
        <div
          className="app-label-preview-sheet"
          style={{
            width: `${containerWidth || stageWidthPx}px`,
            height: `${stageHeightPx * previewScale}px`,
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left'
          }}
        >
          <div
            className="app-label-preview-card"
            style={{
              width: `${cardWidthPx}px`,
              height: `${cardHeightPx}px`,
              background: template.backgroundColor,
              fontFamily: 'Arial, Helvetica, sans-serif',
              gridTemplateColumns: topBottomRows ? (template.showQr ? `minmax(0,1fr) ${qrColumnPx}px` : 'minmax(0,1fr)') : previewGridColumns,
              gridTemplateRows: topBottomRows ? `${brandPx}px 1fr` : '1fr',
              gap: `${contentGapPx}px`,
              padding: `${cardPaddingPx}px`,
              marginTop: `${pageMarginTopPx}px`,
              marginRight: `${pageMarginRightPx}px`,
              marginBottom: `${pageMarginBottomPx}px`,
              marginLeft: `${pageMarginLeftPx}px`,
              borderRadius: `${template.borderRadiusMm * PX_PER_MM}px`,
              border: frame.border
            }}
          >
            {frame.showInnerFrame ? (
              <div className="app-label-preview-frame" style={frame.innerFrameStyle} />
            ) : null}
            {frame.showCorners ? (
              <>
                <div className="app-label-preview-corner is-top-left" style={frame.cornerStyle} />
                <div className="app-label-preview-corner is-top-right" style={frame.cornerStyle} />
                <div className="app-label-preview-corner is-bottom-left" style={frame.cornerStyle} />
                <div className="app-label-preview-corner is-bottom-right" style={frame.cornerStyle} />
              </>
            ) : null}
            {template.showBrandRail ? (
              <div
                className={`app-label-preview-rail ${template.brandPosition === 'right' ? 'is-right' : ''} ${template.brandPosition === 'top' || template.brandPosition === 'bottom' ? 'is-horizontal' : ''}`}
                style={{
                  borderColor: template.borderColor,
                  gridColumn: topBottomRows ? '1 / -1' : 'auto',
                  gridRow: topBottomRows ? (template.brandPosition === 'top' ? '1' : '2') : '1'
                }}
              >
                <div
                  className={`app-label-preview-brand ${isVerticalBrand ? '' : 'is-horizontal'}`}
                  style={{ letterSpacing: `${template.brandLetterSpacing}em`, color: template.accentColor, fontSize: `${brandFontPx}px` }}
                >
                  {normalizeLabelText(template.brandName, lang)}
                </div>
              </div>
            ) : null}

            <div
              className="app-label-preview-main"
              style={{
                gridColumn: topBottomRows ? '1' : 'auto',
                gridRow: topBottomRows ? (template.brandPosition === 'top' ? '2' : '1') : '1'
              }}
            >
              <div
                className="app-label-preview-grid"
                style={{
                  gridTemplateColumns: `${labelColumnPx}px minmax(0,1fr)`,
                  rowGap: `${rowGapPx}px`,
                  columnGap: `${columnGapPx}px`,
                  fontSize: `${bodyFontPx}px`,
                  lineHeight: template.bodyLineHeight
                }}
              >
                {visibleFieldIds.map((fieldId) => {
                  const field = getFieldDefinition(fieldId);
                  const isRenkField = fieldId === 'renk';
                  const colorHex = isRenkField ? resolveColorHex(record) : null;
                  const rawValue = isRenkField && record?.renk ? extractColorName(record.renk) : getFieldValue(record, fieldId);
                  const displayValue = normalizeLabelText(rawValue, lang);
                  return (
                    <React.Fragment key={fieldId}>
                      <div className={`app-label-preview-key ${field.compact ? 'is-compact' : ''}`}>{normalizeLabelText(getFieldLabel(fieldId, lang), lang)}:</div>
                      <div
                        className={`app-label-preview-value ${field.compact ? 'is-compact' : ''} ${isRenkField ? 'relative' : ''}`}
                        style={field.compact ? { fontSize: `${compactFontPx}px` } : undefined}
                      >
                        {displayValue}
                        {isRenkField && colorHex ? <ColorSwatch hex={colorHex} size={12} /> : null}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {template.showCareIcons && careIcons.length ? (
                <div
                  className="app-label-preview-care-grid"
                  style={{
                    gridTemplateColumns: `repeat(${careIcons.length}, minmax(0, 1fr))`,
                    gap: `${careGapPx}px`,
                    marginTop: `${careTopGapPx}px`
                  }}
                >
                  {careIcons.map((icon) => (
                    <div
                      key={icon.id}
                      className="app-label-preview-care-item"
                      title={icon.title || icon.label}
                      style={{ borderColor: template.borderColor, minHeight: `${careHeightPx}px`, fontSize: `${careFontPx}px`, borderRadius: `${template.borderRadiusMm * PX_PER_MM}px` }}
                    >
                      {normalizeLabelText(icon.label, lang)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {template.showQr ? (
              <div
                className="app-label-preview-qr"
                style={{
                  gridColumn: topBottomRows ? '2' : 'auto',
                  gridRow: topBottomRows ? (template.brandPosition === 'top' ? '2' : '1') : '1',
                  justifyContent: template.qrVerticalAlign === 'bottom' ? 'flex-end' : template.qrVerticalAlign === 'center' ? 'center' : 'flex-start',
                  paddingTop: `${qrOffsetTopPx}px`
                }}
              >
                <QRCodeSVG value={buildPublicUrl(record)} size={64} style={{ width: `${qrSizePx}px`, height: `${qrSizePx}px` }} />
                {scanText ? (
                  <div className="app-label-preview-scan-text" style={{ fontSize: `${scanFontPx}px`, marginTop: `${0.55 * PX_PER_MM}px`, lineHeight: 1, transform: 'none' }}>
                    {normalizeLabelText(scanText, lang)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPreviewCard;