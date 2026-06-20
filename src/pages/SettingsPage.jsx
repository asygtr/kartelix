import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useGenelAyarlar } from '../theme/ThemeProvider';
import { palettes } from '../theme/palettes';
import LabelDesignerPanel from '../components/LabelDesignerPanel';
import DesktopOnlyGuard from '../components/DesktopOnlyGuard';
import { X } from '../components/icons.jsx';
import { useToast } from '../components/Toast';

const tabs = [
  { id: 'genel', label: 'Genel Ayarlar' },
  { id: 'excel', label: 'Excel Senkron' },
  { id: 'email', label: 'Sipariş E-posta' },
  { id: 'theme', label: 'Marka Varlıkları' },
  { id: 'labels', label: 'Etiket Tasarımcısı' },
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

  const [activeTab, setActiveTab] = useState(null);
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
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { genelAyarlar, loadGenelAyarlar, saveGenelAyarlar } = useGenelAyarlar();
  const { show: showToast } = useToast();

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setSystemStats(data);
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err);
    }
  };

  const loadDefinitions = async () => {
    const [typesResponse, colorsResponse, yarnsResponse, processesResponse] = await Promise.all([
      fetch('/api/admin/mamul-turleri'),
      fetch('/api/admin/renkler'),
      fetch('/api/admin/iplikler'),
      fetch('/api/admin/prosesler')
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
    const settingsResponse = await fetch('/api/admin/excel-settings');
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
    const response = await fetch('/api/admin/order-email-settings');
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
  }, []);

  useEffect(() => {
    setBrandingForm({
      appLogo: appLogo || '/nevres.png',
      appBackground: appBackground || '/showroom-bg.png'
    });
  }, [appLogo, appBackground]);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerVisible(true);
      return undefined;
    }

    const timeout = setTimeout(() => setDrawerVisible(false), 260);
    return () => clearTimeout(timeout);
  }, [drawerOpen]);

  useEffect(() => {
    const openSettingsMenu = () => setDrawerOpen(true);
    window.addEventListener('settings-menu:open', openSettingsMenu);
    return () => window.removeEventListener('settings-menu:open', openSettingsMenu);
  }, []);

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
      await fetch('/api/backup', { method: 'POST' });
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
      fetch('/api/clean-database', { method: 'POST' })
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollMs: Number(excelPollMs || 0) })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Excel okuma sıklığı kaydedilemedi');
    }
    setExcelStatus('Excel okuma sıklığı kaydedildi.');
    await loadExcelSettings();
  };

  const runExcelSync = async () => {
    const response = await fetch('/api/admin/excel-sync/run', { method: 'POST' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Excel senkronizasyonu çalıştırılamadı');
    }
    setExcelStatus('Excel senkronizasyonu tamamlandı.');
    setExcelSyncStatus(result.data);
    await loadDefinitions();
  };

  const saveOrderEmailSettings = async () => {
    const response = await fetch('/api/admin/order-email-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
      smtpPassword: prev.smtpPassword  // parolayı state'den silme
    }));
    setEmailStatus('E-posta ayarları kaydedildi.');
  };

  const sendTestOrderEmail = async () => {
    const response = await fetch('/api/admin/order-email-settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <input type="checkbox" checked={processForm.renkBazli} onChange={(e) => setProcessForm((prev) => ({ ...prev, renkBazli: e.target.checked }))} />
            Renk bazlı proses
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
      title: 'Excel senkronizasyonu',
      description: 'Mamül, ürün grubu, renk, iplik, proses ve fiyat verileri yalnızca xls klasöründeki ÜRGE Excel dosyalarından okunur.',
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
                    setExcelStatus('Excel senkronizasyonu çalıştırılıyor...');
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
            {excelStatus ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{excelStatus}</div> : null}
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
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Henüz ÜRGE Excel okuma sonucu yok.</div>
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
      form: <EmailForm emailForm={emailForm} setEmailForm={setEmailForm} emailStatus={emailStatus} setEmailStatus={setEmailStatus} saveOrderEmailSettings={saveOrderEmailSettings} sendTestOrderEmail={sendTestOrderEmail} />,
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
                  headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
      content: <DesktopOnlyGuard pageName="Etiket Tasarımcısı"><LabelDesignerPanel /></DesktopOnlyGuard>
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
                <div className="text-sm font-medium text-[color:var(--app-text)]">Proses bilgisini göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında üretim prosesleri görünsün.</div>
              </div>
              <input type="checkbox" checked={genelAyarlar.publicProsesGoster}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicProsesGoster: e.target.checked }, () => showToast('Ayar kaydedildi.', 'success'), (err) => showToast(err, 'error'))} />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">1 kg satış fiyatını göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında ve arama sonucunda satış fiyatı görünsün.</div>
              </div>
              <input type="checkbox" checked={genelAyarlar.publicFiyatGoster}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicFiyatGoster: e.target.checked }, () => showToast('Ayar kaydedildi.', 'success'), (err) => showToast(err, 'error'))} />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">Kumaş Hikayesini göster</div>
                <div className="mt-0.5 text-xs text-slate-500">Müşteri QR/link sayfasında Kumaş Hikayesi bölümü görünsün.</div>
              </div>
              <input type="checkbox" checked={genelAyarlar.publicHikayeGoster !== false}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicHikayeGoster: e.target.checked }, () => showToast('Ayar kaydedildi.', 'success'), (err) => showToast(err, 'error'))} />
            </label>
          </div>
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3">
          {[
            `Proses görünürlüğü: ${genelAyarlar.publicProsesGoster ? 'Açık' : 'Kapalı'}`,
            `Fiyat görünürlüğü: ${genelAyarlar.publicFiyatGoster ? 'Açık' : 'Kapalı'}`,
            `Hikaye görünürlüğü: ${genelAyarlar.publicHikayeGoster !== false ? 'Açık' : 'Kapalı'}`
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">{item}</div>
          ))}
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


  // Mobilde (< 768px) landing yerine drawer aç — sadece event ile tetiklenir, auto-open yok

  const drawerPortal = drawerVisible ? createPortal(
    <div
      className={`app-drawer-overlay ${drawerOpen ? 'is-open' : 'is-closing'}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) setDrawerOpen(false);
      }}
    >
      <div className={`app-drawer-panel ${drawerOpen ? 'is-open' : 'is-closing'}`}>
        <div className="app-drawer-header">
          <button type="button" onClick={() => setDrawerOpen(false)} className="app-nav-icon-button" aria-label="Menüyü kapat" title="Menüyü kapat">
            <CloseIcon />
          </button>
        </div>
        <div className="app-drawer-list">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setDrawerOpen(false); }}
              className={`app-drawer-link ${activeTab === tab.id ? 'is-active' : ''} ${drawerOpen ? 'is-open' : 'is-closing'}`}
              style={{ animationDelay: `${80 + index * 55}ms` }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (!activeTab) return (
    <div className="space-y-6">
      {drawerPortal}
      <section className="app-panel p-6 app-reveal-up app-reveal-delay-1">
        <div className="app-chip mb-4">Ayarlar</div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Ne yapmak istiyorsun?</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="text-left rounded-2xl border px-5 py-4 transition hover:border-[color:var(--app-accent)]"
              style={{ borderColor: 'var(--app-border)', background: 'rgba(255,253,248,0.7)' }}
            >
              <div className="font-semibold text-[color:var(--app-text)]">{tab.label}</div>
              <div className="mt-1 text-xs text-slate-500">
                {tab.id === 'genel' && 'Public görünüm, hikaye, fiyat ve proses ayarları'}
                {tab.id === 'excel' && 'Excel dosyası okuma sıklığı ve senkronizasyon'}
                {tab.id === 'email' && 'SMTP, alıcılar ve otomatik sipariş bildirimi'}
                {tab.id === 'theme' && 'Logo, arka plan ve renk paleti'}
                {tab.id === 'labels' && 'Baskı düzeni ve etiket tasarımı'}
                {tab.id === 'system' && 'Yedekleme, veri temizleme ve istatistikler'}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      {drawerPortal}
      {current.fullWidth ? (
        <section className="app-reveal-up app-reveal-delay-1">
          <div className="flex items-center gap-3 mb-4">
            <button type="button" onClick={() => setActiveTab(null)} className="app-btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>← Geri</button>
            <div className="app-chip">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
          </div>
          {current.content}
        </section>
      ) : (
        <section className="app-panel p-6 app-reveal-up app-reveal-delay-1">
          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={() => setActiveTab(null)} className="app-btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>← Geri</button>
            <div className="app-chip">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
          </div>
          <div className="grid gap-8 xl:grid-cols-[0.95fr,1.05fr]">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{current.title}</h2>
              <div className="mt-6">{current.form}</div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {activeTab === 'excel' ? 'Kayıtlar ve son senkronlar' : activeTab === 'email' ? 'Bağlantı özeti' : 'Mevcut tanımlar'}
              </h3>
              {current.list}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const Accordion = ({ title, hint, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--app-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        style={{ background: open ? 'color-mix(in srgb, var(--app-primary) 6%, white 94%)' : 'rgba(255,253,248,0.7)' }}
      >
        <div>
          <div className="font-semibold text-sm text-[color:var(--app-text)]">{title}</div>
          {hint && !open && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-3 space-y-3 border-t" style={{ borderColor: 'var(--app-border)' }}>{children}</div>}
    </div>
  );
};

const EmailForm = ({ emailForm, setEmailForm, emailStatus, setEmailStatus, saveOrderEmailSettings, sendTestOrderEmail }) => (
  <div className="space-y-3">
    <div className="app-soft-panel p-4">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-[color:var(--app-text)]">Otomatik sipariş e-postası</span>
        <input type="checkbox" checked={emailForm.enabled} onChange={(e) => setEmailForm(p => ({ ...p, enabled: e.target.checked }))} />
      </label>
    </div>

    <Accordion title="SMTP Sunucu Ayarları" hint={`${emailForm.smtpHost || 'Tanımlanmadı'}:${emailForm.smtpPort || '-'}`}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Sunucu</div>
          <input className="app-input" value={emailForm.smtpHost} onChange={(e) => setEmailForm(p => ({ ...p, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Port</div>
          <input className="app-input" value={emailForm.smtpPort} onChange={(e) => setEmailForm(p => ({ ...p, smtpPort: e.target.value }))} placeholder="587" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Güvenlik</div>
          <select className="app-select" value={emailForm.smtpSecure ? 'ssl' : 'starttls'} onChange={(e) => setEmailForm(p => ({ ...p, smtpSecure: e.target.value === 'ssl' }))}>
            <option value="starttls">STARTTLS / 587</option>
            <option value="ssl">SSL / 465</option>
          </select>
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">SMTP Kullanıcı</div>
          <input className="app-input" value={emailForm.smtpUser} onChange={(e) => setEmailForm(p => ({ ...p, smtpUser: e.target.value }))} placeholder="adres@gmail.com" />
        </label>
        <label className="block md:col-span-2">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Uygulama Parolası</div>
          <input type="password" className="app-input" value={emailForm.smtpPassword} onChange={(e) => setEmailForm(p => ({ ...p, smtpPassword: e.target.value }))} placeholder="Uygulama parolası" />
        </label>
      </div>
      <div className="text-xs text-slate-500 pt-1">Gmail için 2 adımlı doğrulama açıp uygulama parolası kullanman gerekir.</div>
    </Accordion>

    <Accordion title="Gönderici Bilgileri" hint={emailForm.senderEmail || 'Tanımlanmadı'}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Gönderici Adı</div>
          <input className="app-input" value={emailForm.senderName} onChange={(e) => setEmailForm(p => ({ ...p, senderName: e.target.value }))} placeholder="Kartelix Siparis" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Gönderici E-posta</div>
          <input className="app-input" value={emailForm.senderEmail} onChange={(e) => setEmailForm(p => ({ ...p, senderEmail: e.target.value }))} placeholder="adres@gmail.com" />
        </label>
        <label className="block md:col-span-2">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Yanıt Adresi</div>
          <input className="app-input" value={emailForm.replyTo} onChange={(e) => setEmailForm(p => ({ ...p, replyTo: e.target.value }))} placeholder="Boşsa gönderici kullanılır" />
        </label>
      </div>
    </Accordion>

    <Accordion title="Alıcı Listesi" hint={emailForm.recipientEmails ? `${emailForm.recipientEmails.split(/[;,]/).filter(Boolean).length} adres` : 'Tanımlanmadı'}>
      <label className="block">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Siparişi Alan Adresler</div>
        <textarea className="app-input min-h-[80px]" value={emailForm.recipientEmails} onChange={(e) => setEmailForm(p => ({ ...p, recipientEmails: e.target.value }))} placeholder="siparis@firma.com; ikinci@firma.com" />
      </label>
      <label className="block">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Onay Bildirimi Adresleri</div>
        <textarea className="app-input min-h-[72px]" value={emailForm.approvalEmails} onChange={(e) => setEmailForm(p => ({ ...p, approvalEmails: e.target.value }))} placeholder="onay@firma.com; uretim@firma.com" />
        <div className="mt-1 text-xs text-slate-500">Sipariş tamamlandığında bu adreslere kurumsal onay bildirimi gönderilir.</div>
      </label>
      <div className="app-soft-panel p-3">
        <label className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[color:var(--app-text)]">Onay mailinde fiyatları göster</div>
            <div className="mt-0.5 text-xs text-slate-500">Kapalıysa tutar ve birim fiyat sütunları yer almaz.</div>
          </div>
          <input type="checkbox" checked={emailForm.approvalShowPrices} onChange={(e) => setEmailForm(p => ({ ...p, approvalShowPrices: e.target.checked }))} />
        </label>
      </div>
    </Accordion>

    <Accordion title="Test & Kaydet" hint="Bağlantıyı doğrula">
      <label className="block">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Test Alıcısı</div>
        <input className="app-input" value={emailForm.testRecipient} onChange={(e) => setEmailForm(p => ({ ...p, testRecipient: e.target.value }))} placeholder="test@firma.com" />
      </label>
      <div className="grid gap-3 md:grid-cols-[1fr,auto]">
        <button type="button" className="app-btn-primary" onClick={saveOrderEmailSettings}>Kaydet</button>
        <button type="button" className="app-btn-secondary" onClick={async () => {
          try {
            await saveOrderEmailSettings();
            setEmailStatus('Test e-postası gönderiliyor...');
            await sendTestOrderEmail();
          } catch (err) { setEmailStatus(err.message); }
        }}>Test gönder</button>
      </div>
      {emailStatus ? <div className="app-soft-panel px-4 py-3 text-sm">{emailStatus}</div> : null}
    </Accordion>
  </div>
);

export default SettingsPage;

