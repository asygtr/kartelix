// src/components/siparis/SiparisListe.jsx
import React, { useState, useEffect } from 'react';

const SiparisListe = () => {
  const [siparisler, setSiparisler] = useState([]);
  const [loading, setLoading] = useState(true);

  const siparisleriGetir = async () => {
    try {
      const response = await fetch('/api/siparisler');
      const result = await response.json();
      
      if (result.success) {
        setSiparisler(result.data.siparisler || []);
      }
    } catch (error) {
      console.error('Sipariş listesi yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    siparisleriGetir();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Listesi</h2>
      
      {siparisler.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Henüz sipariş bulunmuyor
        </div>
      ) : (
        <div className="space-y-4">
          {siparisler.map((siparis) => (
            <div key={siparis.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{siparis.musteri_adi}</h3>
                  <p className="text-gray-600">{siparis.ilgili_kisi} - {siparis.telefon}</p>
                  <p className="text-sm text-gray-500 mt-1">{siparis.aciklama}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    siparis.durum === 'bekliyor' ? 'bg-yellow-100 text-yellow-800' :
                    siparis.durum === 'tamamlandı' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {siparis.durum}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(siparis.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {siparis.kartela_sayisi || 0} kartela
                </span>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    📧 Email Gönder
                  </button>
                  <button className="text-green-600 hover:text-green-800 text-sm">
                    👁️ Detay Gör
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiparisListe;
