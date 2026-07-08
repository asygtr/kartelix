import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme, useGenelAyarlar } from '../theme/ThemeProvider';
import { authHeaders, getSession } from '../utils/auth';
import { palettes } from '../theme/palettes';
import LabelDesignerPanel from '../components/LabelDesignerPanel';
import { X } from '../components/icons.jsx';
import { defaultEase, sheetTransition, tapMotion } from '../utils/motion';

const tabs = [
  { id: 'genel', label: 'Genel Ayarlar' },
  { id: 'excel', label: 'Excel Senkron' },
  { id: 'email', label: 'Sipariş E-posta' },
  { id: 'theme', label: 'Marka Varlıkları' },
  { id: 'labels', label: 'Etiket Tasarımcısı' },
  { id: 'sifre', label: 'Şifre Değiştir' },
  { id: 'system', label: 'Operasyon' }
];

const initialTypeForm = { ad: '', kodPrefix: '', aciklama: '' };
const initialColorForm = { ad: '', kod: '' };
const initialYarnForm = { ad: '', kod: '', birim: 'kg', birimFiyat: '' };
const initialProcessForm = { ad: '', tip: '', birimMaliyet: '', renkBazli: false };
const initialEmailForm = {
  enabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpSecure: false,
  senderName: 'Kartelix Siparis',
  senderEmail: '',
  smtpUser: '',
  smtpPassword: '',
  recipientEmails: '',
  approvalEmails: '',
  approvalShowPrices: true,
  testRecipient: '',
  replyTo: '',
  lastAuthError: ''
};

const CloseIcon = () => <X className="app-nav-icon-svg" />;

const ToggleSwitch = ({ checked, onChange, id, name }) => (
  <span className="app-toggle-switch">
    <input
      id={id}
      name={name}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="app-toggle-switch-input"
    />
    <span className="app-toggle-switch-track">
      <span className="app-toggle-switch-thumb" />
    </span>
  </span>
);

const SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activePalette,
    setActivePalette,
    appLogo,
    setAppLogo,
    appBackground,
    setAppBackground
  } = useTheme();

  const [activeTab, setActiveTab] = useState('genel');
  const [systemStats, setSystemStats] = useState({});
  const [backupStatus, setBackupStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [colors, setColors] = useState([]);
  const [yarns, setYarns] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [typeForm, setTypeForm] = useState(initialTypeForm);
  const [colorForm, setColorForm] = useState(initialColorForm);
  const [yarnForm, setYarnForm] = useState(initialYarnForm);
  const [processForm, setProcessForm] = useState(initialProcessForm);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingColorId, setEditingColorId] = useState(null);
  const [editingYarnId, setEditingYarnId] = useState(null);
  const [editingProcessId, setEditingProcessId] = useState(null);
  const [excelPollMs, setExcelPollMs] = useState('60000');
  const [excelStatus, setExcelStatus] = useState('');
  const [excelSyncStatus, setExcelSyncStatus] = useState(null);
  const [emailForm, setEmailForm] = useState(initialEmailForm);
  const [emailStatus, setEmailStatus] = useState('');
  const [themeStatus, setThemeStatus] = useState('');
  const [brandingForm, setBrandingForm] = useState({ appLogo: '/nevres.png', appBackground: '/showroom-bg.png' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { genelAyarlar: ctxGenelAyarlar, saveGenelAyarlar: ctxSaveGenelAyarlar } = useGenelAyarlar();
  const [genelAyarlar, setGenelAyarlar] = useState({ publicProsesGoster: false, publicFiyatGoster: false, publicHikayeGoster: true, publicHammaddeGoster: true, karYuzdesi: 0 });
  const [genelAyarlarStatus, setGenelAyarlarStatus] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwStatus('Yeni şifreler eşleşmiyor.'); return; }
    if (pwForm.next.length < 4) { setPwStatus('Şifre en az 4 karakter olmalı.'); return; }
    setPwLoading(true); setPwStatus('');
    try {
      const res = await fetch('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next })
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setPwStatus(data.error || 'Hata oluştu.'); return; }
      setPwStatus('✓ Şifre başarıyla güncellendi.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch { setPwStatus('Sunucuya bağlanılamadı.'); }
    finally { setPwLoading(false); }
  };

  const loadGenelAyarlar = async () => {
    try {
      const r = await fetch('/api/genel-ayarlar');
      const d = await r.json();
      if (d.success) setGenelAyarlar(d.data);
    } catch {}
  };

  const saveGenelAyarlar = async (next) => {
    setGenelAyarlar(next);
    ctxSaveGenelAyarlar(
      next,
      () => setGenelAyarlarStatus('Kaydedildi.'),
      () => setGenelAyarlarStatus('Kayıt başarısız.')
    );
    setTimeout(() => setGenelAyarlarStatus(''), 2500);
  };

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/stats', { headers: authHeaders() });
      const data = await response.json();
      setSystemStats(data);
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err);
    }
  };

  const loadDefinitions = async () => {
    const hdrs = { headers: authHeaders() };
    const [typesResponse, colorsResponse, yarnsResponse, processesResponse] = await Promise.all([
      fetch('/api/admin/mamul-turleri', hdrs),
      fetch('/api/admin/renkler', hdrs),
      fetch('/api/admin/iplikler', hdrs),
      fetch('/api/admin/prosesler', hdrs)
    ]);

    const [typesResult, colorsResult, yarnsResult, processesResult] = await Promise.all([
      typesResponse.json(),
      colorsResponse.json(),
      yarnsResponse.json(),
      processesResponse.json()
    ]);

    setTypes(typesResult.success ? typesResult.data : []);
    setColors(colorsResult.success ? colorsResult.data : []);
    setYarns(yarnsResult.success ? yarnsResult.data : []);
    setProcesses(processesResult.success ? processesResult.data : []);
  };

  const loadExcelSettings = async () => {
    const settingsResponse = await fetch('/api/admin/excel-settings', { headers: authHeaders() });
    const settingsResult = await settingsResponse.json();

    if (settingsResult.success) {
      setExcelPollMs(String(settingsResult.data.pollMs || 60000));
    }

    setExcelSyncStatus({
      lastRunAt: '-',
      directory: '-',
      lastError: 'Durum bilgisi bu ekranda gösterilmiyor',
      urgeLastResult: null,
      latestSnapshots: []
    });
  };

  const loadOrderEmailSettings = async () => {
    const response = await fetch('/api/admin/order-email-settings', { headers: authHeaders() });
    const result = await response.json();

    if (response.ok && result.success) {
      setEmailForm((prev) => ({
        ...prev,
        ...result.data,
        smtpPort: String(result.data.smtpPort || 587),
        smtpPassword: '',
        testRecipient: prev.testRecipient || result.data.recipientEmails || ''
      }));
    }
  };

  useEffect(() => {
    loadSystemStats();
    loadDefinitions();
    loadExcelSettings();
    loadOrderEmailSettings();
    loadGenelAyarlar();
  }, []);

  // Context'teki genel ayarlar değişince local state'i de güncelle
  useEffect(() => {
    setGenelAyarlar(ctxGenelAyarlar);
  }, [ctxGenelAyarlar]);

  useEffect(() => {
    setBrandingForm({
      appLogo: appLogo || '/nevres.png',
      appBackground: appBackground || '/showroom-bg.png'
    });
  }, [appLogo, appBackground]);

  useEffect(() => {
    const openDrawer = () => setDrawerOpen(true);
    window.addEventListener('settings-menu:open', openDrawer);
    return () => window.removeEventListener('settings-menu:open', openDrawer);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const page = document.querySelector('.app-page');
    const previousPageOverflow = page?.style.overflow;
    document.body.style.overflow = 'hidden';
    if (page) page.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (page) page.style.overflow = previousPageOverflow || '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const shouldOpen = params.get('menu') === '1';
    if (!shouldOpen) return;

    // Open the animated drawer when arriving from navbar settings icon.
    setDrawerOpen(true);

    // Clean the URL to avoid reopening on refresh/back in odd ways.
    params.delete('menu');
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  const resetTypeForm = () => {
    setTypeForm(initialTypeForm);
    setEditingTypeId(null);
  };

  const resetColorForm = () => {
    setColorForm(initialColorForm);
    setEditingColorId(null);
  };

  const resetYarnForm = () => {
    setYarnForm(initialYarnForm);
    setEditingYarnId(null);
  };

  const resetProcessForm = () => {
    setProcessForm(initialProcessForm);
    setEditingProcessId(null);
  };

  const handleBackup = async () => {
    setLoading(true);
    setBackupStatus('Yedekleme yapılıyor...');
    try {
      await fetch('/api/backup', { method: 'POST', headers: authHeaders() });
      setBackupStatus('Yedekleme başarılı.');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch {
      setBackupStatus('Yedekleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDatabase = () => {
    if (window.confirm('TÜM veriler silinecek. Emin misiniz?\nBu işlem geri alınamaz!')) {
      setLoading(true);
      fetch('/api/clean-database', { method: 'POST', headers: authHeaders() })
        .then(() => {
          alert('Veritabanı temizlendi.');
          loadSystemStats();
        })
        .catch(() => {
          alert('Temizleme başarısız.');
        })
        .finally(() => setLoading(false));
    }
  };

  const createDefinition = async (url, payload, onSuccess) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Kayıt oluşturulamadı');
    }
    await onSuccess();
  };

  const updateDefinition = async (url, payload, onSuccess) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Kayıt güncellenemedi');
    }
    await onSuccess();
  };

  const saveExcelPoll = async () => {
    const response = await fetch('/api/admin/excel-settings/poll', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ pollMs: Number(excelPollMs || 0) })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Okuma sıklığı kaydedilemedi');
    }
    setExcelStatus('Okuma sıklığı kaydedildi.');
    await loadExcelSettings();
  };

  const runExcelSync = async () => {
    const response = await fetch('/api/admin/excel-sync/run', { method: 'POST', headers: authHeaders() });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Senkronizasyon çalıştırılamadı');
    }
    setExcelStatus('Senkronizasyon tamamlandı.');
    setExcelSyncStatus(result.data);
    await loadDefinitions();

    try {
      const mamulResponse = await fetch('/api/admin/mamuller', { headers: authHeaders() });
      const mamulResult = await mamulResponse.json();
      if (mamulResponse.ok && mamulResult.success) {
        window.dispatchEvent(new CustomEvent('mamul-list-updated', { detail: mamulResult.data }));
      }
    } catch {
      // ignore refresh errors and keep the sync status visible
    }
  };

  const saveOrderEmailSettings = async () => {
    const response = await fetch('/api/admin/order-email-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        enabled: emailForm.enabled,
        smtpHost: emailForm.smtpHost,
        smtpPort: Number(emailForm.smtpPort || 587),
        smtpSecure: Boolean(emailForm.smtpSecure),
        senderName: emailForm.senderName,
        senderEmail: emailForm.senderEmail,
        smtpUser: emailForm.smtpUser,
        smtpPassword: emailForm.smtpPassword,
        recipientEmails: emailForm.recipientEmails,
        approvalEmails: emailForm.approvalEmails,
        approvalShowPrices: emailForm.approvalShowPrices,
        testRecipient: emailForm.testRecipient,
        replyTo: emailForm.replyTo
      })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'E-posta ayarları kaydedilemedi');
    }

    setEmailForm((prev) => ({
      ...prev,
      ...result.data,
      smtpPort: String(result.data.smtpPort || 587),
      smtpPassword: ''
    }));
    setEmailStatus('E-posta ayarları kaydedildi.');
  };

  const sendTestOrderEmail = async () => {
    const response = await fetch('/api/admin/order-email-settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ testRecipient: emailForm.testRecipient })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      const prefix = response.status ? `(${response.status}) ` : '';
      const codeSuffix = result.code ? ` [${result.code}]` : '';
      const stageSuffix = result.stage ? ` {${result.stage}}` : '';
      const responseSuffix = result.response ? ` - ${result.response}` : '';
      throw new Error(`${prefix}${result.error || 'Test e-postası gönderilemedi'}${codeSuffix}${stageSuffix}${responseSuffix}`);
    }

    const accepted = result.data?.accepted?.join(', ') || emailForm.testRecipient || '-';
    setEmailStatus(`Test e-postası gönderildi: ${accepted}`);
  };

  const renderDefinitionList = (items, activeId, onSelect, renderText) => (
    <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Henüz kayıt yok.</div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full rounded-2xl border px-4 py-3 text-left text-sm transition"
            style={{
              borderColor: activeId === item.id ? 'var(--app-primary)' : '#e2e8f0',
              background: activeId === item.id ? 'color-mix(in srgb, var(--app-primary) 10%, white 90%)' : 'rgba(255,255,255,0.65)',
              color: 'var(--app-text)'
            }}
          >
            {renderText(item)}
          </button>
        ))
      )}
    </div>
  );

  const current = ({
    types: {
      title: 'Ürün grupları',
      description: 'Article no oluşurken kullanılan prefix yapısı burada tanımlanır. Listeden seçilen tanım aynı form içinde düzenlenir.',
      form: (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (editingTypeId) {
              await updateDefinition(`/api/admin/mamul-turleri/${editingTypeId}`, typeForm, async () => {
                resetTypeForm();
                await loadDefinitions();
              });
              return;
            }

            await createDefinition('/api/admin/mamul-turleri', typeForm, async () => {
              resetTypeForm();
              await loadDefinitions();
            });
          }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">
              {editingTypeId ? 'Ürün grubunu düzenle' : 'Yeni ürün grubu ekle'}
            </div>
            {editingTypeId ? <button type="button" onClick={resetTypeForm} className="app-btn-secondary">İptal</button> : null}
          </div>
          <input className="app-input" placeholder="Tür adı" value={typeForm.ad} onChange={(e) => setTypeForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Kod prefix (10, 20, 3 gibi)" value={typeForm.kodPrefix} onChange={(e) => setTypeForm((prev) => ({ ...prev, kodPrefix: e.target.value }))} />
          <textarea className="app-textarea min-h-24" placeholder="Açıklama" value={typeForm.aciklama} onChange={(e) => setTypeForm((prev) => ({ ...prev, aciklama: e.target.value }))} />
          <button type="submit" className="app-btn-primary">
            {editingTypeId ? 'Ürün grubunu güncelle' : 'Mamül türü ekle'}
          </button>
        </form>
      ),
      list: renderDefinitionList(
        types,
        editingTypeId,
        (item) => {
          setEditingTypeId(item.id);
          setTypeForm({ ad: item.ad || '', kodPrefix: item.kod_prefix || '', aciklama: item.aciklama || '' });
        },
        (item) => `${item.ad} / prefix: ${item.kod_prefix}`
      )
    },
    colors: {
      title: 'Renkler',
      description: 'Mamül tanıtım ekranında seçilecek standart renk ve renk kodları burada tanımlanır. Listeden seçilen renk aynı formda düzenlenir.',
      form: (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (editingColorId) {
              await updateDefinition(`/api/admin/renkler/${editingColorId}`, colorForm, async () => {
                resetColorForm();
                await loadDefinitions();
              });
              return;
            }

            await createDefinition('/api/admin/renkler', colorForm, async () => {
              resetColorForm();
              await loadDefinitions();
            });
          }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">
              {editingColorId ? 'Rengi düzenle' : 'Yeni renk ekle'}
            </div>
            {editingColorId ? <button type="button" onClick={resetColorForm} className="app-btn-secondary">İptal</button> : null}
          </div>
          <input className="app-input" placeholder="Renk adı" value={colorForm.ad} onChange={(e) => setColorForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Renk kodu" value={colorForm.kod} onChange={(e) => setColorForm((prev) => ({ ...prev, kod: e.target.value }))} />
          <button type="submit" className="app-btn-primary">
            {editingColorId ? 'Rengi güncelle' : 'Renk ekle'}
          </button>
        </form>
      ),
      list: renderDefinitionList(
        colors,
        editingColorId,
        (item) => {
          setEditingColorId(item.id);
          setColorForm({ ad: item.ad || '', kod: item.kod || '' });
        },
        (item) => `${item.ad} / ${item.kod}`
      )
    },
    yarns: {
      title: 'İplik tanımı',
      description: 'İplik adı, kodu, birimi ve varsayılan fiyatı burada tanımlanır. Mamül reçetesinde bu hazır iplik kartları kullanılır.',
      form: (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (editingYarnId) {
              await updateDefinition(`/api/admin/iplikler/${editingYarnId}`, yarnForm, async () => {
                resetYarnForm();
                await loadDefinitions();
              });
              return;
            }

            await createDefinition('/api/admin/iplikler', yarnForm, async () => {
              resetYarnForm();
              await loadDefinitions();
            });
          }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">
              {editingYarnId ? 'İpliği düzenle' : 'Yeni iplik ekle'}
            </div>
            {editingYarnId ? <button type="button" onClick={resetYarnForm} className="app-btn-secondary">İptal</button> : null}
          </div>
          <input className="app-input" placeholder="İplik adı" value={yarnForm.ad} onChange={(e) => setYarnForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="İplik kodu" value={yarnForm.kod} onChange={(e) => setYarnForm((prev) => ({ ...prev, kod: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="app-input" placeholder="Birim" value={yarnForm.birim} onChange={(e) => setYarnForm((prev) => ({ ...prev, birim: e.target.value }))} />
            <input className="app-input" placeholder="Birim fiyat" value={yarnForm.birimFiyat} onChange={(e) => setYarnForm((prev) => ({ ...prev, birimFiyat: e.target.value }))} />
          </div>
          <button type="submit" className="app-btn-primary">
            {editingYarnId ? 'İpliği güncelle' : 'İplik ekle'}
          </button>
        </form>
      ),
      list: renderDefinitionList(
        yarns,
        editingYarnId,
        (item) => {
          setEditingYarnId(item.id);
          setYarnForm({
            ad: item.ad || '',
            kod: item.kod || '',
            birim: item.birim || 'kg',
            birimFiyat: String(item.birim_fiyat ?? '')
          });
        },
        (item) => `${item.ad} / ${Number(item.birim_fiyat || 0).toFixed(2)} ${item.birim}`
      )
    },
    processes: {
      title: 'Proses',
      description: 'Boyama, finisaj ve diğer üretim adımları burada tanımlanır; listeden seçilen proses aynı formda düzenlenir.',
      form: (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (editingProcessId) {
              await updateDefinition(`/api/admin/prosesler/${editingProcessId}`, processForm, async () => {
                resetProcessForm();
                await loadDefinitions();
              });
              return;
            }

            await createDefinition('/api/admin/prosesler', processForm, async () => {
              resetProcessForm();
              await loadDefinitions();
            });
          }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">
              {editingProcessId ? 'Prosesi düzenle' : 'Yeni proses ekle'}
            </div>
            {editingProcessId ? <button type="button" onClick={resetProcessForm} className="app-btn-secondary">İptal</button> : null}
          </div>
          <input className="app-input" placeholder="Proses adı" value={processForm.ad} onChange={(e) => setProcessForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Proses tipi" value={processForm.tip} onChange={(e) => setProcessForm((prev) => ({ ...prev, tip: e.target.value }))} />
          <input className="app-input" placeholder="Birim maliyet" value={processForm.birimMaliyet} onChange={(e) => setProcessForm((prev) => ({ ...prev, birimMaliyet: e.target.value }))} />
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-[color:var(--app-text)]">Renk bazlı proses</span>
            <ToggleSwitch
              id="switch-process-renk-bazli"
              checked={processForm.renkBazli}
              onChange={(e) => setProcessForm((prev) => ({ ...prev, renkBazli: e.target.checked }))}
            />
          </label>
          <button type="submit" className="app-btn-primary">
            {editingProcessId ? 'Prosesi güncelle' : 'Proses ekle'}
          </button>
        </form>
      ),
      list: renderDefinitionList(
        processes,
        editingProcessId,
        (item) => {
          setEditingProcessId(item.id);
          setProcessForm({
            ad: item.ad || '',
            tip: item.tip || '',
            birimMaliyet: String(item.birim_maliyet ?? ''),
            renkBazli: Boolean(item.renk_bazli)
          });
        },
        (item) => `${item.ad} / ${item.tip || '-'} / ${Number(item.birim_maliyet || 0).toFixed(2)}`
      )
    },
    excel: {
      title: 'Senkronizasyon',
      description: 'Mamül, ürün grubu, renk, iplik, proses ve fiyat verileri otomatik olarak okunur.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4 space-y-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">Okuma sıklığı</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,auto]">
              <input className="app-input" placeholder="60000" value={excelPollMs} onChange={(e) => setExcelPollMs(e.target.value)} />
              <button
                type="button"
                className="app-btn-secondary"
                onClick={async () => {
                  try {
                    await saveExcelPoll();
                  } catch (err) {
                    setExcelStatus(err.message);
                  }
                }}
              >
                Sıklığı kaydet
              </button>
            </div>
            <div className="text-xs text-slate-500">Milisaniye cinsinden yazın. Örnek: 60000 = 60 saniye.</div>
          </div>

          <div className="app-soft-panel p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--app-text)]">Senkron durumu</div>
                <div className="text-xs text-slate-500">Son çalışma: {excelSyncStatus?.lastRunAt || '-'}</div>
              </div>
              <button
                type="button"
                className="app-btn-primary"
                onClick={async () => {
                  try {
                    setExcelStatus('Senkronizasyon çalıştırılıyor...');
                    await runExcelSync();
                  } catch (err) {
                    setExcelStatus(err.message);
                  }
                }}
              >
                Şimdi oku
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                Klasör: {excelSyncStatus?.directory || '-'}
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                Son hata: {excelSyncStatus?.lastError || 'Yok'}
              </div>
            </div>
            {excelStatus ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{excelStatus.replace(/Excel /gi, '')}</div> : null}
          </div>
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {excelSyncStatus?.urgeLastResult ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-[color:var(--app-text)]">Son ÜRGE okuması</div>
              <div className="mt-1 text-slate-600">
                Aktarılan satır: {excelSyncStatus.urgeLastResult.importedRows || 0} / Atlanan satır: {excelSyncStatus.urgeLastResult.skippedRows || 0}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Henüz okuma sonucu yok.</div>
          )}

          {excelSyncStatus?.urgeLastResult?.files?.map((item) => (
            <div key={`urge-${item.fileName}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-[color:var(--app-text)]">{item.fileName}</div>
              <div className="mt-1 text-slate-600">
                Prefix: {item.typePrefix || '-'} / Aktarılan: {item.importedRows || 0} / Atlanan: {item.skippedRows || 0}
              </div>
            </div>
          ))}

          {excelSyncStatus?.latestSnapshots?.length ? (
            excelSyncStatus.latestSnapshots.map((snapshot) => (
              <div key={`snapshot-${snapshot.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold text-[color:var(--app-text)]">
                  {snapshot.summary?.sourceType || 'Kaynak'} / {snapshot.summary?.status || 'durum yok'}
                </div>
                <div className="mt-1 break-all text-slate-600">{snapshot.filePath}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {snapshot.summary?.message || '-'} / satır: {snapshot.summary?.importedRows ?? 0}
                </div>
              </div>
            ))
          ) : null}
        </div>
      )
    },
    email: {
      title: 'Sipariş e-postası',
      description: 'Sipariş maili için Gmail SMTP ve alıcı listesi.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[color:var(--app-text)]">Otomatik sipariş e-postası</span>
              <ToggleSwitch
                id="switch-email-enabled"
                checked={emailForm.enabled}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SMTP sunucusu</div>
              <input
                className="app-input"
                value={emailForm.smtpHost}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpHost: event.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SMTP port</div>
              <input
                className="app-input"
                value={emailForm.smtpPort}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpPort: event.target.value }))}
                placeholder="587"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Güvenlik</div>
              <select
                className="app-select"
                value={emailForm.smtpSecure ? 'ssl' : 'starttls'}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpSecure: event.target.value === 'ssl' }))}
              >
                <option value="starttls">STARTTLS / 587</option>
                <option value="ssl">SSL / 465</option>
              </select>
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Gönderici adı</div>
              <input
                className="app-input"
                value={emailForm.senderName}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, senderName: event.target.value }))}
                placeholder="Kartelix Siparis"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Gönderici e-posta</div>
              <input
                className="app-input"
                value={emailForm.senderEmail}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, senderEmail: event.target.value }))}
                placeholder="adres@gmail.com"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SMTP kullanıcı</div>
              <input
                className="app-input"
                value={emailForm.smtpUser}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpUser: event.target.value }))}
                placeholder="adres@gmail.com"
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SMTP parola / uygulama parolası</div>
              <input
                type="password"
                className="app-input"
                value={emailForm.smtpPassword}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpPassword: event.target.value }))}
                placeholder={emailForm.smtpPassword ? '' : 'Uygulama parolası'}
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Siparişi alan e-posta adresleri</div>
              <textarea
                className="app-input min-h-[96px]"
                value={emailForm.recipientEmails}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, recipientEmails: event.target.value }))}
                placeholder="siparis@firma.com; ikinci@firma.com"
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Sipariş onay e-posta adresleri</div>
              <textarea
                className="app-input min-h-[80px]"
                value={emailForm.approvalEmails}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, approvalEmails: event.target.value }))}
                placeholder="onay@firma.com; uretim@firma.com"
              />
              <div className="mt-1 text-xs text-slate-500">Sipariş tamamlandığında bu adreslere kurumsal onay bildirimi gönderilir.</div>
            </label>
            <div className="app-soft-panel p-4">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--app-text)]">Onay mailinde fiyatları göster</div>
                  <div className="mt-0.5 text-xs text-slate-500">Kapalıysa tutar ve birim fiyat sütunları onay mailinde yer almaz.</div>
                </div>
                <ToggleSwitch
                  id="switch-email-approval-prices"
                  checked={emailForm.approvalShowPrices}
                  onChange={(event) => setEmailForm((prev) => ({ ...prev, approvalShowPrices: event.target.checked }))}
                />
              </label>
            </div>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Yanıt adresi</div>
              <input
                className="app-input"
                value={emailForm.replyTo}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, replyTo: event.target.value }))}
                placeholder="Boşsa gönderici kullanılır"
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Test alıcısı</div>
              <input
                className="app-input"
                value={emailForm.testRecipient}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, testRecipient: event.target.value }))}
                placeholder="test@firma.com"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr,auto]">
            <button type="button" className="app-btn-primary" onClick={saveOrderEmailSettings}>
              Kaydet
            </button>
            <button
              type="button"
              className="app-btn-secondary"
              onClick={async () => {
                try {
                  await saveOrderEmailSettings();
                  setEmailStatus('Test e-postası gönderiliyor...');
                  await sendTestOrderEmail();
                } catch (err) {
                  setEmailStatus(err.message);
                }
              }}
            >
              Test gönder
            </button>
          </div>

          <div className="app-soft-panel p-4 text-sm">
            Gmail için 2 adımlı doğrulama açıp uygulama parolası kullanman gerekir.
          </div>

          {emailStatus ? <div className="app-soft-panel px-4 py-3 text-sm">{emailStatus}</div> : null}
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {[
            `Durum: ${emailForm.enabled ? 'Aktif' : 'Pasif'}`,
            `SMTP: ${emailForm.smtpHost || '-'}:${emailForm.smtpPort || '-'}`,
            `Gönderici: ${emailForm.senderEmail || emailForm.smtpUser || '-'}`,
            `Alıcılar: ${emailForm.recipientEmails || '-'}`
          ].map((item, index) => (
            <div key={`email-${index}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      )
    },
    theme: {
      title: 'Marka varlıkları',
      description: 'Login ekranı, navbar ve tüm uygulama zemini için kullanılan logo ve arka plan görselleri ile kurumsal renk paleti burada belirlenir.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Uygulama logosu</div>
                <input
                  className="app-input"
                  placeholder="/nevres.png"
                  value={brandingForm.appLogo}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, appLogo: e.target.value }))}
                />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Genel arka plan</div>
                <input
                  className="app-input"
                  placeholder="/showroom-bg.png"
                  value={brandingForm.appBackground}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, appBackground: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-[color:var(--app-border)] bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Logo önizleme</div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="app-login-logo-wrap h-16 w-16">
                    <img src={brandingForm.appLogo || '/nevres.png'} alt="Logo önizleme" className="app-login-logo" />
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-[color:var(--app-border)] bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Arka plan önizleme</div>
                <div
                  className="mt-4 h-24 rounded-2xl border border-[color:var(--app-border)] bg-cover bg-center"
                  style={{ backgroundImage: `url('${brandingForm.appBackground || '/showroom-bg.png'}')` }}
                />
              </div>
            </div>
          </div>

          {Object.values(palettes).map((palette) => (
            <button
              key={palette.id}
              type="button"
              onClick={async () => {
                const response = await fetch('/api/admin/theme-settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', ...authHeaders() },
                  body: JSON.stringify({
                    activePalette: palette.id,
                    appLogo: brandingForm.appLogo,
                    appBackground: brandingForm.appBackground
                  })
                });
                const result = await response.json();
                if (response.ok && result.success) {
                  setActivePalette(palette.id);
                  setAppLogo(result.data.appLogo);
                  setAppBackground(result.data.appBackground);
                  setThemeStatus(`${palette.name} etkinleştirildi.`);
                }
              }}
              className="w-full rounded-3xl border p-4 text-left"
              style={{
                borderColor: activePalette === palette.id ? 'var(--app-primary)' : 'var(--app-border)',
                background: activePalette === palette.id ? 'color-mix(in srgb, var(--app-primary) 10%, white 90%)' : 'transparent'
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-[color:var(--app-text)]">{palette.name}</div>
                </div>
                <div className="flex gap-2">
                  {Object.values(palette.colors).slice(0, 4).map((color) => (
                    <span key={color} className="h-6 w-6 rounded-full border border-white/40" style={{ background: color }} />
                  ))}
                </div>
              </div>
            </button>
          ))}
          <button
            type="button"
            className="app-btn-primary"
            onClick={async () => {
              const response = await fetch('/api/admin/theme-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                  activePalette,
                  appLogo: brandingForm.appLogo,
                  appBackground: brandingForm.appBackground
                })
              });
              const result = await response.json();
              if (response.ok && result.success) {
                setAppLogo(result.data.appLogo);
                setAppBackground(result.data.appBackground);
                setThemeStatus('Logo ve arka plan güncellendi.');
              }
            }}
          >
            Logo ve arka planı kaydet
          </button>
          {themeStatus ? <div className="app-soft-panel px-4 py-3 text-sm">{themeStatus}</div> : null}
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {Object.values(palettes).map((palette) => (
            <div key={palette.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              {palette.name}
            </div>
          ))}
        </div>
      )
    },
    labels: {
      title: 'Etiket Tasarımcısı',
      description: 'Baskı düzenini örnek içerikle ayarlayabileceğiniz sade tasarım alanı.',
      fullWidth: true,
      content: <LabelDesignerPanel />
    },
    genel: {
      title: 'Genel Ayarlar',
      description: 'Müşteri görünümü ve uygulama geneli davranış ayarları.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4 space-y-4">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">Müşteri (public) görünümü</div>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">Satış fiyatı kâr yüzdesi</div>
                <div className="mt-0.5 text-xs text-slate-500">Maliyet üzerine uygulanacak kâr oranı. Örn: 20 girersen maliyet ×1.20 olarak gösterilir.</div>
              </div>
              <input
                type="number" min="0" max="999" step="1"
                className="app-input w-24 text-right"
                value={genelAyarlar.karYuzdesi ?? 0}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, karYuzdesi: Number(e.target.value) || 0 })} />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">Kumaş Hikayesini göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında Kumaş Hikayesi bölümü görünsün.</div>
              </div>
              <ToggleSwitch
                id="switch-public-hikaye"
                checked={genelAyarlar.publicHikayeGoster !== false}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicHikayeGoster: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">Hammadde bilgisini göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında iplik reçetesi görünsün.</div>
              </div>
              <ToggleSwitch
                id="switch-public-hammadde"
                checked={genelAyarlar.publicHammaddeGoster !== false}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicHammaddeGoster: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">Proses bilgisini göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında üretim prosesleri görünsün.</div>
              </div>
              <ToggleSwitch
                id="switch-public-proses"
                checked={genelAyarlar.publicProsesGoster}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicProsesGoster: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">1 kg satış fiyatını göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında ve arama sonucunda satış fiyatı görünsün.</div>
              </div>
              <ToggleSwitch
                id="switch-public-fiyat"
                checked={genelAyarlar.publicFiyatGoster}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicFiyatGoster: e.target.checked })}
              />
            </label>
          </div>
          {genelAyarlarStatus ? <div className="app-soft-panel px-4 py-3 text-sm">{genelAyarlarStatus}</div> : null}
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3">
          {[
            `Hikaye görünürlüğü: ${genelAyarlar.publicHikayeGoster !== false ? 'Açık' : 'Kapalı'}`,
            `Hammadde görünürlüğü: ${genelAyarlar.publicHammaddeGoster !== false ? 'Açık' : 'Kapalı'}`,
            `Proses görünürlüğü: ${genelAyarlar.publicProsesGoster ? 'Açık' : 'Kapalı'}`,
            `Fiyat görünürlüğü: ${genelAyarlar.publicFiyatGoster ? 'Açık' : 'Kapalı'}`,
            `Kâr yüzdesi: %${genelAyarlar.karYuzdesi ?? 0}`
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">{item}</div>
          ))}
        </div>
      ),
    },
    sifre: {
      title: 'Şifre Değiştir',
      description: 'Mevcut şifrenizi doğrulayıp yeni şifre belirleyin.',
      form: (
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="app-soft-panel p-4 text-sm text-[color:var(--app-text-muted)]">
            Kullanıcı: <span className="font-semibold text-[color:var(--app-text)]">{getSession()?.username}</span>
          </div>
          <input type="password" className="app-input" placeholder="Mevcut şifre" required
            value={pwForm.current} onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))} />
          <input type="password" className="app-input" placeholder="Yeni şifre (en az 4 karakter)" required
            value={pwForm.next} onChange={(e) => setPwForm(p => ({ ...p, next: e.target.value }))} />
          <input type="password" className="app-input" placeholder="Yeni şifre tekrar" required
            value={pwForm.confirm} onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          {pwStatus && (
            <div className="app-soft-panel px-4 py-3 text-sm" style={{ color: pwStatus.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
              {pwStatus}
            </div>
          )}
          <button type="submit" className="app-btn-primary" disabled={pwLoading}>
            {pwLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      ),
      list: (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            Yeni şifreniz en az 4 karakter olmalıdır.
          </div>
          <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            Şifrenizi değiştirdikten sonra giriş ekranında otomatik olarak yeni uzunlukta kutular görünecektir.
          </div>
        </div>
      )
    },
    system: {
      title: 'Operasyon merkezi',
      description: 'Yedekleme, veri temizleme ve temel operasyon göstergeleri.',
      form: (
        <div className="space-y-3">
          <button onClick={handleBackup} disabled={loading} className="w-full rounded-2xl bg-green-500 px-4 py-3 text-white hover:bg-green-600 disabled:bg-gray-400">
            Veritabanını yedekle
          </button>
          <button onClick={handleCleanDatabase} disabled={loading} className="w-full rounded-2xl bg-red-500 px-4 py-3 text-white hover:bg-red-600 disabled:bg-gray-400">
            Tüm verileri temizle
          </button>
          {backupStatus ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{backupStatus}</div> : null}
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {[
            `Toplam siparis: ${systemStats.totalSiparis || 0}`,
            `Kayitli firma: ${systemStats.totalFirma || 0}`,
            `Toplam mamul: ${systemStats.totalMamul || 0}`,
            `Kullanici sayisi: ${systemStats.totalKullanici || 0}`
          ].map((item, index) => (
            <div key={`system-${index}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      )
    }
  })[activeTab];

  const drawer = (
    <AnimatePresence>
      {drawerOpen ? (
        <motion.div
          className="app-drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: defaultEase }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDrawerOpen(false);
            }
          }}
        >
          <motion.div
            className="app-drawer-panel"
            initial={{ x: '100%', opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 1 }}
            transition={sheetTransition}
          >
            <div className="app-drawer-header">
              <motion.button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="app-nav-icon-button"
                aria-label="Menüyü kapat"
                title="Menüyü kapat"
                whileTap={tapMotion}
              >
                <CloseIcon />
              </motion.button>
            </div>

            <div className="app-drawer-list">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setDrawerOpen(false);
                  }}
                  className={`app-drawer-link ${activeTab === tab.id ? 'is-active' : ''}`}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2, delay: 0.04 + (index * 0.025), ease: defaultEase }}
                  whileTap={tapMotion}
                >
                  {tab.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div>

        {current.fullWidth ? (
          <section className="app-reveal-up app-reveal-delay-1">
            {current.content}
          </section>
        ) : (
          <section className="app-panel p-6 app-reveal-up app-reveal-delay-1">
            <div className="grid gap-8 xl:grid-cols-[0.95fr,1.05fr]">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{current.title}</h2>
                {current.description ? (
                  <p className="mt-3 text-sm text-slate-600">{current.description}</p>
                ) : null}
                <div className="mt-6">{current.form}</div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {activeTab === 'excel' ? 'Son senkronlar' : activeTab === 'email' ? 'Bağlantı özeti' : 'Mevcut tanımlar'}
                </h3>
                {current.list}
              </div>
            </div>
          </section>
        )}

      {typeof document !== 'undefined' ? createPortal(drawer, document.body) : null}
    </div>
  );
};

export default SettingsPage;
