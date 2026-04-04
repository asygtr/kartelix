// src/components/HomePage.jsx - GÜNCEL
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto w-full"> {/* Genişlik arttırıldı */}
        {/* Logo ve Başlık */}
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <div className="flex justify-center mb-4 md:mb-6">
            <img 
              src="/nevres.png" 
              alt="Nevres Logo" 
              className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 object-contain" /* Logo boyutu responsive */
            />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-3">
            Kartela Yönetim Sistemi
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Hangi modüle erişmek istiyorsunuz?
          </p>
        </div>

        {/* Modül Seçim Kartları - Grid yapısı iyileştirildi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-10">
          {/* Kartela Yönetimi Kartı */}
          <div 
            onClick={() => navigate('/dashboard?module=kartela')}
            className="bg-white rounded-2xl shadow-lg p-6 md:p-8 lg:p-10 cursor-pointer transform hover:scale-105 transition duration-300 border-2 border-transparent hover:border-blue-500 flex flex-col h-full"
          >
            <div className="text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-6 text-center">🏷️</div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-6 text-center">
              Kartela Yönetimi
            </h2>
            <p className="text-gray-600 mb-6 md:mb-8 text-center flex-grow">
              Mamul kartelalarını oluşturun, düzenleyin ve yönetin. Etiket basımı ve stok takibi yapın.
            </p>
            <div className="space-y-2 mb-6 md:mb-8">
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Mamul arama ve filtreleme
              </div>
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Kartela oluşturma
              </div>
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Etiket yazdırma
              </div>
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Stok takibi
              </div>
            </div>
            <button className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition font-medium text-base md:text-lg">
              Kartela Yönetimine Git →
            </button>
          </div>

          {/* Sipariş Yönetimi Kartı */}
          <div 
            onClick={() => navigate('/dashboard?module=siparis')}
            className="bg-white rounded-2xl shadow-lg p-6 md:p-8 lg:p-10 cursor-pointer transform hover:scale-105 transition duration-300 border-2 border-transparent hover:border-green-500 flex flex-col h-full"
          >
            <div className="text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-6 text-center">📦</div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-6 text-center">
              Sipariş Yönetimi
            </h2>
            <p className="text-gray-600 mb-6 md:mb-8 text-center flex-grow">
              Müşteri siparişlerini oluşturun, takip edin ve yönetin. QR kod ile hızlı kartela ekleyin.
            </p>
            <div className="space-y-2 mb-6 md:mb-8">
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Yeni sipariş oluşturma
              </div>
              <div className="flex items-center text-sm md:text-base text-gray-500">ı
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                QR kod ile kartela ekleme
              </div>
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Sipariş takibi
              </div>
              <div className="flex items-center text-sm md:text-base text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Email bildirimleri
              </div>
            </div>
            <button className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition font-medium text-base md:text-lg">
              Sipariş Yönetimine Git →
            </button>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-8 md:mt-12 lg:mt-16 text-center">
          <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto">
            İstediğiniz zaman ana sayfaya dönmek için üst menüden "Ana Sayfa" butonunu kullanabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;ı