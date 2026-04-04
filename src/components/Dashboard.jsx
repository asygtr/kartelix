// src/components/Dashboard.jsx - GÜNCEL
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SalesChart from './dashboard/SalesChart.jsx';
import MamulSearch from './dashboard/MamulSearch.jsx';
import SiparisListesi from './dashboard/SiparisListesi.jsx';
import EtiketGoruntule from './dashboard/EtiketGoruntule.jsx';
import SiparisYonetimi from './siparis/SiparisYonetimi.jsx';
import { clearSession } from '../utils/auth';

const Dashboard = () => {
  const [selectedMamulKod, setSelectedMamulKod] = useState('');
  const [aktifSiparis, setAktifSiparis] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL'den module parametresini al, yoksa varsayılan 'kartela'
  const activeModule = searchParams.get('module') || 'kartela';

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const handleMamulSelect = (siparis) => {
    console.log('🟢 MamulSearch\'ten gelen sipariş:', siparis);
    setAktifSiparis(siparis);
  };

  const handleEtiketKapat = () => {
    setAktifSiparis(null);
  };

  // Modül değiştirme
  const handleModuleChange = (module) => {
    setSearchParams({ module });
    setAktifSiparis(null);
  };

  // Ana sayfaya dön
  const handleHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans p-4 md:p-6 lg:p-8 space-y-10">
      {/* Üst bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6 min-w-0">
          <img src="/nevres.png" alt="Kartela Logo" className="h-10 w-auto" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 whitespace-nowrap">
            {activeModule === 'kartela' ? 'Kartela Yönetim Paneli' : 'Sipariş Yönetimi'}
          </h1>
        </div>
        
        {/* Navigation Butonları */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleHome}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition font-medium text-sm"
          >
            🏠 Ana Sayfa
          </button>
          <button
            onClick={() => handleModuleChange('kartela')}
            className={`px-4 py-2 rounded transition font-medium text-sm ${
              activeModule === 'kartela' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            🏷️ Kartela
          </button>
          <button
            onClick={() => handleModuleChange('siparis')}
            className={`px-4 py-2 rounded transition font-medium text-sm ${
              activeModule === 'siparis' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            📦 Sipariş
          </button>
          <button
            onClick={() => navigate('/ayarlar')}
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition font-medium text-sm"
          >
            ⚙️ Ayarlar
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition font-medium text-sm"
          >
            🚪 Çıkış
          </button>
        </div>
      </div>

      {/* İçerik - Mevcut Kartela yapısı korunuyor */}
      <div className="min-h-[500px]">
        {activeModule === 'kartela' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <MamulSearch onSelect={handleMamulSelect} />
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <SiparisListesi selectedMamulKod={selectedMamulKod} />
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <SalesChart />
              </div>
            </div>
          </div>
        )}
        
        {activeModule === 'siparis' && <SiparisYonetimi />}
      </div>

      {/* Etiket Modal - Sadece kartela modülünde */}
      {activeModule === 'kartela' && aktifSiparis && (
        <EtiketGoruntule
          siparis={aktifSiparis}
          onClose={handleEtiketKapat}
          onEdit={(siparis) => console.log('Düzenle:', siparis)}
          onDelete={(id) => console.log('Sil:', id)}
        />
      )}
    </div>
  );
};

export default Dashboard;
