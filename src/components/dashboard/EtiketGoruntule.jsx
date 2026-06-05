import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect } from 'react';

const EtiketGoruntule = ({ siparis, firma, onClose, onEdit, onDelete }) => {
  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Dışarı tıklama ile kapatma
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!siparis) return null;

  const formatNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2).replace(/\.00$/, '') : value;
  };

  const toUpperClean = (text) =>
    text
      ?.toString()
      .toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/Ü/g, 'U')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/Ş/g, 'S')
      .replace(/Ö/g, 'O');

  const yazdir = (lang = 'tr') => {
    const isTR = lang === 'tr';
    const labels = isTR
      ? {
          tarih: 'TARİH',
          adet: 'ADET',
          mamul: 'MAMÜL',
          kod: 'KOD',
          kompozisyon: 'KOMPOZİSYON',
          en: 'EN',
          gramaj: 'GRAMAJ',
          tip: 'TIP',
          firma: 'FİRMA'
        }
      : {
          tarih: 'DATE',
          adet: 'QUANTITY',
          mamul: 'FABRIC NAME',
          kod: 'ARTICLE NO',
          kompozisyon: 'COMPOSITION',
          en: 'WIDTH',
          gramaj: 'WEIGHT',
          tip: 'TYPE',
          firma: 'COMPANY'
        };

    const firmaAdi = firma?.ad || siparis.firmaAd || '-';
    const qrData = `https://karboy.com/etiket/${siparis.articleNo}`;

    const içerik = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ETIKET - ${siparis.articleNo}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 90mm 60mm;
            margin: 0;
            padding: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 90mm;
            height: 60mm;
            margin: 0;
            padding: 2mm;
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: white;
            font-size: 7.5pt;
            line-height: 1.1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .etiket-container {
            width: 86mm;
            height: 56mm;
            display: flex;
            border: 0.5px solid #000;
            padding: 2mm;
            gap: 2mm;
          }
          .bilgiler {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .bilgi-grid {
            display: grid;
            grid-template-columns: 20mm 1fr;
            gap: 0.4mm;
            align-items: start;
          }
          .label {
            font-weight: bold;
            text-align: left;
            align-self: start;
          }
          .value {
            text-align: left;
            align-self: start;
          }
          .label,
          .value {
            display: block;
            margin: 0;
            padding: 0;
            line-height: inherit;
          }
          .firma-adi {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 1.5mm;
            text-align: center;
            border-bottom: 0.5px solid #000;
            padding-bottom: 0.5mm;
          }
          .tolerans-not {
            font-size: 6pt;
            color: #666;
            margin-top: 1.5mm;
            text-align: center;
            font-style: italic;
            grid-column: 1 / -1;
          }
          .qr-container {
            width: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .qr-code {
            width: 16mm !important;
            height: 16mm !important;
          }
          .qr-text {
            font-size: 5.5pt;
            margin-top: 0.5mm;
            text-align: center;
            font-weight: bold;
          }
          .footer {
            position: absolute;
            bottom: 2mm;
            left: 2mm;
            right: 2mm;
            text-align: center;
            font-size: 5.5pt;
            font-weight: bold;
            color: #333;
          }
          
          @media print {
            body {
              margin: 0 !important;
              padding: 2mm !important;
            }
            .etiket-container {
              border: 0.5px solid #000 !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="etiket-container">
          <!-- Sol Taraf - Bilgiler -->
          <div class="bilgiler">
            <div class="firma-adi">${toUpperClean(firmaAdi)}</div>
            
            <div class="bilgi-grid">
              <div class="label">${labels.tarih}:</div>
              <div class="value">${toUpperClean(siparis.tarih || '-')}</div>
              
<div class="label">${labels.adet}:</div>
               <div class="value">${formatNumber(siparis.adet || 0)}</div>
               
               <div class="label">${labels.mamul}:</div>
               <div class="value">${toUpperClean(siparis.mamul || '-')}</div>
               
               <div class="label">${labels.kod}:</div>
               <div class="value">${toUpperClean(siparis.articleNo || '-')}</div>
               
               <div class="label">${labels.kompozisyon}:</div>
               <div class="value">${toUpperClean(siparis.kompozisyon || '-')}</div>
               
               <div class="label">${labels.en}:</div>
               <div class="value">${formatNumber(siparis.en || 0)} CM</div>
               
               <div class="label">${labels.gramaj}:</div>
               <div class="value">${formatNumber(siparis.gramaj || 0)} GR/M²</div>
              
              <div class="label">${labels.tip}:</div>
              <div class="value">${toUpperClean(siparis.tip || '-')}</div>
              
              <div class="tolerans-not">
                ${isTR ? 
                  'EN: +/- 2 CM | GRAMAJ: +/- %5' : 
                  'WIDTH: +/- 2 CM | WEIGHT: +/- 5%'
                }
              </div>
            </div>
          </div>
          
          <!-- Sağ Taraf - QR Kod -->
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}" 
                 class="qr-code" 
                 alt="QR Code" />
            <div class="qr-text">
              ${isTR ? 'TARA' : 'SCAN'}
            </div>
          </div>
        </div>
        
        <!-- Footer -->
<div class="footer">
           NEVRES TEKSTİL SAN. TİC. A.Ş. - www.karboy.com
         </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const pencere = window.open('', '_blank', 'width=400,height=300');
    pencere.document.write(içerik);
    pencere.document.close();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Kartela Görüntüle - {siparis.articleNo}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Etiket Önizleme */}
        <div className="p-6">
          <div className="etiket-preview border-2 border-gray-200 rounded-lg bg-white p-4 flex justify-center">
            {/* 90x60mm Compact Önizleme */}
            <div className="mx-auto" style={{ width: '270px', height: '180px' }}>
              <div className="etiket-container border border-gray-800 bg-white w-full h-full flex p-2 gap-3">
                {/* Sol - Bilgiler */}
                <div className="bilgiler flex-1 flex flex-col">
                  <div className="firma-adi text-sm font-bold text-center border-b border-gray-800 pb-1 mb-2">
                    {firma?.ad || siparis.firmaAd || 'Firma Adı'}
                  </div>
                  
                  {/* Grid Layout - Başlıklar SOLA YASLI */}
                  <div className="bilgi-grid grid grid-cols-[80px,1fr] gap-1 text-[11px]">
                    <div className="label text-left font-bold">Tarih:</div>
                    <div className="value">{siparis.tarih || '-'}</div>
                    
                    <div className="label text-left font-bold">Adet:</div>
                    <div className="value">{siparis.adet || '-'}</div>
                    
                    <div className="label text-left font-bold">Mamül:</div>
                    <div className="value truncate">{siparis.mamul || '-'}</div>
                    
                    <div className="label text-left font-bold">Kod:</div>
                    <div className="value truncate">{siparis.articleNo || '-'}</div>
                    
                    <div className="label text-left font-bold">Kompozisyon:</div>
                    <div className="value truncate">{siparis.kompozisyon || '-'}</div>
                    
                    <div className="label text-left font-bold">En:</div>
                    <div className="value">{siparis.en || '-'} cm</div>
                    
                    <div className="label text-left font-bold">Gramaj:</div>
                    <div className="value">{siparis.gramaj || '-'} gr/m²</div>
                    
                    <div className="label text-left font-bold">Tip:</div>
                    <div className="value">{siparis.tip || '-'}</div>
                    
                    <div className="tolerans-not text-[10px] text-gray-600 text-center italic col-span-2 mt-2">
                      EN: +/- 2 CM | GRAMAJ: +/- %5
                    </div>
                  </div>
                </div>

                {/* Sağ - QR Kod (DAHA KÜÇÜK ve ÇİZGİSİZ) */}
                <div className="qr-container w-16 flex flex-col items-center justify-center">
                  <QRCodeSVG
                    value={`https://karboy.com/etiket/${siparis.articleNo}`}
                    size={45}
                    className="qr-code"
                  />
                  <div className="qr-text text-[9px] font-bold mt-1 text-center">
                    TARA
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="footer text-center text-[9px] font-bold text-gray-700 mt-1">
NEVRES TEKSTİL SAN. TİC. A.Ş. - www.karboy.com
              </div>
            </div>
          </div>

          {/* Butonlar */}
          <div className="mt-6 flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(siparis)}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Düzenle
              </button>
              <button
                onClick={() => onDelete(siparis.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm font-medium transition-colors shadow-sm"
              >
                🗑️ Sil
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => yazdir('tr')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
              >
                🖨️ Yazdır (TR)
              </button>
              <button
                onClick={() => yazdir('en')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
              >
                🖨️ Print (EN)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EtiketGoruntule;
