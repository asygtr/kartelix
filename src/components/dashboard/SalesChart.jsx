import React, { useState, useEffect } from 'react';

const SalesChart = () => {
  const [siparisler, setSiparisler] = useState([]);
  const [seciliSiparisler, setSeciliSiparisler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtre, setFiltre] = useState({
    baslangicTarihi: '',
    bitisTarihi: '',
    firma: '',
    tip: ''
  });
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [dil, setDil] = useState('tr'); // 'tr' veya 'en'

  // 🔹 Dil etiketleri
  const dilEtiketleri = {
    tr: {
      tarih: 'TARİH',
      adet: 'ADET',
      mamul: 'MAMÜL',
      kod: 'KOD',
      kompozisyon: 'KOMPOZİSYON',
      en: 'EN',
      gramaj: 'GRAMAJ',
      tip: 'TIP',
      firma: 'FİRMA',
      tara: 'TARA',
      tolerans: 'EN: +/- 2 CM | GRAMAJ: +/- %5',
      footer: 'NEVRES TEKSTİL SAN. TİC. A.Ş. - www.karboy.com'
    },
    en: {
      tarih: 'DATE',
      adet: 'QUANTITY',
      mamul: 'FABRIC NAME',
      kod: 'ARTICLE NO',
      kompozisyon: 'COMPOSITION',
      en: 'WIDTH',
      gramaj: 'WEIGHT',
      tip: 'TYPE',
      firma: 'COMPANY',
      tara: 'SCAN',
      tolerans: 'WIDTH: +/- 2 CM | WEIGHT: +/- 5%',
      footer: 'NEVRES TEXTILE INDUSTRY TRADE LTD. - www.karboy.com'
    }
  };

  // 🔹 Siparişleri yükle
  const loadSiparisler = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/siparisler');
      const data = await response.json();
      
      let kayitlar = [];
      if (Array.isArray(data)) kayitlar = data;
      else if (data?.success && Array.isArray(data.data)) kayitlar = data.data;
      else if (data?.data?.siparisler) kayitlar = data.data.siparisler;
      
      setSiparisler(kayitlar);
    } catch (err) {
      console.error('Siparişler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSiparisler();
  }, []);

  // 🔹 Arama sonuçları
  const aramaSonuclari = siparisler.filter(siparis => {
    if (!aramaTerimi.trim()) return false;
    
    const terim = aramaTerimi.toLowerCase();
    return (
      (siparis.articleNo && siparis.articleNo.toLowerCase().includes(terim)) ||
      (siparis.mamul && siparis.mamul.toLowerCase().includes(terim)) ||
      (siparis.firmaAd && siparis.firmaAd.toLowerCase().includes(terim)) ||
      (siparis.kompozisyon && siparis.kompozisyon.toLowerCase().includes(terim))
    );
  });

  // 🔹 Sipariş seçimi
  const handleSiparisSec = (siparis) => {
    if (seciliSiparisler.some(s => s.id === siparis.id)) {
      setSeciliSiparisler(prev => prev.filter(s => s.id !== siparis.id));
    } else {
      setSeciliSiparisler(prev => [...prev, siparis]);
    }
    setAramaTerimi('');
  };

  // 🔹 Tümünü seç
  const handleTumunuSec = () => {
    setSeciliSiparisler([...siparisler]);
  };

  // 🔹 Seçimi temizle
  const handleSecimiTemizle = () => {
    setSeciliSiparisler([]);
  };

  // 🔹 Sayı formatlama
  const formatNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2).replace(/\.00$/, '') : value;
  };

  // 🔹 Metni büyük harf ve temizle
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

  // 🔹 Tek bir etiket HTML'i oluştur
  const etiketHTMLOlustur = (siparis, dilSecimi = dil) => {
    const etiket = dilEtiketleri[dilSecimi];
    const firmaAdi = siparis.firmaAd || siparis.firma || '-';
    const qrData = `https://karboy.com/etiket/${siparis.articleNo}`;

    return `
      <div class="etiket-sayfasi" style="page-break-after: always;">
        <div class="etiket-container">
          <div class="bilgiler">
            <div class="firma-adi">${toUpperClean(firmaAdi)}</div>
            <div class="bilgi-grid">
<div class="label">${etiket.tarih}:</div><div class="value">${toUpperClean(siparis.tarih || '-')}</div>
               <div class="label">${etiket.adet}:</div><div class="value">${formatNumber(siparis.adet || 0)}</div>
               <div class="label">${etiket.mamul}:</div><div class="value">${toUpperClean(siparis.mamul || '-')}</div>
               <div class="label">${etiket.kod}:</div><div class="value">${toUpperClean(siparis.articleNo || '-')}</div>
               <div class="label">${etiket.kompozisyon}:</div><div class="value">${toUpperClean(siparis.kompozisyon || '-')}</div>
               <div class="label">${etiket.en}:</div><div class="value">${formatNumber(siparis.en || 0)} CM</div>
               <div class="label">${etiket.gramaj}:</div><div class="value">${formatNumber(siparis.gramaj || 0)} GR/M²</div>
               <div class="label">${etiket.tip}:</div><div class="value">${toUpperClean(siparis.tip || '-')}</div>
              <div class="tolerans-not">${etiket.tolerans}</div>
            </div>
          </div>
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}" 
                 class="qr-code" alt="QR Code" />
            <div class="qr-text">${etiket.tara}</div>
          </div>
        </div>
        <div class="footer">${etiket.footer}</div>
      </div>
    `;
  };

  // 🔹 Tüm etiketleri birleştir ve tek pencerede yazdır
  const topluYazdir = () => {
    if (seciliSiparisler.length === 0) {
      alert('Lütfen yazdırmak için sipariş seçin!');
      return;
    }

    // Tüm etiketleri birleştir
    const tumEtiketlerHTML = seciliSiparisler.map(siparis => 
      etiketHTMLOlustur(siparis)
    ).join('');

    const tamHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TOPLU ETİKETLER - ${seciliSiparisler.length} Adet</title>
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
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background: white;
          }
          .etiket-sayfasi {
            width: 90mm;
            height: 60mm;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .etiket-container {
            width: 86mm;
            height: 56mm;
            display: flex;
            border: 0.5px solid #000;
          }
          .bilgiler { 
            flex: 1; 
            padding: 2mm; 
            display: flex; 
            flex-direction: column; 
            font-size: 7.5pt;
          }
          .bilgi-grid { 
            display: grid; 
            grid-template-columns: 18mm 1fr; 
            gap: 0.3mm; 
          }
          .label { 
            font-weight: bold; 
            text-align: left; 
          }
          .value { 
            text-align: left; 
          }
          .firma-adi {
            font-size: 8pt; 
            font-weight: bold; 
            margin-bottom: 1mm; 
            text-align: center;
            border-bottom: 0.5px solid #000; 
            padding-bottom: 0.5mm;
          }
          .tolerans-not {
            font-size: 5.5pt; 
            color: #666; 
            margin-top: 1mm; 
            text-align: center;
            font-style: italic; 
            grid-column: 1 / -1;
          }
          .qr-container {
            width: 25mm; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            padding: 1mm;
            border-left: 0.5px solid #000; 
            background: #fafafa;
          }
          .qr-code { 
            width: 18mm !important; 
            height: 18mm !important; 
          }
          .qr-text { 
            font-size: 5.5pt; 
            margin-top: 0.5mm; 
            text-align: center; 
            font-weight: bold; 
          }
          .footer {
            text-align: center; 
            font-size: 5.5pt; 
            font-weight: bold; 
            color: #333;
            margin-top: 1mm;
          }

          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
            .etiket-sayfasi {
              page-break-after: always;
              page-break-inside: avoid;
            }
            .etiket-container {
              border: 0.5px solid #000 !important;
            }
          }

          @media screen {
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2mm;
              padding: 2mm;
              background: #f0f0f0;
            }
            .etiket-sayfasi {
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 2mm;
            }
          }
        </style>
      </head>
      <body>
        ${tumEtiketlerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                setTimeout(function() {
                  window.close();
                }, 1000);
              };
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    try {
      const pencere = window.open('', '_blank', 
        'width=400,height=600,scrollbars=yes,resizable=yes');
      
      if (!pencere || pencere.closed) {
        alert('Lütfen pop-up engelleyicinizi devre dışı bırakın ve tekrar deneyin.');
        return;
      }

      pencere.document.write(tamHTML);
      pencere.document.close();

      alert(`${seciliSiparisler.length} etiket ${dil === 'tr' ? 'Türkçe' : 'İngilizce'} olarak hazırlandı!`);

    } catch (error) {
      console.error('Toplu yazdırma hatası:', error);
      alert('Toplu yazdırma sırasında bir hata oluştu.');
    }
  };

  // 🔹 Tekil yazdırma
  const tekilYazdir = (siparis) => {
    const tekHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ETIKET - ${siparis.articleNo}</title>
        <meta charset="UTF-8">
        <style>
          @page { size: 90mm 60mm; margin: 0; padding: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 90mm; height: 60mm; margin: 0; padding: 2mm; font-family: 'Arial', sans-serif; background: white; font-size: 7.5pt; }
          .etiket-container { width: 86mm; height: 56mm; display: flex; border: 0.5px solid #000; }
          .bilgiler { flex: 1; padding: 2mm; display: flex; flex-direction: column; }
          .bilgi-grid { display: grid; grid-template-columns: 18mm 1fr; gap: 0.3mm; }
          .label { font-weight: bold; text-align: left; }
          .value { text-align: left; }
          .firma-adi { font-size: 8pt; font-weight: bold; margin-bottom: 1mm; text-align: center; border-bottom: 0.5px solid #000; padding-bottom: 0.5mm; }
          .tolerans-not { font-size: 5.5pt; color: #666; margin-top: 1mm; text-align: center; font-style: italic; grid-column: 1 / -1; }
          .qr-container { width: 25mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1mm; border-left: 0.5px solid #000; background: #fafafa; }
          .qr-code { width: 18mm !important; height: 18mm !important; }
          .qr-text { font-size: 5.5pt; margin-top: 0.5mm; text-align: center; font-weight: bold; }
          .footer { position: absolute; bottom: 2mm; left: 2mm; right: 2mm; text-align: center; font-size: 5.5pt; font-weight: bold; color: #333; }
          @media print { body { margin: 0 !important; padding: 2mm !important; } .etiket-container { border: 0.5px solid #000 !important; } }
        </style>
      </head>
      <body>
        ${etiketHTMLOlustur(siparis)}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    try {
      const pencere = window.open('', '_blank', 'width=400,height=300');
      if (pencere) {
        pencere.document.write(tekHTML);
        pencere.document.close();
      }
    } catch (error) {
      alert('Yazdırma sırasında bir hata oluştu.');
    }
  };

  // 🔹 Seçili siparişi listeden kaldır
  const seciliSiparisiKaldir = (siparis) => {
    setSeciliSiparisler(prev => prev.filter(s => s.id !== siparis.id));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow w-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">🖨️ Toplu Etiket Yazdırma</h3>

      {/* Dil Seçimi ve Kontrol Paneli */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Dil Seçimi */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Dil:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setDil('tr')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  dil === 'tr' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🇹🇷 Türkçe
              </button>
              <button
                onClick={() => setDil('en')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  dil === 'en' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          {/* Kontrol Butonları */}
          <div className="flex gap-2">
            <button
              onClick={handleTumunuSec}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Tümünü Seç
            </button>
            <button
              onClick={handleSecimiTemizle}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Seçimi Temizle
            </button>
          </div>
          
          <div className="text-sm font-medium">
            <span className="text-blue-600">{seciliSiparisler.length}</span> sipariş seçildi
          </div>

          {/* Tek Yazdırma Butonu */}
          <button
            onClick={topluYazdir}
            disabled={seciliSiparisler.length === 0}
            className={`px-4 py-1 rounded text-sm font-medium ${
              seciliSiparisler.length === 0 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            🖨️ {dil === 'tr' ? 'Türkçe Yazdır' : 'English Print'}
          </button>
        </div>
      </div>

      {/* Arama Kutusu */}
      <div className="mb-4">
        <input
          type="text"
          value={aramaTerimi}
          onChange={e => setAramaTerimi(e.target.value)}
          placeholder="Kayıt No, Mamül, Firma veya Kompozisyon ile ara..."
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Arama Sonuçları */}
      {aramaTerimi.trim() && (
        <div className="mb-4 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Arama Sonuçları</span>
          </div>
          {aramaSonuclari.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {aramaSonuclari.map((siparis) => (
                <div
                  key={siparis.id}
                  className="p-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => handleSiparisSec(siparis)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-600 text-sm">{siparis.articleNo}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {siparis.tip || 'Tip Belirtilmemiş'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {siparis.mamul} • {siparis.firmaAd || 'Firma Belirtilmemiş'}
                    </div>
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    {seciliSiparisler.some(s => s.id === siparis.id) ? '✓ Seçildi' : 'Seçmek için tıkla'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              Arama kriterlerinize uygun sipariş bulunamadı.
            </div>
          )}
        </div>
      )}

      {/* Seçili Siparişler Listesi */}
      {seciliSiparisler.length > 0 && (
        <div className="mb-4 border border-green-200 rounded-lg">
          <div className="p-2 bg-green-50 border-b border-green-200">
            <span className="text-sm font-medium text-green-700">
              Seçili Siparişler ({seciliSiparisler.length}) - {dil === 'tr' ? 'Türkçe' : 'English'} yazdırılacak
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {seciliSiparisler.map((siparis, index) => (
              <div
                key={siparis.id}
                className="p-3 border-b border-green-100 bg-green-25 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-green-700 text-sm">{siparis.articleNo}</span>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                      {siparis.tip || 'Tip Belirtilmemiş'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {siparis.mamul} • {siparis.firmaAd || 'Firma Belirtilmemiş'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => tekilYazdir(siparis)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    title={dil === 'tr' ? 'Tekil Yazdır' : 'Single Print'}
                  >
                    🖨️
                  </button>
                  <button
                    onClick={() => seciliSiparisiKaldir(siparis)}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
          <input
            type="date"
            value={filtre.baslangicTarihi}
            onChange={e => setFiltre(prev => ({ ...prev, baslangicTarihi: e.target.value }))}
            className="w-full border border-gray-300 px-2 py-1 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
          <input
            type="date"
            value={filtre.bitisTarihi}
            onChange={e => setFiltre(prev => ({ ...prev, bitisTarihi: e.target.value }))}
            className="w-full border border-gray-300 px-2 py-1 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Firma</label>
          <input
            type="text"
            value={filtre.firma}
            onChange={e => setFiltre(prev => ({ ...prev, firma: e.target.value }))}
            placeholder="Firma adı..."
            className="w-full border border-gray-300 px-2 py-1 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tip</label>
          <select
            value={filtre.tip}
            onChange={e => setFiltre(prev => ({ ...prev, tip: e.target.value }))}
            className="w-full border border-gray-300 px-2 py-1 rounded text-sm"
          >
            <option value="">Tümü</option>
            <option value="Tubular">Tubular</option>
            <option value="Open Width">Open Width</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
