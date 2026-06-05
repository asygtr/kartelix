// src/components/siparis/SiparisOlustur.jsx - GÜNCEL
import React, { useState, useEffect } from 'react';

const SiparisOlustur = () => {
  const [musteriAdi, setMusteriAdi] = useState('');
  const [ilgiliKisi, setIlgiliKisi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kartelalar, setKartelalar] = useState([]);
  const [manuelKod, setManuelKod] = useState('');
  const [firmalar, setFirmalar] = useState([]);
  const [seciliFirma, setSeciliFirma] = useState('');
  const [mamulArama, setMamulArama] = useState('');
  const [mamulSonuclari, setMamulSonuclari] = useState([]);

  // Firmaları yükle
  useEffect(() => {
    const firmalariGetir = async () => {
      try {
        const response = await fetch('/api/firmalar');
        const result = await response.json();
        if (result.success) {
          setFirmalar(result.data);
        }
      } catch (error) {
        console.error('Firmalar yüklenirken hata:', error);
      }
    };
    firmalariGetir();
  }, []);

const handleMamulAra = async (term) => {
    if (term.length < 2) {
      setMamulSonuclari([]);
      return;
    }

    try {
      const response = await fetch(`/api/siparis-kartela-ara?term=${encodeURIComponent(term)}`);
      const result = await response.json();

      if (result.success) {
        setMamulSonuclari(result.data.kartelalar || []);
      } else {
        setMamulSonuclari([]);
      }
    } catch (error) {
      setMamulSonuclari([]);
    }
  };

  const handleQRScan = () => {
    // QR scanner henüz aktif değil
  };

  const handleManuelEkle = async () => {
    if (manuelKod.trim()) {
      try {
        const response = await fetch(`/api/siparis-kartela/${manuelKod.trim()}`);
        const result = await response.json();

        if (result.success) {
          const kartela = result.data;
          const yeniKartela = {
            id: Date.now(),
            kod: kartela.kod,
            mamul_adi: kartela.mamul_adi,
            tip: kartela.tip,
            article_no: kartela.article_no
          };
          setKartelalar([...kartelalar, yeniKartela]);
          setManuelKod('');
          setMamulSonuclari([]);
        }
      } catch (error) {
        setManuelKod('');
      }
    }
  };

  const handleMamulSec = (mamul) => {
    const yeniKartela = {
      id: Date.now(),
      kod: mamul.kod,
      mamul_adi: mamul.ad,
      tip: mamul.tip,
      article_no: `PRD-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5)}`
    };
    setKartelalar([...kartelalar, yeniKartela]);
    setMamulArama('');
    setMamulSonuclari([]);
  };

  const handleKartelaSil = (id) => {
    setKartelalar(kartelalar.filter(k => k.id !== id));
  };

const [message, setMessage] = useState({ type: '', text: '' });

  const handleSiparisTamamla = async () => {
    if (!musteriAdi.trim() && !seciliFirma) {
      setMessage({ type: 'error', text: 'Müşteri adı veya firma seçimi gerekli' });
      return;
    }

    if (kartelalar.length === 0) {
      setMessage({ type: 'error', text: 'En az bir kartela ekleyin' });
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const siparisData = {
        musteriAdi: musteriAdi.trim() || firmalar.find(f => f.id == seciliFirma)?.ad,
        ilgiliKisi,
        telefon,
        aciklama,
        kartelalar,
        firmaId: seciliFirma || null
      };

      const response = await fetch('/api/yeni-siparis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(siparisData)
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Sipariş kaydı oluşturuldu' });
        setMusteriAdi('');
        setIlgiliKisi('');
        setTelefon('');
        setAciklama('');
        setKartelalar([]);
        setSeciliFirma('');
        setMamulArama('');
      } else {
        setMessage({ type: 'error', text: result.message || 'Kayıt oluşturulamadı' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'İşlem sırasında hata oluştu' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Sipariş</h2>

      {message.text ? (
        <div className={"app-panel px-4 py-3 text-sm mb-4 " + (message.type === 'error' ? 'text-red-600' : 'text-green-600')}>
          {message.text}
        </div>
      ) : null}

      {/* Müşteri / Firma Bilgileri */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Müşteri Bilgileri</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firma Seçimi
            </label>
            <select
              value={seciliFirma}
              onChange={(e) => setSeciliFirma(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            >
              <option value="">Firma seçin...</option>
              {firmalar.map(firma => (
                <option key={firma.id} value={firma.id}>
                  {firma.ad} {firma.telefon ? `- ${firma.telefon}` : ''}
                </option>
              ))}
            </select>
            <div className="text-center text-gray-500 text-sm my-2">veya</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri - Firma Adı
            </label>
            <input
              type="text"
              value={musteriAdi}
              onChange={(e) => setMusteriAdi(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Yeni müşteri adını girin"
              disabled={!!seciliFirma}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İlgili Kişi
            </label>
            <input
              type="text"
              value={ilgiliKisi}
              onChange={(e) => setIlgiliKisi(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="İlgili kişi adı"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Telefon numarası"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sipariş notları..."
            />
          </div>
        </div>
      </div>

      {/* Kartela Ekleme */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Kartela Ekleme</h3>
        
        {/* Mamul Arama */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mamul Arama
          </label>
          <div className="relative">
            <input
              type="text"
              value={mamulArama}
              onChange={(e) => {
                setMamulArama(e.target.value);
                handleMamulAra(e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mamul kodunu veya adını yazın..."
            />
            {mamulSonuclari.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {mamulSonuclari.map(mamul => (
                  <div
                    key={mamul.kod}
                    onClick={() => handleMamulSec(mamul)}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                  >
                    <div className="font-medium">{mamul.kod}</div>
                    <div className="text-sm text-gray-600">{mamul.ad}</div>
                    <div className="text-xs text-gray-500">{mamul.tip}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            onClick={handleQRScan}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium flex items-center justify-center gap-2"
          >
            QR Oku
          </button>
          
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={manuelKod}
              onChange={(e) => setManuelKod(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManuelEkle()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Mamul kodunu elle girin"
            />
            <button
              onClick={handleManuelEkle}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
            >
              Ekle
            </button>
          </div>
        </div>

        {/* Eklenen Kartelalar Listesi */}
        <div className="border border-gray-200 rounded-lg">
          <h4 className="font-semibold p-3 bg-gray-50 border-b">
            Sipariş Kalemleri ({kartelalar.length})
          </h4>
          
          {kartelalar.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              -
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {kartelalar.map((kartela) => (
                <div key={kartela.id} className="p-3 border-b flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{kartela.kod}</div>
                    <div className="text-sm text-gray-600">{kartela.mamul_adi}</div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{kartela.tip}</span>
                      <span>{kartela.article_no}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleKartelaSil(kartela.id)}
                    className="text-red-500 hover:text-red-700 p-2 ml-2"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tamamla Butonu */}
      <div className="flex justify-end">
        <button
          onClick={handleSiparisTamamla}
          disabled={(!musteriAdi.trim() && !seciliFirma) || kartelalar.length === 0}
          className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
};

export default SiparisOlustur;
