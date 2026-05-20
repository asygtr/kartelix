import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { palettes } from '../theme/palettes';
import AppNavbar from '../components/AppNavbar';

const tabs = [
  { id: 'types', label: 'Ürün Grupları' },
  { id: 'colors', label: 'Renkler' },
  { id: 'yarns', label: 'İplik Tanımı' },
  { id: 'processes', label: 'Proses' },
  { id: 'excel', label: 'Excel Kaynakları' },
  { id: 'theme', label: 'Marka Varlıkları' },
  { id: 'system', label: 'Operasyon' }
];

const initialTypeForm = { ad: '', kodPrefix: '', aciklama: '' };
const initialColorForm = { ad: '', kod: '' };
const initialYarnForm = { ad: '', kod: '', birim: 'kg', birimFiyat: '' };
const initialProcessForm = { ad: '', tip: '', birimMaliyet: '', renkBazli: false };
const initialExcelForm = { kaynakTipi: 'mamul_turleri', dosyaAdi: '', uzanti: '.xlsx', sheetAdi: '', aktif: true };
const excelSourceOptions = [
  { value: 'mamul_turleri', label: 'Ürün Grupları' },
  { value: 'renkler', label: 'Renkler' },
  { value: 'iplikler', label: 'İplikler' },
  { value: 'prosesler', label: 'Prosesler' },
  { value: 'mamuller', label: 'Mamuller' },
  { value: 'mamul_iplikleri', label: 'Mamül İplikleri' },
  { value: 'mamul_prosesleri', label: 'Mamül Prosesleri' }
];

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
  </svg>
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

  const [activeTab, setActiveTab] = useState('types');
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
  const [excelForm, setExcelForm] = useState(initialExcelForm);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingColorId, setEditingColorId] = useState(null);
  const [editingYarnId, setEditingYarnId] = useState(null);
  const [editingProcessId, setEditingProcessId] = useState(null);
  const [excelSources, setExcelSources] = useState([]);
  const [editingExcelId, setEditingExcelId] = useState(null);
  const [excelPollMs, setExcelPollMs] = useState('60000');
  const [excelStatus, setExcelStatus] = useState('');
  const [excelSyncStatus, setExcelSyncStatus] = useState(null);
  const [themeStatus, setThemeStatus] = useState('');
  const [brandingForm, setBrandingForm] = useState({ appLogo: '/nevres.png', appBackground: '/showroom-bg.png' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

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
    const [settingsResponse, statusResponse] = await Promise.all([
      fetch('/api/admin/excel-settings'),
      fetch('/api/excel-sync/status')
    ]);

    const [settingsResult, statusResult] = await Promise.all([
      settingsResponse.json(),
      statusResponse.json()
    ]);

    if (settingsResult.success) {
      setExcelSources(settingsResult.data.sources || []);
      setExcelPollMs(String(settingsResult.data.pollMs || 60000));
    }

    if (statusResult.success) {
      setExcelSyncStatus(statusResult.data);
    }
  };

  useEffect(() => {
    loadSystemStats();
    loadDefinitions();
    loadExcelSettings();
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

  const resetExcelForm = () => {
    setExcelForm(initialExcelForm);
    setEditingExcelId(null);
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
      title: 'Excel kaynakları',
      description: 'Paylaşılan klasördeki dosyaları burada tanımlayın. Sistem bu kayıtlara göre dosyaları belirli aralıklarla okuyup veritabanına yazar.',
      form: (
        <div className="space-y-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const payload = {
                kaynakTipi: excelForm.kaynakTipi,
                dosyaAdi: excelForm.dosyaAdi,
                uzanti: excelForm.uzanti,
                sheetAdi: excelForm.sheetAdi,
                aktif: excelForm.aktif
              };

              if (editingExcelId) {
                await updateDefinition(`/api/admin/excel-sources/${editingExcelId}`, payload, async () => {
                  resetExcelForm();
                  await loadExcelSettings();
                });
                return;
              }

              await createDefinition('/api/admin/excel-sources', payload, async () => {
                resetExcelForm();
                await loadExcelSettings();
              });
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[color:var(--app-text)]">
                {editingExcelId ? 'Excel kaynağını düzenle' : 'Yeni Excel kaynağı ekle'}
              </div>
              {editingExcelId ? <button type="button" onClick={resetExcelForm} className="app-btn-secondary">İptal</button> : null}
            </div>
            <select className="app-input" value={excelForm.kaynakTipi} onChange={(e) => setExcelForm((prev) => ({ ...prev, kaynakTipi: e.target.value }))}>
              {excelSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,140px]">
              <input className="app-input" placeholder="Dosya adı (uzantısız)" value={excelForm.dosyaAdi} onChange={(e) => setExcelForm((prev) => ({ ...prev, dosyaAdi: e.target.value }))} />
              <select className="app-input" value={excelForm.uzanti} onChange={(e) => setExcelForm((prev) => ({ ...prev, uzanti: e.target.value }))}>
                <option value=".xlsx">.xlsx</option>
                <option value=".xls">.xls</option>
              </select>
            </div>
            <input className="app-input" placeholder="Sheet adı (boşsa ilk sheet okunur)" value={excelForm.sheetAdi} onChange={(e) => setExcelForm((prev) => ({ ...prev, sheetAdi: e.target.value }))} />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <input type="checkbox" checked={excelForm.aktif} onChange={(e) => setExcelForm((prev) => ({ ...prev, aktif: e.target.checked }))} />
              Kaynak aktif
            </label>
            <button type="submit" className="app-btn-primary">
              {editingExcelId ? 'Excel kaynağını güncelle' : 'Excel kaynağı ekle'}
            </button>
          </form>

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
          {excelSources.length === 0 ? (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Henüz Excel kaynağı tanımlanmadı.</div>
          ) : (
            excelSources.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExcelId(item.id);
                    setExcelForm({
                      kaynakTipi: item.kaynak_tipi,
                      dosyaAdi: item.dosya_adi,
                      uzanti: item.uzanti || '.xlsx',
                      sheetAdi: item.sheet_adi || '',
                      aktif: Boolean(item.aktif)
                    });
                  }}
                  className="w-full text-left"
                >
                  <div className="font-semibold text-[color:var(--app-text)]">
                    {excelSourceOptions.find((option) => option.value === item.kaynak_tipi)?.label || item.kaynak_tipi}
                  </div>
                  <div className="mt-1 text-slate-600">
                    {item.dosya_adi}{item.uzanti}{item.sheet_adi ? ` / sheet: ${item.sheet_adi}` : ''}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                    {item.aktif ? 'Aktif' : 'Pasif'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/excel-sources/${item.id}`, { method: 'DELETE' });
                    if (editingExcelId === item.id) {
                      resetExcelForm();
                    }
                    await loadExcelSettings();
                  }}
                  className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-rose-600"
                >
                  Kaydı sil
                </button>
              </div>
            ))
          )}

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

  return (
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          title="Ayarlar"
        />

        <section className="app-panel p-6">
          <div className="grid gap-8 xl:grid-cols-[0.95fr,1.05fr]">
            <div>
              <div className="app-chip">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">{current.title}</h2>
              <div className="mt-6">{current.form}</div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'excel' ? 'Kayıtlar ve son senkronlar' : 'Mevcut tanımlar'}</h3>
              {current.list}
            </div>
          </div>
        </section>
      </div>

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
                aria-label="Menüyü kapat"
                title="Menüyü kapat"
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
