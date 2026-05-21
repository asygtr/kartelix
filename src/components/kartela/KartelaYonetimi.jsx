// src/components/kartela/KartelaYonetimi.jsx
import React from 'react';

const KartelaYonetimi = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">🏷️ Kartela Yönetimi</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Kartela İstatistikleri */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Toplam Kartela</h3>
          <p className="text-3xl font-bold text-blue-600">156</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Hazır Kartela</h3>
          <p className="text-3xl font-bold text-green-600">128</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Bekleyen</h3>
          <p className="text-3xl font-bold text-yellow-600">28</p>
        </div>
      </div>

      {/* Hızlı İşlemler */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition font-medium">
          🏷️ Yeni Kartela Oluştur
        </button>
        <button className="bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition font-medium">
          📦 Toplu Etiket Yazdır
        </button>
        <button className="bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 transition font-medium">
          🔍 Kartela Ara
        </button>
        <button className="bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition font-medium">
          📊 Raporlar
        </button>
      </div>

      {/* Son Eklenen Kartelalar */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Son Eklenen Kartelalar</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-600 text-center">-</p>
        </div>
      </div>
    </div>
  );
};

export default KartelaYonetimi;
