import React from 'react';

// Statik Kartlar
const Card = ({ title, value, icon, className = '' }) => (
  <div className={`p-5 bg-white rounded-xl shadow-lg flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] ${className}`}>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
    <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
      {icon}
    </div>
  </div>
);

// Statik İkonlar
const StokIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10h16M4 7l6-6 6 6M4 7h16" />
  </svg>
);
const KartelaIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.78 12.63l2.87-2.87c.39-.39.39-1.02 0-1.41l-2.87-2.87c-.39-.39-1.02-.39-1.41 0L12 9.81l-4.57-4.57c-.39-.39-1.02-.39-1.41 0L3.13 8.35c-.39.39-.39 1.02 0 1.41l2.87 2.87"/>
  </svg>
);
const RenkIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13.5l3.5-3.5L14 13.5M10 21h4c4 0 7-3 7-7 0-3-2-5-4-6-2-1-4-1.5-6-1.5S8 5 6 6 4 8 4 11c0 4 3 7 7 7z"/>
  </svg>
);

const MamulStats = ({ siparis }) => {
  if (!siparis) {
    // Hiçbir sipariş seçilmemişse boş göster
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-indigo-200">
        <p className="text-xl font-semibold text-indigo-700">
          Detayları görmek için bir sipariş seçin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
<div className="space-y-6">
  <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
    🧵 Son Aramalar
  </h2>

  {siparis && (
    <>
      <h3 className="text-xl font-semibold mt-2">{siparis.mamul} ({siparis.articleNo})</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="Adet" 
          value={`${siparis.adet.toLocaleString()} mt`} 
          icon={StokIcon}
          className="bg-green-50"
        />
        <Card 
          title="Kartela Hazır Durumu" 
          value={siparis.kartela_hazir ? 'HAZIR' : 'YOK'} 
          icon={KartelaIcon}
          className={siparis.kartela_hazir ? 'bg-indigo-50' : 'bg-yellow-50'}
        />
        <Card 
          title="Renk Çeşidi" 
          value={`${siparis.renkSayisi || 0} Renk`} 
          icon={RenkIcon}
          className="bg-blue-50"
        />
      </div>
    </>
  )}
</div>


      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p><strong>Tarih:</strong> {siparis.tarih}</p>
        <p><strong>Kumaş Tipi:</strong> {siparis.tip}</p>
        <p><strong>Kompozisyon:</strong> {siparis.kompozisyon}</p>
      </div>
    </div>
  );
};

export default MamulStats;
