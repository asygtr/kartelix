import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { palettes } from '../theme/palettes';
import LabelDesignerPanel from '../components/LabelDesignerPanel';
import { X, Menu } from '../components/icons.jsx';

const tabs = [
  { id: 'genel', label: 'Genel Ayarlar' },
  { id: 'excel', label: 'Excel Senkron' },
  { id: 'email', label: 'SipariÅŸ E-posta' },
  { id: 'theme', label: 'Marka VarlÄ±klarÄ±' },
  { id: 'labels', label: 'Etiket TasarÄ±mcÄ±sÄ±' },
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
const MenuIcon  = () => <Menu className="app-nav-icon-svg" />;

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

  const [activeTab, setActiveTab] = useState('excel');
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
  const [genelAyarlar, setGenelAyarlar] = useState({ publicProsesGoster: false, publicFiyatGoster: false });
  const [genelAyarlarStatus, setGenelAyarlarStatus] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const loadGenelAyarlar = async () => {
    try {
      const r = await fetch('/api/genel-ayarlar');
      const d = await r.json();
      if (d.success) setGenelAyarlar(d.data);
    } catch {}
  };

  const saveGenelAyarlar = async (next) => {
    try {
      const r = await fetch('/api/genel-ayarlar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });
      const d = await r.json();
      if (d.success) { setGenelAyarlar(d.data); setGenelAyarlarStatus('Kaydedildi.'); }
      else setGenelAyarlarStatus('KayÄ±t baÅŸarÄ±sÄ±z.');
    } catch { setGenelAyarlarStatus('Hata oluÅŸtu.'); }
    setTimeout(() => setGenelAyarlarStatus(''), 2500);
  };

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setSystemStats(data);
    } catch (err) {
      console.error('Ä°statistikler yÃ¼klenemedi:', err);
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
      lastError: 'Durum bilgisi bu ekranda gÃ¶sterilmiyor',
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
    loadGenelAyarlar();
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
    setBackupStatus('Yedekleme yapÄ±lÄ±yor...');
    try {
      await fetch('/api/backup', { method: 'POST' });
      setBackupStatus('Yedekleme baÅŸarÄ±lÄ±.');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch {
      setBackupStatus('Yedekleme baÅŸarÄ±sÄ±z.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDatabase = () => {
    if (window.confirm('TÃœM veriler silinecek. Emin misiniz?\nBu iÅŸlem geri alÄ±namaz!')) {
      setLoading(true);
      fetch('/api/clean-database', { method: 'POST' })
        .then(() => {
          alert('VeritabanÄ± temizlendi.');
          loadSystemStats();
        })
        .catch(() => {
          alert('Temizleme baÅŸarÄ±sÄ±z.');
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
      throw new Error(result.error || 'KayÄ±t oluÅŸturulamadÄ±');
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
      throw new Error(result.error || 'KayÄ±t gÃ¼ncellenemedi');
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
      throw new Error(result.error || 'Excel okuma sÄ±klÄ±ÄŸÄ± kaydedilemedi');
    }
    setExcelStatus('Excel okuma sÄ±klÄ±ÄŸÄ± kaydedildi.');
    await loadExcelSettings();
  };

  const runExcelSync = async () => {
    const response = await fetch('/api/admin/excel-sync/run', { method: 'POST' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Excel senkronizasyonu Ã§alÄ±ÅŸtÄ±rÄ±lamadÄ±');
    }
    setExcelStatus('Excel senkronizasyonu tamamlandÄ±.');
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
      throw new Error(result.error || 'E-posta ayarlarÄ± kaydedilemedi');
    }

    setEmailForm((prev) => ({
      ...prev,
      ...result.data,
      smtpPort: String(result.data.smtpPort || 587),
      smtpPassword: ''
    }));
    setEmailStatus('E-posta ayarlarÄ± kaydedildi.');
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
      throw new Error(`${prefix}${result.error || 'Test e-postasÄ± gÃ¶nderilemedi'}${codeSuffix}${stageSuffix}${responseSuffix}`);
    }

    const accepted = result.data?.accepted?.join(', ') || emailForm.testRecipient || '-';
    setEmailStatus(`Test e-postasÄ± gÃ¶nderildi: ${accepted}`);
  };

  const renderDefinitionList = (items, activeId, onSelect, renderText) => (
    <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">HenÃ¼z kayÄ±t yok.</div>
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
      title: 'ÃœrÃ¼n gruplarÄ±',
      description: 'Article no oluÅŸurken kullanÄ±lan prefix yapÄ±sÄ± burada tanÄ±mlanÄ±r. Listeden seÃ§ilen tanÄ±m aynÄ± form iÃ§inde dÃ¼zenlenir.',
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
              {editingTypeId ? 'ÃœrÃ¼n grubunu dÃ¼zenle' : 'Yeni Ã¼rÃ¼n grubu ekle'}
            </div>
            {editingTypeId ? <button type="button" onClick={resetTypeForm} className="app-btn-secondary">Ä°ptal</button> : null}
          </div>
          <input className="app-input" placeholder="TÃ¼r adÄ±" value={typeForm.ad} onChange={(e) => setTypeForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Kod prefix (10, 20, 3 gibi)" value={typeForm.kodPrefix} onChange={(e) => setTypeForm((prev) => ({ ...prev, kodPrefix: e.target.value }))} />
          <textarea className="app-textarea min-h-24" placeholder="AÃ§Ä±klama" value={typeForm.aciklama} onChange={(e) => setTypeForm((prev) => ({ ...prev, aciklama: e.target.value }))} />
          <button type="submit" className="app-btn-primary">
            {editingTypeId ? 'ÃœrÃ¼n grubunu gÃ¼ncelle' : 'MamÃ¼l tÃ¼rÃ¼ ekle'}
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
      description: 'MamÃ¼l tanÄ±tÄ±m ekranÄ±nda seÃ§ilecek standart renk ve renk kodlarÄ± burada tanÄ±mlanÄ±r. Listeden seÃ§ilen renk aynÄ± formda dÃ¼zenlenir.',
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
              {editingColorId ? 'Rengi dÃ¼zenle' : 'Yeni renk ekle'}
            </div>
            {editingColorId ? <button type="button" onClick={resetColorForm} className="app-btn-secondary">Ä°ptal</button> : null}
          </div>
          <input className="app-input" placeholder="Renk adÄ±" value={colorForm.ad} onChange={(e) => setColorForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Renk kodu" value={colorForm.kod} onChange={(e) => setColorForm((prev) => ({ ...prev, kod: e.target.value }))} />
          <button type="submit" className="app-btn-primary">
            {editingColorId ? 'Rengi gÃ¼ncelle' : 'Renk ekle'}
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
      title: 'Ä°plik tanÄ±mÄ±',
      description: 'Ä°plik adÄ±, kodu, birimi ve varsayÄ±lan fiyatÄ± burada tanÄ±mlanÄ±r. MamÃ¼l reÃ§etesinde bu hazÄ±r iplik kartlarÄ± kullanÄ±lÄ±r.',
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
              {editingYarnId ? 'Ä°pliÄŸi dÃ¼zenle' : 'Yeni iplik ekle'}
            </div>
            {editingYarnId ? <button type="button" onClick={resetYarnForm} className="app-btn-secondary">Ä°ptal</button> : null}
          </div>
          <input className="app-input" placeholder="Ä°plik adÄ±" value={yarnForm.ad} onChange={(e) => setYarnForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Ä°plik kodu" value={yarnForm.kod} onChange={(e) => setYarnForm((prev) => ({ ...prev, kod: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="app-input" placeholder="Birim" value={yarnForm.birim} onChange={(e) => setYarnForm((prev) => ({ ...prev, birim: e.target.value }))} />
            <input className="app-input" placeholder="Birim fiyat" value={yarnForm.birimFiyat} onChange={(e) => setYarnForm((prev) => ({ ...prev, birimFiyat: e.target.value }))} />
          </div>
          <button type="submit" className="app-btn-primary">
            {editingYarnId ? 'Ä°pliÄŸi gÃ¼ncelle' : 'Ä°plik ekle'}
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
      description: 'Boyama, finisaj ve diÄŸer Ã¼retim adÄ±mlarÄ± burada tanÄ±mlanÄ±r; listeden seÃ§ilen proses aynÄ± formda dÃ¼zenlenir.',
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
              {editingProcessId ? 'Prosesi dÃ¼zenle' : 'Yeni proses ekle'}
            </div>
            {editingProcessId ? <button type="button" onClick={resetProcessForm} className="app-btn-secondary">Ä°ptal</button> : null}
          </div>
          <input className="app-input" placeholder="Proses adÄ±" value={processForm.ad} onChange={(e) => setProcessForm((prev) => ({ ...prev, ad: e.target.value }))} />
          <input className="app-input" placeholder="Proses tipi" value={processForm.tip} onChange={(e) => setProcessForm((prev) => ({ ...prev, tip: e.target.value }))} />
          <input className="app-input" placeholder="Birim maliyet" value={processForm.birimMaliyet} onChange={(e) => setProcessForm((prev) => ({ ...prev, birimMaliyet: e.target.value }))} />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <input type="checkbox" checked={processForm.renkBazli} onChange={(e) => setProcessForm((prev) => ({ ...prev, renkBazli: e.target.checked }))} />
            Renk bazlÄ± proses
          </label>
          <button type="submit" className="app-btn-primary">
            {editingProcessId ? 'Prosesi gÃ¼ncelle' : 'Proses ekle'}
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
      description: 'MamÃ¼l, Ã¼rÃ¼n grubu, renk, iplik, proses ve fiyat verileri yalnÄ±zca xls klasÃ¶rÃ¼ndeki ÃœRGE Excel dosyalarÄ±ndan okunur.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4 space-y-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">Excel tek kaynak</div>
            <div className="text-sm text-slate-600">
              Uygulama manuel tanÄ±m kabul etmez. Dosyalar otomatik olarak xls klasÃ¶rÃ¼nden okunur; article, Ã¼rÃ¼n adÄ±,
              iplik yÃ¼zdeleri, iplik fiyatlarÄ±, prosesler ve 1 kg fiyat hesaplarÄ± Excel'den gelir.
            </div>
          </div>

          <div className="app-soft-panel p-4 space-y-3">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">Okuma sÄ±klÄ±ÄŸÄ±</div>
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
                SÄ±klÄ±ÄŸÄ± kaydet
              </button>
            </div>
            <div className="text-xs text-slate-500">Milisaniye cinsinden yazÄ±n. Ã–rnek: 60000 = 60 saniye.</div>
          </div>

          <div className="app-soft-panel p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--app-text)]">Senkron durumu</div>
                <div className="text-xs text-slate-500">Son Ã§alÄ±ÅŸma: {excelSyncStatus?.lastRunAt || '-'}</div>
              </div>
              <button
                type="button"
                className="app-btn-primary"
                onClick={async () => {
                  try {
                    setExcelStatus('Excel senkronizasyonu Ã§alÄ±ÅŸtÄ±rÄ±lÄ±yor...');
                    await runExcelSync();
                  } catch (err) {
                    setExcelStatus(err.message);
                  }
                }}
              >
                Åimdi oku
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                KlasÃ¶r: {excelSyncStatus?.directory || '-'}
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
              <div className="font-semibold text-[color:var(--app-text)]">Son ÃœRGE okumasÄ±</div>
              <div className="mt-1 text-slate-600">
                AktarÄ±lan satÄ±r: {excelSyncStatus.urgeLastResult.importedRows || 0} / Atlanan satÄ±r: {excelSyncStatus.urgeLastResult.skippedRows || 0}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">HenÃ¼z ÃœRGE Excel okuma sonucu yok.</div>
          )}

          {excelSyncStatus?.urgeLastResult?.files?.map((item) => (
            <div key={`urge-${item.fileName}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-[color:var(--app-text)]">{item.fileName}</div>
              <div className="mt-1 text-slate-600">
                Prefix: {item.typePrefix || '-'} / AktarÄ±lan: {item.importedRows || 0} / Atlanan: {item.skippedRows || 0}
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
                  {snapshot.summary?.message || '-'} / satÄ±r: {snapshot.summary?.importedRows ?? 0}
                </div>
              </div>
            ))
          ) : null}
        </div>
      )
    },
    email: {
      title: 'SipariÅŸ e-postasÄ±',
      description: 'SipariÅŸ maili iÃ§in Gmail SMTP ve alÄ±cÄ± listesi.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[color:var(--app-text)]">Otomatik sipariÅŸ e-postasÄ±</span>
              <input
                type="checkbox"
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
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">GÃ¼venlik</div>
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
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">GÃ¶nderici adÄ±</div>
              <input
                className="app-input"
                value={emailForm.senderName}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, senderName: event.target.value }))}
                placeholder="Kartelix Siparis"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">GÃ¶nderici e-posta</div>
              <input
                className="app-input"
                value={emailForm.senderEmail}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, senderEmail: event.target.value }))}
                placeholder="adres@gmail.com"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SMTP kullanÄ±cÄ±</div>
              <input
                className="app-input"
                value={emailForm.smtpUser}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpUser: event.target.value }))}
                placeholder="adres@gmail.com"
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SMTP parola / uygulama parolasÄ±</div>
              <input
                type="password"
                className="app-input"
                value={emailForm.smtpPassword}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, smtpPassword: event.target.value }))}
                placeholder={emailForm.smtpPassword ? '' : 'Uygulama parolasÄ±'}
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SipariÅŸi alan e-posta adresleri</div>
              <textarea
                className="app-input min-h-[96px]"
                value={emailForm.recipientEmails}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, recipientEmails: event.target.value }))}
                placeholder="siparis@firma.com; ikinci@firma.com"
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">SipariÅŸ onay e-posta adresleri</div>
              <textarea
                className="app-input min-h-[80px]"
                value={emailForm.approvalEmails}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, approvalEmails: event.target.value }))}
                placeholder="onay@firma.com; uretim@firma.com"
              />
              <div className="mt-1 text-xs text-slate-500">SipariÅŸ tamamlandÄ±ÄŸÄ±nda bu adreslere kurumsal onay bildirimi gÃ¶nderilir.</div>
            </label>
            <div className="app-soft-panel p-4">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--app-text)]">Onay mailinde fiyatlarÄ± gÃ¶ster</div>
                  <div className="mt-0.5 text-xs text-slate-500">KapalÄ±ysa tutar ve birim fiyat sÃ¼tunlarÄ± onay mailinde yer almaz.</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailForm.approvalShowPrices}
                  onChange={(event) => setEmailForm((prev) => ({ ...prev, approvalShowPrices: event.target.checked }))}
                />
              </label>
            </div>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">YanÄ±t adresi</div>
              <input
                className="app-input"
                value={emailForm.replyTo}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, replyTo: event.target.value }))}
                placeholder="BoÅŸsa gÃ¶nderici kullanÄ±lÄ±r"
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-[color:var(--app-text)]">Test alÄ±cÄ±sÄ±</div>
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
                  setEmailStatus('Test e-postasÄ± gÃ¶nderiliyor...');
                  await sendTestOrderEmail();
                } catch (err) {
                  setEmailStatus(err.message);
                }
              }}
            >
              Test gÃ¶nder
            </button>
          </div>

          <div className="app-soft-panel p-4 text-sm">
            Gmail iÃ§in 2 adÄ±mlÄ± doÄŸrulama aÃ§Ä±p uygulama parolasÄ± kullanman gerekir.
          </div>

          {emailStatus ? <div className="app-soft-panel px-4 py-3 text-sm">{emailStatus}</div> : null}
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {[
            `Durum: ${emailForm.enabled ? 'Aktif' : 'Pasif'}`,
            `SMTP: ${emailForm.smtpHost || '-'}:${emailForm.smtpPort || '-'}`,
            `GÃ¶nderici: ${emailForm.senderEmail || emailForm.smtpUser || '-'}`,
            `AlÄ±cÄ±lar: ${emailForm.recipientEmails || '-'}`
          ].map((item, index) => (
            <div key={`email-${index}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      )
    },
    theme: {
      title: 'Marka varlÄ±klarÄ±',
      description: 'Login ekranÄ±, navbar ve tÃ¼m uygulama zemini iÃ§in kullanÄ±lan logo ve arka plan gÃ¶rselleri ile kurumsal renk paleti burada belirlenir.',
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
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Logo Ã¶nizleme</div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="app-login-logo-wrap h-16 w-16">
                    <img src={brandingForm.appLogo || '/nevres.png'} alt="Logo Ã¶nizleme" className="app-login-logo" />
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-[color:var(--app-border)] bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">Arka plan Ã¶nizleme</div>
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
                  setThemeStatus(`${palette.name} etkinleÅŸtirildi.`);
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
                setThemeStatus('Logo ve arka plan gÃ¼ncellendi.');
              }
            }}
          >
            Logo ve arka planÄ± kaydet
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
      title: 'Etiket TasarÄ±mcÄ±sÄ±',
      description: 'BaskÄ± dÃ¼zenini Ã¶rnek iÃ§erikle ayarlayabileceÄŸiniz sade tasarÄ±m alanÄ±.',
      fullWidth: true,
      content: <LabelDesignerPanel />
    },
    genel: {
      title: 'Genel Ayarlar',
      description: 'MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼ ve uygulama geneli davranÄ±ÅŸ ayarlarÄ±.',
      form: (
        <div className="space-y-4">
          <div className="app-soft-panel p-4 space-y-4">
            <div className="text-sm font-semibold text-[color:var(--app-text)]">MÃ¼ÅŸteri (public) gÃ¶rÃ¼nÃ¼mÃ¼</div>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">Proses bilgisini gÃ¶ster</div>
                <div className="mt-0.5 text-xs text-slate-500">MÃ¼ÅŸteri QR/link sayfasÄ±nda Ã¼retim prosesleri gÃ¶rÃ¼nsÃ¼n.</div>
              </div>
              <input type="checkbox" checked={genelAyarlar.publicProsesGoster}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicProsesGoster: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--app-text)]">1 kg satÄ±ÅŸ fiyatÄ±nÄ± gÃ¶ster</div>
                <div className="mt-0.5 text-xs text-slate-500">MÃ¼ÅŸteri QR/link sayfasÄ±nda ve arama sonucunda satÄ±ÅŸ fiyatÄ± gÃ¶rÃ¼nsÃ¼n.</div>
              </div>
              <input type="checkbox" checked={genelAyarlar.publicFiyatGoster}
                onChange={(e) => saveGenelAyarlar({ ...genelAyarlar, publicFiyatGoster: e.target.checked })} />
            </label>
          </div>
          {genelAyarlarStatus ? <div className="app-soft-panel px-4 py-3 text-sm">{genelAyarlarStatus}</div> : null}
        </div>
      ),
      list: (
        <div className="mt-4 space-y-3">
          {[
            `Proses gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼: ${genelAyarlar.publicProsesGoster ? 'AÃ§Ä±k' : 'KapalÄ±'}`,
            `Fiyat gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼: ${genelAyarlar.publicFiyatGoster ? 'AÃ§Ä±k' : 'KapalÄ±'}`
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">{item}</div>
          ))}
        </div>
      )
    },
    system: {
      title: 'Operasyon merkezi',
      description: 'Yedekleme, veri temizleme ve temel operasyon gÃ¶stergeleri.',
      form: (
        <div className="space-y-3">
          <button onClick={handleBackup} disabled={loading} className="w-full rounded-2xl bg-green-500 px-4 py-3 text-white hover:bg-green-600 disabled:bg-gray-400">
            VeritabanÄ±nÄ± yedekle
          </button>
          <button onClick={handleCleanDatabase} disabled={loading} className="w-full rounded-2xl bg-red-500 px-4 py-3 text-white hover:bg-red-600 disabled:bg-gray-400">
            TÃ¼m verileri temizle
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


  return (
    <div className="space-y-6">

      {activeTab !== 'labels' ? (
        <section className="app-hero app-page-hero app-reveal-up">
          <div className="app-page-hero-grid">
            <div>
              <div className="app-chip">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
              <h1 className="mt-4 text-3xl font-semibold text-[color:var(--app-text)]">{current.title}</h1>
            </div>
            <div className="app-page-hero-actions">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="app-nav-icon-button"
                aria-label="Ayar bÃ¶lÃ¼mlerini aÃ§"
                title="Ayar bÃ¶lÃ¼mlerini aÃ§"
              >
                <MenuIcon />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {current.fullWidth ? (
        <section className="app-reveal-up app-reveal-delay-1">
          {current.content}
        </section>
      ) : (
        <section className="app-panel p-6 app-reveal-up app-reveal-delay-1">
          <div className="grid gap-8 xl:grid-cols-[0.95fr,1.05fr]">
            <div>
              <div className="app-chip">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">{current.title}</h2>
              <div className="mt-6">{current.form}</div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {activeTab === 'excel' ? 'KayÄ±tlar ve son senkronlar' : activeTab === 'email' ? 'BaÄŸlantÄ± Ã¶zeti' : 'Mevcut tanÄ±mlar'}
              </h3>
              {current.list}
            </div>
          </div>
        </section>
      )}

      {drawerVisible ? (
        <div
          className={`app-drawer-overlay ${drawerOpen ? 'is-open' : 'is-closing'}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDrawerOpen(false);
            }
          }}
        >
          <div className={`app-drawer-panel ${drawerOpen ? 'is-open' : 'is-closing'}`}>
            <div className="app-drawer-header">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="app-nav-icon-button"
                aria-label="MenÃ¼yÃ¼ kapat"
                title="MenÃ¼yÃ¼ kapat"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="app-drawer-list">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setDrawerOpen(false);
                  }}
                  className={`app-drawer-link ${activeTab === tab.id ? 'is-active' : ''} ${drawerOpen ? 'is-open' : 'is-closing'}`}
                  style={{ animationDelay: `${80 + (index * 55)}ms` }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsPage;
