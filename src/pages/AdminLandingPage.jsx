import React from 'react';
import { Link } from 'react-router-dom';
import { clearSession } from '../utils/auth';
import AppNavbar from '../components/AppNavbar';

const cards = [
  {
    icon: 'fabric',
    title: 'Mamul Ekle',
    description: 'Teknik veri, article yapısı, reçete, proses, maliyet ve satış bilgilerini yönetin.',
    to: '/admin/mamuller'
  },
  {
    icon: 'orders',
    title: 'Siparişler',
    description: 'Staff ekranının birebir akışına girin, sipariş toplayın ve QR bağlamlarını test edin.',
    to: '/staff/orders/new'
  },
  {
    icon: 'label',
    title: 'Etiket Bas',
    description: 'Mamül tarafındaki etiket merkezi, QR önizleme ve baskı akışlarını görün.',
    to: '/mamul/labels'
  },
  {
    icon: 'story',
    title: 'Ürün Tanıtımı',
    description: 'Müşteriye giden tanıtım hikâyesi, görsel dili ve vitrin metinlerini yönetin.',
    to: '/mamul/showcase'
  },
  {
    icon: 'settings',
    title: 'Üretim Altyapısı',
    description: 'Mamül türleri, renkler, iplikler, prosesler ve marka varlıkları gibi temel sistemi yönetin.',
    to: '/admin/settings'
  },
  {
    icon: 'reports',
    title: 'Raporlar',
    description: 'Public görüntülenme, en çok okutulan mamüller ve sipariş performansını izleyin.',
    to: '/admin/reports'
  }
];

const iconMap = {
  fabric: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M6 4h12v4l-2 1.5V20H8V9.5L6 8V4Zm2 2v1l2 1.5V18h4V8.5L16 7V6H8Z" fill="currentColor" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M5 4h11l3 3v13H5V4Zm2 2v12h10V8.2L15.8 6H7Zm2 3h6v2H9V9Zm0 4h6v2H9v-2Z" fill="currentColor" />
    </svg>
  ),
  label: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M4 7a3 3 0 0 1 3-3h6l7 7-8 8-7-7V7Zm4 1.5A1.5 1.5 0 1 0 8 5.5a1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
    </svg>
  ),
  story: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M6 5h12a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V7a2 2 0 0 1 2-2Zm0 2v8.76l2-.98 4 2 4-2 2 .98V7H6Zm2 2h8v2H8V9Zm0 4h5v2H8v-2Z" fill="currentColor" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.12 7.12 0 0 0-1.63-.94l-.36-2.54a.49.49 0 0 0-.49-.42h-3.84a.49.49 0 0 0-.49.42l-.36 2.54a7.12 7.12 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54a.49.49 0 0 0 .49.42h3.84a.49.49 0 0 0 .49-.42l.36-2.54c.59-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" fill="currentColor" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
      <path d="M5 5h14v14H5V5Zm2 2v10h10V7H7Zm1 7h2v2H8v-2Zm3-4h2v6h-2v-6Zm3-3h2v9h-2V7Z" fill="currentColor" />
    </svg>
  )
};

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
            <Link key={card.to} to={card.to} className="app-card app-quick-card">
              <div className="app-quick-card-icon">{iconMap[card.icon]}</div>
              <div className="app-quick-card-copy">
                <h3 className="text-xl font-semibold text-[color:var(--app-text)]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-muted)]">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLandingPage;
