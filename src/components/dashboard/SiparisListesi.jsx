import React, { useEffect, useState, useCallback } from 'react';
import EtiketGoruntule from './EtiketGoruntule';

// Sabitler ve initial değerler
const INITIAL_FORM_DATA = {
  firmaId: '',
  tarih: '',
  adet: '',
  mamul: '',
  kompozisyon: '',
  en: '',
  gramaj: '',
  tip: ''
};

const INITIAL_FIRMA_FORM = {
  ad: '',
  telefon: '',
  adres: ''
};

const API_BASE_URL = '/api';

const SiparisListesi = ({ selectedMamulKod }) => {
  const [siparisler, setSiparisler] = useState([]);
  const [firmalar, setFirmalar] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [firmaModalOpen, setFirmaModalOpen] = useState(false);
  const [aktifSiparis, setAktifSiparis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [firmaForm, setFirmaForm] = useState(INITIAL_FIRMA_FORM);
  const [kartelaSayilari, setKartelaSayilari] = useState({
    toplam: 0,
    hazir: 0,
    bekleyen: 0
});
  // 🔹 ArticleNo üretimi
  const generateArticleNo = useCallback(() => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PRD-${date}-${rand}`;
  }, []);

  // 🔹 API istekleri için yardımcı fonksiyon (GELİŞTİRİLDİ)
  const fetchData = async (url, options = {}) => {
    try {
      setError(null);
      console.log(`🔹 API İsteği: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API Cevabı (${url}):`, data);
      
      return data;
    } catch (err) {
      console.error(`❌ API Hatası (${url}):`, err);
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Firmaları yükle (DÜZELTİLDİ)
  const loadFirmalar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchData('/firmalar');
      // ✅ DÜZELTME: response.data'dan array'i al
      if (response.success && Array.isArray(response.data)) {
        setFirmalar(response.data);
        console.log(`✅ ${response.data.length} firma yüklendi`);
      } else if (Array.isArray(response)) {
        // Eski format için fallback
        setFirmalar(response);
        console.log(`✅ ${response.length} firma yüklendi (eski format)`);
      } else {
        console.warn('⚠️ Beklenmeyen firma formatı:', response);
      }
    } catch (err) {
      setError('Firmalar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Siparişleri yükle (DÜZELTİLDİ)
const loadSiparisler = useCallback(async () => {
  try {
    setLoading(true);
    
    // ✅ KARTELALAR tablosundan veri çek
    const response = await fetchData('/kartelalar');
    
    let kartelaData = [];
    
    if (response.success) {
      if (Array.isArray(response.data?.kartelalar)) {
        kartelaData = response.data.kartelalar;
      } else if (Array.isArray(response.data)) {
        kartelaData = response.data;
      }
    } else if (Array.isArray(response)) {
      // Eski format için fallback
      kartelaData = response;
    }
    
    if (Array.isArray(kartelaData)) {
      setSiparisler(kartelaData);
      console.log(`✅ ${kartelaData.length} kartela yüklendi`);
      


    } else {
      console.warn('⚠️ Beklenmeyen kartela formatı:', response);
      setSiparisler([]);
    }
  } catch (err) {
    console.error('❌ Kartelalar yüklenirken hata:', err);
    setError('Kartelalar yüklenirken hata oluştu');
    setSiparisler([]);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadFirmalar();
    loadSiparisler();
  }, [loadFirmalar, loadSiparisler]);

  // 🔹 Form input değişimleri
  const handleInputChange = e => {
    const { name, value } = e.target;
    
    // Sayısal alanlar için validation
    if (name === 'adet' || name === 'en' || name === 'gramaj') {
      const numericValue = Math.max(0, parseInt(value) || 0);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFirmaInputChange = e => {
    setFirmaForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 🔹 Sipariş ekleme/güncelleme (GELİŞTİRİLDİ)
const handleSubmit = async e => {
  e.preventDefault();
  
  try {
    setLoading(true);
    
    // Kartela verisini hazırla
    const kartelaVerisi = {
      kod: `KRT-${Date.now()}`, // Geçici kod - sonra iyileştireceğiz
      mamul_adi: formData.mamul,
      tip: formData.tip,
      kompozisyon: formData.kompozisyon,
      en: formData.en.toString(),
      gramaj: formData.gramaj.toString(),
      prefix: 'PRD' // Varsayılan prefix
    };

    // KARTELALAR tablosuna kaydet
    const response = await fetchData('/kartelalar', {
      method: 'POST',
      body: JSON.stringify(kartelaVerisi),
    });

    if (response.success) {
      const yeniKartela = {
        id: response.data.id,
        kod: kartelaVerisi.kod,
        mamul_adi: kartelaVerisi.mamul_adi,
        article_no: response.data.articleNo,
        created_at: new Date().toISOString()
      };
      
      // UI'ı güncelle
      setSiparisler(prev => [yeniKartela, ...prev]);
      console.log('✅ Yeni kartela oluşturuldu:', yeniKartela);
      
      setModalOpen(false);
      resetForm();
      alert(`Kartela başarıyla oluşturuldu! Article No: ${response.data.articleNo}`);
    }
    
  } catch (err) {
    setError('Kartela oluşturulamadı');
  } finally {
    setLoading(false);
  }
};

  // 🔹 Firma ekleme (DÜZELTİLDİ)
  const handleFirmaSubmit = async e => {
    e.preventDefault();
    
    if (!firmaForm.ad.trim()) {
      setError('Firma adı zorunludur');
      return;
    }

    try {
      setLoading(true);
      const response = await fetchData('/firmalar', {
        method: 'POST',
        body: JSON.stringify(firmaForm),
      });

      // ✅ DÜZELTME: response.data'dan firmayı al
      let yeniFirma;
      
      if (response.success) {
        yeniFirma = response.data;
      } else {
        yeniFirma = response;
      }
      
      console.log('✅ Yeni firma eklendi:', yeniFirma);
      
      setFirmalar(prev => [...prev, yeniFirma]);
      setFirmaModalOpen(false);
      setFirmaForm(INITIAL_FIRMA_FORM);
      
      // ✅ Form'daki firma seçimini otomatik güncelle
      setFormData(prev => ({ ...prev, firmaId: yeniFirma.id }));
      
    } catch (err) {
      setError('Firma eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Form resetleme
  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
  };

  // 🔹 Düzenleme işlemi
  const handleEdit = siparis => {
    setFormData({ ...siparis });
    setEditingId(siparis.id);
    setModalOpen(true);
  };

  // 🔹 Silme işlemi
  const handleDelete = async id => {
    if (!window.confirm('Bu kartelayı silmek istediğinize emin misiniz?')) return;
    
    try {
      setLoading(true);
      await fetchData(`/siparis/${id}`, { method: 'DELETE' });
      setSiparisler(prev => prev.filter(s => s.id !== id));
      if (aktifSiparis?.id === id) {
        setAktifSiparis(null);
      }
      console.log('✅ Sipariş silindi:', id);
    } catch (err) {
      setError('Silme işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Modal kapatma
  const handleModalClose = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleFirmaModalClose = () => {
    setFirmaModalOpen(false);
    setFirmaForm(INITIAL_FIRMA_FORM);
  };

  // 🔹 Filtreleme
const filteredSiparisler = siparisler.filter(s => {
  if (!selectedMamulKod) return true;
  
  const mamulMatch = selectedMamulKod.mamul 
    ? s.mamul_adi?.toLowerCase().includes(selectedMamulKod.mamul.toLowerCase())
    : true;
    
  const articleMatch = selectedMamulKod.articleNo
    ? s.article_no?.toLowerCase().includes(selectedMamulKod.articleNo.toLowerCase())
    : true;
    
  return mamulMatch && articleMatch;
});

  // 🔹 Bugünkü tarih için varsayılan değer
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Firma eklendikten sonra otomatik focus (YENİ EKLENDİ)
  useEffect(() => {
    if (formData.firmaId && modalOpen) {
      console.log('✅ Firma seçimi güncellendi:', formData.firmaId);
    }
  }, [formData.firmaId, modalOpen]);

  return (
    <div className="bg-white p-4 rounded-lg shadow w-full">
      {/* Hata Mesajı */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded text-center">
          İşlem yapılıyor...
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🧵 Oluşturulan Kartelalar</h3>
        <button
          onClick={() => {
            resetForm();
            setFormData(prev => ({ ...prev, tarih: getTodayDate() }));
            setModalOpen(true);
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm disabled:bg-gray-400"
          disabled={loading}
        >
          + Yeni Kartela
        </button>
      </div>

      {filteredSiparisler.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {siparisler.length === 0 ? 'Henüz kartela bulunamadı.' : 'Filtreye uygun kartela bulunamadı.'}
        </p>
      ) : (
<ul className="divide-y divide-gray-200">
  {filteredSiparisler.slice(0, 5).map(kartela => (
    <li key={kartela.id} className="py-3 flex justify-between items-center text-sm text-gray-700 hover:bg-gray-50 px-2 rounded">
      <div className="flex-1">
        <div className="font-semibold text-gray-800">Kod: {kartela.kod}</div>
        <div className="text-xs text-gray-500">Mamul: {kartela.mamul_adi}</div>
        <div className="text-xs text-gray-500">Article No: {kartela.article_no}</div>
      </div>
      <button
        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400"
        onClick={() => setAktifSiparis(kartela)}
        disabled={loading}
      >
        Göster
      </button>
    </li>
  ))}
</ul>
      )}

      {aktifSiparis && (
        <EtiketGoruntule
          siparis={aktifSiparis}
          firma={firmalar.find(f => f.id === aktifSiparis.firmaId)}
          onClose={() => setAktifSiparis(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}

      {/* Kartela Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">
              {editingId ? 'Kartela Düzenle' : 'Yeni Kartela Oluştur'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2 items-center">
                <select
                  name="firmaId"
                  value={formData.firmaId}
                  onChange={handleInputChange}
                  required
                  className="w-full border px-3 py-2 rounded"
                  disabled={loading}
                >
                  <option value="">Firma seçin</option>
                  {firmalar.map(f => (
                    <option key={f.id} value={f.id}>{f.ad}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setFirmaModalOpen(true)}
                  className="text-blue-600 text-xl font-bold px-2 hover:text-blue-800 disabled:text-gray-400"
                  title="Yeni firma ekle"
                  disabled={loading}
                >
                  +
                </button>
              </div>
              
              <input 
                type="date" 
                name="tarih" 
                value={formData.tarih} 
                onChange={handleInputChange} 
                required 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              
              <input 
                type="number" 
                name="adet" 
                value={formData.adet} 
                onChange={handleInputChange} 
                placeholder="Adet" 
                required 
                min={1} 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              
              <input 
                type="text" 
                name="mamul" 
                value={formData.mamul} 
                onChange={handleInputChange} 
                placeholder="Mamül + Renk Referansı" 
                required 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              
              <textarea 
                name="kompozisyon" 
                value={formData.kompozisyon} 
                onChange={handleInputChange} 
                placeholder="Kompozisyon" 
                required 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
                rows={3}
              />
              
              <input 
                type="number" 
                name="en" 
                value={formData.en} 
                onChange={handleInputChange} 
                placeholder="En (cm)" 
                required 
                min={0} 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              
              <input 
                type="number" 
                name="gramaj" 
                value={formData.gramaj} 
                onChange={handleInputChange} 
                placeholder="Gramaj (gr)" 
                required 
                min={0} 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              
              <select 
                name="tip" 
                value={formData.tip} 
                onChange={handleInputChange} 
                required 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              >
                <option value="">Tip Seçin</option>
                <option value="Tubular">Tubular</option>
                <option value="Open Width">Open Width</option>
              </select>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={loading}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Kaydet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Firma Modal */}
      {firmaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Yeni Firma Ekle</h4>
            <form onSubmit={handleFirmaSubmit} className="space-y-3">
              <input 
                name="ad" 
                value={firmaForm.ad} 
                onChange={handleFirmaInputChange} 
                placeholder="Firma Adı *" 
                required 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              <input 
                name="telefon" 
                value={firmaForm.telefon} 
                onChange={handleFirmaInputChange} 
                placeholder="Telefon" 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              <textarea 
                name="adres" 
                value={firmaForm.adres} 
                onChange={handleFirmaInputChange} 
                placeholder="Adres" 
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
                rows={3}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={handleFirmaModalClose}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={loading}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiparisListesi;
