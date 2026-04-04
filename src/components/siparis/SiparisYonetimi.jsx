// src/components/siparis/SiparisYonetimi.jsx - GÜNCEL
import React, { useState } from 'react';
import SiparisOlustur from './SiparisOlustur.jsx';
import SiparisListe from './SiparisListe.jsx';

const SiparisYonetimi = () => {
  const [activeTab, setActiveTab] = useState('liste'); // 'liste', 'olustur'

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('liste')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'liste'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Sipariş Listesi
          </button>
          <button
            onClick={() => setActiveTab('olustur')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'olustur'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ➕ Yeni Sipariş
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'liste' && <SiparisListe />}
        {activeTab === 'olustur' && <SiparisOlustur />}
      </div>
    </div>
  );
};

export default SiparisYonetimi;