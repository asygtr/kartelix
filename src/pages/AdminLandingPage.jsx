import React from 'react';
import { Link } from 'react-router-dom';
import { clearSession } from '../utils/auth';
import AppNavbar from '../components/AppNavbar';

const cards = [
  {
    title: 'Mamul Ekle',
    description: 'Teknik veri, article yapısı, reçete, proses, maliyet ve satış bilgilerini yönetin.',
    to: '/admin/mamuller'
  },
  {
    title: 'Siparişler',
    description: 'Staff ekranının birebir akışına girin, sipariş toplayın ve QR bağlamlarını test edin.',
    to: '/staff/orders/new'
  },
  {
    title: 'Etiket Bas',
    description: 'Mamül tarafındaki etiket merkezi, QR önizleme ve baskı akışlarını görün.',
    to: '/mamul/labels'
  },
  {
    title: 'Ürün Tanıtımı',
    description: 'Müşteriye giden tanıtım hikâyesi, görsel dili ve vitrin metinlerini yönetin.',
    to: '/mamul/showcase'
  },
  {
    title: 'Üretim Altyapısı',
    description: 'Mamül türleri, renkler, iplikler, prosesler ve marka varlıkları gibi temel sistemi yönetin.',
    to: '/admin/settings'
  },
  {
    title: 'Raporlar',
    description: 'Public görüntülenme, en çok okutulan mamüller ve sipariş performansını izleyin.',
    to: '/admin/reports'
  }
];

const AdminLandingPage = () => {
  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          eyebrow="Kartelix / Yönetim"
          title="Merkezi kontrol paneli"
          onLogout={handleLogout}
        />

        <div className="app-card-grid md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.to} to={card.to} className="app-card">
              <h3 className="text-2xl font-semibold text-[color:var(--app-text)]">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-muted)]">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLandingPage;
