import React from 'react';
import { Link } from 'react-router-dom';
import { clearSession, getSession } from '../utils/auth';
import AppNavbar from '../components/AppNavbar';

const cards = [
  {
    label: '1. Seçenek',
    title: 'Etiket Bas',
    description: 'Kayıtlı mamül kartlarından etiket seçin, QR önizlemesini görün ve baskıya alın.',
    to: '/mamul/labels'
  },
  {
    label: '2. Seçenek',
    title: 'Mamul Ekle',
    description: 'Tanımlardan gelen verilerle reçete, proses, maliyet ve satış kartını oluşturun.',
    to: '/mamul/create'
  },
  {
    label: '3. Seçenek',
    title: 'Ürün Tanıtımı',
    description: 'Müşterinin göreceği hikâye, görsel, materyal dili ve tanıtım metnini hazırlayın.',
    to: '/mamul/showcase'
  }
];

const MamulLandingPage = () => {
  const user = getSession();

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          eyebrow="Kartelix / Mamül"
          title="Mamül operasyon merkezi"
          description={`${user?.username || 'mamul'} kullanıcısı için etiket, mamül kaydı ve ürün hikâyesi akışları burada bir arada.`}
          onLogout={handleLogout}
        />

        <section className="app-panel p-8">
          <div className="app-chip">Operasyon Akışı</div>
          <h2 className="mt-6 text-4xl font-bold text-[color:var(--app-text)]">Kartela üretimi ve ürün vitrini aynı çizgide ilerlesin.</h2>
          <p className="mt-4 max-w-3xl text-[color:var(--app-text-muted)] leading-8">
            Bu alan artık yalnızca veri giriş noktası değil. Etiketten public ürün kartına kadar uzanan deneyimin operasyon merkezi olarak kurgulandı.
          </p>
        </section>

        <div className="app-card-grid md:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.to} to={card.to} className="app-card">
              <div className="app-chip">{card.label}</div>
              <h3 className="mt-5 text-2xl font-semibold text-[color:var(--app-text)]">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-muted)]">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MamulLandingPage;
