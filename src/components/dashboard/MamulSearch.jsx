import React, { useState, useEffect, useCallback } from 'react';

const MamulSearch = ({ onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    articleNo: '',
    mamul: '',
    firma: '',
    baslangicTarihi: '',
    bitisTarihi: '',
    tip: ''
  });
  const [sonuclar, setSonuclar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tumKayitlar, setTumKayitlar] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // 🔹 Tüm kayıtları yükle
  const loadTumKayitlar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/siparisler');
      const data = await response.json();
      
      let kayitlar = [];
      
      if (Array.isArray(data)) {
        kayitlar = data;
      } else if (data && data.success && Array.isArray(data.data)) {
        kayitlar = data.data;
      } else if (data && data.data && Array.isArray(data.data.siparisler)) {
        kayitlar = data.data.siparisler;
      }
      
      setTumKayitlar(kayitlar);
      
    } catch (err) {
      console.error('Kayıtlar yüklenirken hata:', err);
      setError('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTumKayitlar();
  }, [loadTumKayitlar]);

  // 🔹 Gelişmiş Arama Fonksiyonu
  const araKayitlari = useCallback(() => {
    if (tumKayitlar.length === 0) return [];

    let filtered = [...tumKayitlar];

    // Hızlı arama (tüm alanlarda)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.articleNo && s.articleNo.toLowerCase().includes(term)) ||
        (s.mamul && s.mamul.toLowerCase().includes(term)) ||
        (s.firmaAd && s.firmaAd.toLowerCase().includes(term)) ||
        (s.kompozisyon && s.kompozisyon.toLowerCase().includes(term)) ||
        (s.firma && s.firma.toLowerCase().includes(term))
      );
    }

    // Detaylı filtreler
    if (filters.articleNo) {
      filtered = filtered.filter(s => 
        s.articleNo && s.articleNo.toLowerCase().includes(filters.articleNo.toLowerCase())
      );
    }

    if (filters.mamul) {
      filtered = filtered.filter(s => 
        s.mamul && s.mamul.toLowerCase().includes(filters.mamul.toLowerCase())
      );
    }

    if (filters.firma) {
      filtered = filtered.filter(s => 
        (s.firmaAd && s.firmaAd.toLowerCase().includes(filters.firma.toLowerCase())) ||
        (s.firma && s.firma.toLowerCase().includes(filters.firma.toLowerCase()))
      );
    }

    if (filters.tip) {
      filtered = filtered.filter(s => s.tip === filters.tip);
    }

    if (filters.baslangicTarihi) {
      filtered = filtered.filter(s => s.tarih >= filters.baslangicTarihi);
    }

    if (filters.bitisTarihi) {
      filtered = filtered.filter(s => s.tarih <= filters.bitisTarihi);
    }

    return filtered.sort((a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0));
  }, [tumKayitlar, searchTerm, filters]);

  // 🔹 Arama sonuçlarını güncelle
  useEffect(() => {
    const results = araKayitlari();
    setSonuclar(results);
  }, [araKayitlari]);

  // 🔹 Filtreleri sıfırla
  const resetFilters = () => {
    setFilters({
      articleNo: '',
      mamul: '',
      firma: '',
      baslangicTarihi: '',
      bitisTarihi: '',
      tip: ''
    });
    setSearchTerm('');
  };

  // 🔹 Tarih formatı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  // 🔹 Firma adını getir
  const getFirmaAdi = (siparis) => {
    return siparis.firmaAd || siparis.firma || 'Belirtilmemiş';
  };

  // 🔹 Göster butonu işlevi
  const handleGoster = (siparis, e) => {
    e.stopPropagation();
    if (onSelect && typeof onSelect === 'function') {
      onSelect(siparis);
    }
  };

  // 🔹 Satıra tıklama işlevi
  const handleSatirTikla = (siparis) => {
    if (onSelect && typeof onSelect === 'function') {
      onSelect(siparis);
    }
  };

  // 🔹 Arama/filtre aktif mi?
  const aramaAktif = searchTerm.trim() || Object.values(filters).some(f => f.trim());

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Arama Çubuğu - Minimal */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Article No, Mamül, Firma veya Kompozisyon ile ara..."
            className="flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold px-3"
            title="Detaylı Filtrele"
          >
            ⋯
          </button>
        </div>
      </div>

      {/* Detaylı Filtreler */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article No</label>
            <input
              type="text"
              value={filters.articleNo}
              onChange={e => setFilters(prev => ({ ...prev, articleNo: e.target.value }))}
              placeholder="Article No ile filtrele..."
              className="w-full border border-gray-300 px-3 py-1 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mamül Adı</label>
            <input
              type="text"
              value={filters.mamul}
              onChange={e => setFilters(prev => ({ ...prev, mamul: e.target.value }))}
              placeholder="Mamül adı ile filtrele..."
              className="w-full border border-gray-300 px-3 py-1 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
            <input
              type="text"
              value={filters.firma}
              onChange={e => setFilters(prev => ({ ...prev, firma: e.target.value }))}
              placeholder="Firma adı ile filtrele..."
              className="w-full border border-gray-300 px-3 py-1 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.baslangicTarihi}
              onChange={e => setFilters(prev => ({ ...prev, baslangicTarihi: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-1 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.bitisTarihi}
              onChange={e => setFilters(prev => ({ ...prev, bitisTarihi: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-1 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
            <select
              value={filters.tip}
              onChange={e => setFilters(prev => ({ ...prev, tip: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-1 rounded text-sm"
            >
              <option value="">Tümü</option>
              <option value="Tubular">Tubular</option>
              <option value="Open Width">Open Width</option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      )}

      {/* Loading & Error */}
      {loading && (
        <div className="text-center py-4">
          <div className="text-blue-500">Kayıtlar yükleniyor...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Sonuçlar - SADECE ARAMA/FİLTRE AKTİFSE GÖSTER */}
      {aramaAktif && (
        <div className="border border-gray-200 rounded-lg">
          {sonuclar.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              {sonuclar.map((siparis, index) => (
                <div
                  key={siparis.id}
                  className={`p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                  onClick={() => handleSatirTikla(siparis)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-blue-600">{siparis.articleNo}</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {siparis.tip || 'Tip Belirtilmemiş'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mb-1">
                        <strong>Mamül:</strong> {siparis.mamul || 'Belirtilmemiş'}
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Firma:</strong> {getFirmaAdi(siparis)} • 
                        <strong> Tarih:</strong> {formatDate(siparis.tarih)} • 
                        <strong> Adet:</strong> {siparis.adet || '0'}
                      </div>
                      {siparis.kompozisyon && (
                        <div className="text-xs text-gray-500 mt-1">
                          <strong>Kompozisyon:</strong> {siparis.kompozisyon}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleGoster(siparis, e)}
                      className="ml-2 bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200"
                    >
                      Göster
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Arama kriterlerinize uygun kayıt bulunamadı.
            </div>
          )}
        </div>
      )}

      {/* Arama yokken HİÇBİR ŞEY GÖSTERME */}
      {!aramaAktif && !loading && (
        <div className="text-center py-4 text-gray-400 text-sm">
          Arama yapmak için yukarıdaki alanı kullanın
        </div>
      )}
    </div>
  );
};

export default MamulSearch;
