import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const normalizeText = (value) =>
  String(value || '-')
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ü/g, 'U')
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O');

const washIcons = [
  { label: '30', title: '30°C yıkama' },
  { label: 'X', title: 'Çamaşır suyu yok' },
  { label: 'I', title: 'Düşük ısı ütü' },
  { label: 'D', title: 'Kurutma yok' },
  { label: 'P', title: 'Kuru temizleme' }
];

const MamulEtiketModal = ({ mamul, onClose }) => {
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

  const handlePrint = (lang = 'tr') => {
    const labels = lang === 'tr'
      ? {
          article: 'ARTICLE NO',
          product: 'MAMUL',
          composition: 'KOMPOZISYON',
          width: 'EN',
          weight: 'GRAMAJ',
          type: 'TUR',
          color: 'RENK',
          scan: '↗ BENI TARA'
        }
      : {
          article: 'ARTICLE NO',
          product: 'PRODUCT',
          composition: 'COMPOSITION',
          width: 'WIDTH',
          weight: 'WEIGHT',
          type: 'TYPE',
          color: 'COLOR',
          scan: '↗ SCAN ME'
        };

    const printWindow = window.open('', '_blank', 'width=420,height=320');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${mamul.article_code}</title>
        <style>
          @page { size: 90mm 60mm; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; background: #fff; }
          .sheet { width: 90mm; height: 60mm; padding: 2mm; }
          .card { width: 86mm; height: 56mm; border: 1px solid #111827; padding: 2mm; display: grid; grid-template-columns: 4mm 1fr 15mm; gap: 1.4mm; }
          .brand-rail { display:flex; align-items:center; justify-content:flex-start; padding-left: .1mm; border-right: 1px solid #111827; }
          .brand { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 5.8pt; font-weight: 800; letter-spacing: .06em; }
          .left { min-width: 0; }
          .grid { display: grid; grid-template-columns: 11mm 1fr; gap: 0.55mm; font-size: 5.55pt; line-height: 1.06; }
          .label { font-weight: 700; }
          .value { min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
          .composition-label { grid-column: 1; }
          .composition-value { grid-column: 2; min-width: 0; word-break: normal; overflow-wrap: anywhere; line-height: 1.06; font-size: 5.2pt; }
          .qr { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; text-align: center; }
          .qr img { width: 13.75mm; height: 13.75mm; }
          .scan { font-size: 4.8pt; font-weight: 800; margin-top: 0.7mm; transform: rotate(-7deg); align-self: center; }
          .wash { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:.8mm; margin-top:1mm; }
          .wash-icon { height: 4.6mm; border: .35mm solid #111827; border-radius: .8mm; display:flex; align-items:center; justify-content:center; font-size: 2.85pt; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="card">
            <div class="brand-rail"><div class="brand">KARTELIX</div></div>
            <div class="left">
              <div class="grid">
                <div class="label">${labels.article}:</div><div class="value">${normalizeText(mamul.article_code)}</div>
                <div class="label">${labels.product}:</div><div class="value">${normalizeText(mamul.mamul_adi)}</div>
                <div class="label composition-label">${labels.composition}:</div><div class="composition-value">${normalizeText(mamul.kompozisyon_ozeti)}</div>
                <div class="label">${labels.width}:</div><div class="value">${normalizeText(mamul.en)}</div>
                <div class="label">${labels.weight}:</div><div class="value">${normalizeText(mamul.gramaj)}</div>
                <div class="label">${labels.type}:</div><div class="value">${normalizeText(mamul.mamul_turu_adi)}</div>
                <div class="label">${labels.color}:</div><div class="value">${normalizeText(mamul.renk)}</div>
              </div>
              <div class="wash">
                ${washIcons.map((icon) => `<div class="wash-icon">${icon.label}</div>`).join('')}
              </div>
            </div>
            <div class="qr">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(publicUrl)}" alt="QR" />
              <div class="scan">${labels.scan}</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function () {
            setTimeout(function () {
              window.print();
              setTimeout(function () { window.close(); }, 800);
            }, 300);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Kartelix / Etiket</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{mamul.article_code}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
          >
            Kapat
          </button>
        </div>

        <div className="p-6">
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <div className="grid min-h-[15rem] grid-cols-[1.55rem,1fr,4.1rem] gap-2.5">
              <div className="flex items-center justify-start border-r border-slate-300 pl-0.5">
                <div className="rotate-180 text-[8px] font-extrabold tracking-[0.06em] text-slate-900 [writing-mode:vertical-rl]">
                  KARTELIX
                </div>
              </div>
              <div className="min-w-0">
                <div className="mt-2.5 grid grid-cols-[60px,1fr] gap-x-1.5 gap-y-0.5 text-[9.25px] leading-[1.05] text-slate-700">
                  <div className="font-semibold text-slate-900">Article No:</div>
                  <div className="min-w-0 break-words">{mamul.article_code}</div>
                  <div className="font-semibold text-slate-900">Mamul:</div>
                  <div className="min-w-0 break-words">{mamul.mamul_adi || '-'}</div>
                  <div className="font-semibold text-slate-900">Kompozisyon:</div>
                  <div className="min-w-0 break-words text-[8.4px] leading-[1.02]">{mamul.kompozisyon_ozeti || '-'}</div>
                  <div className="font-semibold text-slate-900">En:</div>
                  <div>{mamul.en || '-'}</div>
                  <div className="font-semibold text-slate-900">Gramaj:</div>
                  <div>{mamul.gramaj || '-'}</div>
                  <div className="font-semibold text-slate-900">Tur:</div>
                  <div>{mamul.mamul_turu_adi || '-'}</div>
                  <div className="font-semibold text-slate-900">Renk:</div>
                  <div>{mamul.renk || '-'}</div>
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                  {washIcons.map((icon) => (
                    <div key={icon.title} title={icon.title} className="flex h-6 items-center justify-center rounded-md border border-slate-400 text-[9px] font-bold text-slate-700">
                      {icon.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex w-[4.5rem] flex-col items-end justify-center">
                <QRCodeSVG value={publicUrl} size={64} />
                <div className="mt-1.5 -rotate-[7deg] text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                  ↗ Beni Tara
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Bu etiket QR okutuldugunda ziyaretciyi public urun sayfasina goturur.
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Public sayfayi ac
            </a>
            <button
              type="button"
              onClick={() => handlePrint('tr')}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Yazdir (TR)
            </button>
            <button
              type="button"
              onClick={() => handlePrint('en')}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Print (EN)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MamulEtiketModal;
