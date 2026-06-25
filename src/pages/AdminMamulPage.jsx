import React, { useEffect, useMemo, useRef, useState } from 'react';
import { authHeaders, getSession } from '../utils/auth';
import { AnimatePresence, motion } from 'framer-motion';
import PageSearchBar from '../components/PageSearchBar';
import { extractColorName, formatArticleLabel, resolveColorHex } from '../utils/labelTemplate';
import { Upload, Trash2 } from '../components/icons.jsx';
import { useHaptic } from '../utils/useHaptic';
import PullToRefresh from '../components/PullToRefresh';
import { SkeletonList } from '../components/Skeleton';
import { normalizeGenelAyarlar, resolveDisplayPrice } from '../utils/generalSettings';
import { useGenelAyarlar } from '../theme/ThemeProvider';

const emptyYarn = { iplik_tanim_id: '', iplik_adi: '', oran_yuzde: '', birim_fiyat: '' };
const emptyProcess = { proses_tanim_id: '', proses_adi: '', proses_tipi: '', birim_maliyet: '', renk_bazli: false, aciklama: '' };
const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];

const createEmptyForm = () => ({
  mamulAdi: '',
  mamulTuruId: '',
  articleNoPreview: '',
  articleCodePreview: '',
  koleksiyonAdi: '',
  yayinDurumu: 'taslak',
  renkId: '',
  renk: '',
  renkKodu: '',
  kompozisyonOzeti: '',
  en: '',
  gramaj: '',
  aciklama: '',
  tanitimBasligi: '',
  tanitimHikayesi: '',
  materyalNotlari: '',
  gorselUrl: '',
  vurguEtiketi: '',
  birKgSatisFiyati: '',
  paraBirimi: 'TRY',
  aktif: true,
  iplikler: [{ ...emptyYarn }],
  prosesler: [{ ...emptyProcess }]
});

const AdminMamulPage = ({ mode = 'admin' }) => {
  const haptic = useHaptic();
  const [types, setTypes] = useState([]);
  const [colors, setColors] = useState([]);
  const [yarnDefinitions, setYarnDefinitions] = useState([]);
  const [processDefinitions, setProcessDefinitions] = useState([]);
  const [mamulList, setMamulList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedMamulId, setSelectedMamulId] = useState(null);
  const [selectedMamulDetail, setSelectedMamulDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [gorselUploading, setGorselUploading] = useState(false);
  const gorselInputRef = useRef(null);
  const { genelAyarlar: contextGenelAyarlar } = useGenelAyarlar();
  const normalizedGenelAyarlar = useMemo(() => normalizeGenelAyarlar(contextGenelAyarlar), [contextGenelAyarlar]);

  const uploadGorsel = async (file) => {
    if (!selectedMamulDetail?.id) return;
    setGorselUploading(true);
    try {
      const fd = new FormData();
      fd.append('gorsel', file);
      const res = await fetch(`/api/admin/mamuller/${selectedMamulDetail.id}/gorsel`, { method: 'POST', headers: authHeaders(), body: fd });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Yüklenemedi');
      setSelectedMamulDetail((prev) => ({ ...prev, gorsel_url: result.data.gorsel_url }));
      setMessage('Görsel güncellendi.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setGorselUploading(false);
    }
  };

  const deleteGorsel = async () => {
    if (!selectedMamulDetail?.id) return;
    setGorselUploading(true);
    try {
      const res = await fetch(`/api/admin/mamuller/${selectedMamulDetail.id}/gorsel`, { method: 'DELETE', headers: authHeaders() });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Silinemedi');
      setSelectedMamulDetail((prev) => ({ ...prev, gorsel_url: null }));
      setMessage('Görsel silindi.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setGorselUploading(false);
    }
  };

  const fetchInitial = async () => {
    setListLoading(true);
    try {
    const [typesResponse, colorsResponse, yarnsResponse, processesResponse, mamulResponse] = await Promise.all([
      fetch('/api/admin/mamul-turleri', { headers: authHeaders() }),
      fetch('/api/admin/renkler', { headers: authHeaders() }),
      fetch('/api/admin/iplikler', { headers: authHeaders() }),
      fetch('/api/admin/prosesler', { headers: authHeaders() }),
      fetch('/api/admin/mamuller', { headers: authHeaders() })
    ]);

    const [typesResult, colorsResult, yarnsResult, processesResult, mamulResult] = await Promise.all([
      typesResponse.json(),
      colorsResponse.json(),
      yarnsResponse.json(),
      processesResponse.json(),
      mamulResponse.json()
    ]);

    setTypes(typesResult.success ? typesResult.data : []);
    setColors(colorsResult.success ? colorsResult.data : []);
    setYarnDefinitions(yarnsResult.success ? yarnsResult.data : []);
    setProcessDefinitions(processesResult.success ? processesResult.data : []);
    setMamulList(mamulResult.success ? mamulResult.data : []);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    const handleMamulListRefresh = (event) => {
      const refreshedList = Array.isArray(event?.detail) ? event.detail : null;
      if (refreshedList) {
        setMamulList(refreshedList);
      } else {
        fetchInitial();
      }
    };

    window.addEventListener('mamul-list-updated', handleMamulListRefresh);
    fetchInitial();

    return () => {
      window.removeEventListener('mamul-list-updated', handleMamulListRefresh);
    };
  }, []);

  const selectedColor = useMemo(
    () => colors.find((item) => String(item.id) === String(form.renkId)),
    [colors, form.renkId]
  );

  useEffect(() => {
    const fetchArticlePreview = async () => {
      if (selectedMamulId) {
        return;
      }

      if (!form.mamulTuruId) {
        setForm((prev) => ({ ...prev, articleNoPreview: '', articleCodePreview: '' }));
        return;
      }

      try {
        const response = await fetch(`/api/admin/mamuller/next-article-no/${form.mamulTuruId}`, { headers: authHeaders() });
        const result = await response.json();

        if (result.success) {
          setForm((prev) => ({
            ...prev,
            articleNoPreview: result.data.articleNo,
            articleCodePreview: result.data.articleCode
          }));
        }
      } catch {
        setForm((prev) => ({ ...prev, articleNoPreview: '', articleCodePreview: '' }));
      }
    };

    fetchArticlePreview();
  }, [form.mamulTuruId, selectedMamulId]);

  const yarnCost = useMemo(
    () => form.iplikler.reduce((sum, item) => sum + ((Number(item.oran_yuzde || 0) / 100) * Number(item.birim_fiyat || 0)), 0),
    [form.iplikler]
  );

  const processCost = useMemo(
    () => form.prosesler.reduce((sum, item) => sum + Number(item.birim_maliyet || 0), 0),
    [form.prosesler]
  );

  const totalCost = (yarnCost + processCost).toFixed(2);
  const hasCostInput = form.iplikler.some((item) => Number(item.oran_yuzde || 0) > 0 || Number(item.birim_fiyat || 0) > 0)
    || form.prosesler.some((item) => Number(item.birim_maliyet || 0) > 0);

  const karYuzdesi = useMemo(() => {
    const maliyet = Number(totalCost);
    const satis = Number(form.birKgSatisFiyati || 0);
    if (!maliyet || !satis || maliyet === satis) return null;
    return (((satis - maliyet) / maliyet) * 100).toFixed(1);
  }, [totalCost, form.birKgSatisFiyati]);

  const displayPrice = useMemo(() => resolveDisplayPrice(totalCost, form.birKgSatisFiyati, normalizedGenelAyarlar), [totalCost, form.birKgSatisFiyati, normalizedGenelAyarlar]);

  const applyKarYuzdesi = (yuzde) => {
    const maliyet = Number(totalCost);
    if (!maliyet) return;
    const satis = (maliyet * (1 + Number(yuzde) / 100)).toFixed(2);
    setForm((prev) => ({ ...prev, birKgSatisFiyati: satis }));
  };

  const updateArrayItem = (field, index, key, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      ))
    }));
  };

  const addArrayItem = (field, template) => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], { ...template }] }));
  };

  const removeArrayItem = (field, index) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const applyYarnDefinition = (index, definitionId) => {
    const selected = yarnDefinitions.find((item) => String(item.id) === String(definitionId));
    updateArrayItem('iplikler', index, 'iplik_tanim_id', definitionId);
    if (selected) {
      updateArrayItem('iplikler', index, 'iplik_adi', selected.ad);
      updateArrayItem('iplikler', index, 'birim_fiyat', selected.birim_fiyat);
    }
  };

  const applyProcessDefinition = (index, definitionId) => {
    const selected = processDefinitions.find((item) => String(item.id) === String(definitionId));
    updateArrayItem('prosesler', index, 'proses_tanim_id', definitionId);
    if (selected) {
      updateArrayItem('prosesler', index, 'proses_adi', selected.ad);
      updateArrayItem('prosesler', index, 'proses_tipi', selected.tip);
      updateArrayItem('prosesler', index, 'birim_maliyet', selected.birim_maliyet);
      updateArrayItem('prosesler', index, 'renk_bazli', selected.renk_bazli);
    }
  };

  const submitForm = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const isEditing = Boolean(selectedMamulId);
      const response = await fetch(isEditing ? `/api/admin/mamuller/${selectedMamulId}` : '/api/admin/mamuller', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          ...form,
          renk: selectedColor?.ad || form.renk,
          renkKodu: selectedColor?.kod || form.renkKodu
        })
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Mamül kaydedilemedi');
      }

      setMessage(isEditing
        ? `Mamül güncellendi. Article Code: ${result.data.articleCode}`
        : `Mamül kaydedildi. Makale No: ${result.data.articleCode}`);
      setTimeout(() => setMessage(''), 4000);
      haptic.success();
      if (isEditing) {
        showMamulDetail(selectedMamulId);
      }
      setSelectedMamulId(null);
      setForm(createEmptyForm());
      setShowEditor(false);
      fetchInitial();
    } catch (err) {
      setMessage(err.message);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const resetEditor = () => {
    setSelectedMamulId(null);
    setMessage('');
    setForm(createEmptyForm());
    setShowEditor(false);
  };

  const showMamulDetail = async (mamulId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/mamuller/${mamulId}`, { headers: authHeaders() });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Mamül detayı yüklenemedi');
      }

      setSelectedMamulDetail(result.data);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const session = getSession();
  const isAdmin = session?.yetki === 'admin';

  // eslint-disable-next-line no-unused-vars
  const pageTitle = mode === 'mamul' ? 'Mamül kartları' : 'Mamül kartı';
  const resolveMamulMatch = (rawValue) => {
    const term = normalizeSearchValue(rawValue);
    if (!term) return null;

    return mamulList.find((item) =>
      [item.article_no, item.article_code, item.qr_slug].some((field) => normalizeSearchValue(field) === term)
    ) || mamulList.find((item) =>
      [item.mamul_adi, item.article_no, item.article_code, item.renk, item.qr_slug]
        .some((field) => normalizeSearchValue(field).includes(term))
    ) || null;
  };

  const filteredMamulList = useMemo(() => {
    const term = normalizeSearchValue(searchTerm);
    if (!term) return mamulList;
    return mamulList.filter((item) =>
      [item.mamul_adi, item.article_no, item.article_code, item.renk, item.qr_slug]
        .some((field) => normalizeSearchValue(field).includes(term))
    );
  }, [mamulList, searchTerm]);

  return (
    <PullToRefresh onRefresh={fetchInitial}>
    <>
      {message ? (
        <div className="app-panel px-4 py-3 text-sm text-[color:var(--app-text)]">
          {message}
        </div>
      ) : null}

      <PageSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Kayıtlı mamül ara"
          onSearch={(term) => {
            const match = resolveMamulMatch(term);
            if (match) {
              setMessage('');
              showMamulDetail(match.id);
              return;
            }
            if (normalizeSearchValue(term)) {
              setMessage('Aramayla eşleşen mamül bulunamadı.');
            }
          }}
          onQrDetected={(detectedValue) => {
            const match = resolveMamulMatch(detectedValue);
            if (match) {
              setMessage('');
              showMamulDetail(match.id);
            } else {
              setMessage('QR ile eşleşen mamül bulunamadı.');
            }
          }}
          showResults={Boolean(normalizeSearchValue(searchTerm))}
          results={filteredMamulList.slice(0, 6)}
          onResultSelect={(item) => {
            setSearchTerm(item.article_code || item.article_no || item.mamul_adi || '');
            setMessage('');
            showMamulDetail(item.id);
          }}
          getResultPrimary={(item) => item.mamul_adi}
          getResultSecondary={(item) => `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''}`}
          emptyResultsText="Bu aramaya uygun mamül bulunamadı."
        />

<div className="space-y-6">
            {showEditor ? (
           <form onSubmit={submitForm} className="app-collapse-panel space-y-6">
            <section className="app-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
                    {selectedMamulId ? 'Mamül kartını düzenle' : 'Genel bilgiler'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedMamulId ? (
                    <button type="button" onClick={resetEditor} className="app-btn-secondary">Yeni mamül aç</button>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                  <div className="app-stat">
<div className="app-stat-label">Kayıt No</div>
                     <div className="text-lg font-bold mt-2">{form.articleNoPreview || '-'}</div>
                   </div>
                   <div className="app-stat">
                     <div className="app-stat-label">Kayıt Kodu</div>
                    <div className="text-lg font-bold mt-2">{form.articleCodePreview || '-'}</div>
                  </div>
                </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <input className="app-input" placeholder="Mamül adı" value={form.mamulAdi} onChange={(e) => setForm((prev) => ({ ...prev, mamulAdi: e.target.value }))} />
                <select className="app-select" value={form.mamulTuruId} onChange={(e) => setForm((prev) => ({ ...prev, mamulTuruId: e.target.value }))}>
                  <option value="">Mamül türü seçin</option>
                  {types.map((item) => <option key={item.id} value={item.id}>{item.ad} ({item.kod_prefix})</option>)}
                </select>
                <input className="app-input" placeholder="Koleksiyon adı" value={form.koleksiyonAdi} onChange={(e) => setForm((prev) => ({ ...prev, koleksiyonAdi: e.target.value }))} />
                <select className="app-select" value={form.yayinDurumu} onChange={(e) => setForm((prev) => ({ ...prev, yayinDurumu: e.target.value, aktif: e.target.value === 'yayinda' }))}>
                  <option value="taslak">Taslak</option>
                  <option value="yayinda">Yayında</option>
                  <option value="arsiv">Arşiv</option>
                </select>
                <select className="app-select" value={form.renkId} onChange={(e) => setForm((prev) => ({ ...prev, renkId: e.target.value }))}>
                  <option value="">Renk seçin</option>
                  {colors.map((item) => <option key={item.id} value={item.id}>{item.ad} ({item.kod})</option>)}
                </select>
                <div className="app-soft-panel px-4 py-3 text-sm text-[color:var(--app-text-muted)]">
                  Renk kodu: <span className="font-semibold text-[color:var(--app-text)]">{selectedColor?.kod || '-'}</span>
                </div>
                <input className="app-input" placeholder="En" value={form.en} onChange={(e) => setForm((prev) => ({ ...prev, en: e.target.value }))} />
                <input className="app-input" placeholder="Gramaj" value={form.gramaj} onChange={(e) => setForm((prev) => ({ ...prev, gramaj: e.target.value }))} />
                <input className="app-input md:col-span-2" placeholder="Kompozisyon özeti" value={form.kompozisyonOzeti} onChange={(e) => setForm((prev) => ({ ...prev, kompozisyonOzeti: e.target.value }))} />
                <textarea className="app-textarea md:col-span-2 min-h-28" placeholder="Mamül açıklaması" value={form.aciklama} onChange={(e) => setForm((prev) => ({ ...prev, aciklama: e.target.value }))} />
              </div>
            </section>

            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Ürün tanıtımı</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <input className="app-input" placeholder="Tanıtım başlığı" value={form.tanitimBasligi} onChange={(e) => setForm((prev) => ({ ...prev, tanitimBasligi: e.target.value }))} />
                <input className="app-input" placeholder="Vurgu etiketi" value={form.vurguEtiketi} onChange={(e) => setForm((prev) => ({ ...prev, vurguEtiketi: e.target.value }))} />
                <input className="app-input" placeholder="Görsel URL" value={form.gorselUrl} onChange={(e) => setForm((prev) => ({ ...prev, gorselUrl: e.target.value }))} />
                <textarea className="app-textarea min-h-32" placeholder="Ürün hikâyesi" value={form.tanitimHikayesi} onChange={(e) => setForm((prev) => ({ ...prev, tanitimHikayesi: e.target.value }))} />
                <textarea className="app-textarea min-h-24" placeholder="Materyal ve yüzey dili notları" value={form.materyalNotlari} onChange={(e) => setForm((prev) => ({ ...prev, materyalNotlari: e.target.value }))} />
              </div>
            </section>

            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">İplik reçetesi</h2>
                </div>
                <button type="button" onClick={() => addArrayItem('iplikler', emptyYarn)} className="app-btn-secondary">Satır ekle</button>
              </div>

              <div className="mt-5 space-y-3">
                {form.iplikler.map((item, index) => (
                  <div key={`iplik-${index}`} className="grid gap-3 md:grid-cols-4" style={{ alignItems: 'center' }}>
                    <select className="app-select" value={item.iplik_tanim_id} onChange={(e) => applyYarnDefinition(index, e.target.value)}>
                      <option value="">Tanımlı iplik seçin</option>
                      {yarnDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.ad}</option>)}
                    </select>
                    <input className="app-input" placeholder="İplik adı" value={item.iplik_adi} onChange={(e) => updateArrayItem('iplikler', index, 'iplik_adi', e.target.value)} />
                    <input className="app-input" placeholder="Oran %" value={item.oran_yuzde} onChange={(e) => updateArrayItem('iplikler', index, 'oran_yuzde', e.target.value)} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input className="app-input" placeholder="Birim fiyat" value={item.birim_fiyat} onChange={(e) => updateArrayItem('iplikler', index, 'birim_fiyat', e.target.value)} />
                      {form.iplikler.length > 1 && <button type="button" onClick={() => removeArrayItem('iplikler', index)} className="app-btn-danger" style={{ flexShrink: 0, padding: '0 0.6rem' }} aria-label="Satırı sil"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Proses ve boya</h2>
                </div>
                <button type="button" onClick={() => addArrayItem('prosesler', emptyProcess)} className="app-btn-secondary">Satır ekle</button>
              </div>

              <div className="mt-5 space-y-3">
                {form.prosesler.map((item, index) => (
                  <div key={`proses-${index}`} className="grid gap-3 md:grid-cols-5" style={{ alignItems: 'center' }}>
                    <select className="app-select" value={item.proses_tanim_id} onChange={(e) => applyProcessDefinition(index, e.target.value)}>
                      <option value="">Tanımlı proses seçin</option>
                      {processDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.ad}</option>)}
                    </select>
                    <input className="app-input" placeholder="Proses adı" value={item.proses_adi} onChange={(e) => updateArrayItem('prosesler', index, 'proses_adi', e.target.value)} />
                    <input className="app-input" placeholder="Proses tipi" value={item.proses_tipi} onChange={(e) => updateArrayItem('prosesler', index, 'proses_tipi', e.target.value)} />
                    <input className="app-input" placeholder="Birim maliyet" value={item.birim_maliyet} onChange={(e) => updateArrayItem('prosesler', index, 'birim_maliyet', e.target.value)} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input className="app-input" placeholder="Açıklama" value={item.aciklama} onChange={(e) => updateArrayItem('prosesler', index, 'aciklama', e.target.value)} />
                      {form.prosesler.length > 1 && <button type="button" onClick={() => removeArrayItem('prosesler', index)} className="app-btn-danger" style={{ flexShrink: 0, padding: '0 0.6rem' }} aria-label="Satırı sil"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="app-panel p-6">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Maliyet ve satış</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="app-stat">
                  <div className="app-stat-label">İplik maliyeti</div>
                  <div className="app-stat-value">{yarnCost.toFixed(2)} {form.paraBirimi}</div>
                </div>
                <div className="app-stat">
                  <div className="app-stat-label">Proses maliyeti</div>
                  <div className="app-stat-value">{processCost.toFixed(2)} {form.paraBirimi}</div>
                </div>
                <div className="app-stat" style={{ background: 'linear-gradient(135deg, var(--app-surface-strong), var(--app-primary-strong))', color: '#fff' }}>
                  <div className="app-stat-label" style={{ color: 'rgba(255,255,255,0.65)' }}>1 kg maliyet</div>
                  <div className="app-stat-value" style={{ color: '#fff' }}>{hasCostInput ? `${totalCost} ${form.paraBirimi}` : '-'}</div>
                </div>

                <select className="app-select" value={form.paraBirimi} onChange={(e) => setForm((prev) => ({ ...prev, paraBirimi: e.target.value }))}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="md:col-span-2 flex gap-2 items-center">
                  <input className="app-input flex-1" placeholder="1 kg satış fiyatı" value={form.birKgSatisFiyati} onChange={(e) => setForm((prev) => ({ ...prev, birKgSatisFiyati: e.target.value }))} />
                  {karYuzdesi !== null && (
                    <span className={`text-sm font-semibold px-2 py-1 rounded whitespace-nowrap ${Number(karYuzdesi) >= 0 ? 'text-[color:var(--app-success)]' : 'text-red-500'}`}>
                      %{karYuzdesi} kâr
                    </span>
                  )}
                </div>
                <div className="md:col-span-3 text-sm text-[color:var(--app-text-muted)]">
                  Genel ayara göre önerilen satış fiyatı: <span className="font-semibold text-[color:var(--app-text)]">{displayPrice.toFixed(2)} {form.paraBirimi}</span>
                </div>

                <div className="md:col-span-3 flex flex-wrap gap-2">
                  <span className="text-xs text-[color:var(--app-text-muted)] self-center mr-1">Hızlı kâr:</span>
                  {[10, 15, 20, 25, 30, 40, 50].map((p) => (
                    <button key={p} type="button" onClick={() => applyKarYuzdesi(p)} className="app-btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                      %{p}
                    </button>
                  ))}
                </div>

                <label className="app-soft-panel flex items-center gap-3 px-4 py-3 text-sm md:col-span-3">
                  <input type="checkbox" checked={form.aktif} onChange={(e) => setForm((prev) => ({ ...prev, aktif: e.target.checked }))} />
                  Public tarafta aktif göster
                </label>
              </div>

              <button type="submit" disabled={loading} className="app-btn-primary mt-6">
                {loading ? 'Kaydediliyor...' : selectedMamulId ? 'Mamül kartını güncelle' : 'Mamül kartını kaydet'}
              </button>
            </section>
          </form>
          ) : null}
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
            {selectedMamulDetail ? (
            <motion.section
              key={selectedMamulDetail.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
              className="app-panel p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Mamül detayı</h2>
                <div className="flex gap-2">
                  {isAdmin ? (
                    <button type="button" onClick={() => {
                    setSelectedMamulId(selectedMamulDetail.id);
                    setForm({
                      ...createEmptyForm(),
                      mamulAdi: selectedMamulDetail.mamul_adi || '',
                      mamulTuruId: selectedMamulDetail.mamul_turu_id,
                      koleksiyonAdi: selectedMamulDetail.koleksiyon_adi || '',
                      yayinDurumu: selectedMamulDetail.yayin_durumu || 'taslak',
                      renkId: selectedMamulDetail.renk_id || '',
                      renk: selectedMamulDetail.renk || '',
                      renkKodu: selectedMamulDetail.renk_kodu || '',
                      kompozisyonOzeti: selectedMamulDetail.kompozisyon_ozeti || '',
                      en: selectedMamulDetail.en || '',
                      gramaj: selectedMamulDetail.gramaj || '',
                      aciklama: selectedMamulDetail.aciklama || '',
                      birKgSatisFiyati: selectedMamulDetail.bir_kg_satis_fiyati || '',
                      paraBirimi: selectedMamulDetail.para_birimi || 'TRY',
                      gorselUrl: selectedMamulDetail.gorsel_url || '',
                      tanitimBasligi: selectedMamulDetail.tanitim_basligi || '',
                      tanitimHikayesi: selectedMamulDetail.tanitim_hikayesi || '',
                      materyalNotlari: selectedMamulDetail.materyal_notlari || '',
                      vurguEtiketi: selectedMamulDetail.vurgu_etiketi || '',
                      aktif: Boolean(selectedMamulDetail.aktif),
                      iplikler: selectedMamulDetail.iplikler?.length ? selectedMamulDetail.iplikler.map(i => ({
                        iplik_tanim_id: i.iplik_tanim_id || '',
                        iplik_adi: i.iplik_adi || '',
                        oran_yuzde: i.oran_yuzde || '',
                        birim_fiyat: i.birim_fiyat || ''
                      })) : [{ ...emptyYarn }],
                      prosesler: selectedMamulDetail.prosesler?.length ? selectedMamulDetail.prosesler.map(p => ({
                        proses_tanim_id: p.proses_tanim_id || '',
                        proses_adi: p.proses_adi || '',
                        proses_tipi: p.proses_tipi || '',
                        birim_maliyet: p.birim_maliyet || '',
                        renk_bazli: !!p.renk_bazli,
                        aciklama: p.aciklama || ''
                      })) : [{ ...emptyProcess }]
                    });
                    setShowEditor(true);
                  }} className="app-btn-secondary">Düzenle</button>
                  ) : null}
                  <button type="button" onClick={() => setSelectedMamulDetail(null)} className="app-btn-secondary">Listeye geri dön</button>
                </div>
              </div>

              {!selectedMamulDetail ? (
                null
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="app-soft-panel p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--app-text-muted)]">{selectedMamulDetail.mamul_turu_adi}</div>
                    <div className="mt-2 text-xl font-semibold text-[color:var(--app-text)]">{selectedMamulDetail.mamul_adi}</div>
                    <div className="mt-2 text-sm text-[color:var(--app-text-muted)]">{selectedMamulDetail.article_code} / {selectedMamulDetail.article_no}</div>
                  </div>

                  {/* Görsel yükleme */}
                  <div className="app-soft-panel p-4">
                    <div className="text-sm font-semibold text-[color:var(--app-text)] mb-3">Ürün görseli</div>
                    <input
                      ref={gorselInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files[0] && uploadGorsel(e.target.files[0])}
                    />
                    {selectedMamulDetail.gorsel_url ? (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <img
                          src={selectedMamulDetail.gorsel_url}
                          alt="Ürün görseli"
                          style={{ width: '8rem', height: '8rem', objectFit: 'cover', borderRadius: '0.7rem', border: '1px solid var(--app-border)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button
                            type="button"
                            disabled={gorselUploading}
                            onClick={() => gorselInputRef.current?.click()}
                            className="app-btn-secondary"
                          >
                            {gorselUploading ? 'Yükleniyor...' : 'Görseli değiştir'}
                          </button>
                          <button
                            type="button"
                            disabled={gorselUploading}
                            onClick={deleteGorsel}
                            className="app-btn-danger"
                          >
                            Görseli sil
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={gorselUploading}
                        onClick={() => gorselInputRef.current?.click()}
                        className="app-btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Upload size={16} />
                        {gorselUploading ? 'Yükleniyor...' : 'Görsel yükle'}
                      </button>
                    )}
                  </div>

<div className="app-data-table">
                     <div className="app-data-row"><div className="app-data-key">Renk</div><div className="app-data-value">{extractColorName(selectedMamulDetail.renk) || '-'}<span style={resolveColorHex(selectedMamulDetail) ? { display: 'inline-block', width: '12px', height: '12px', backgroundColor: resolveColorHex(selectedMamulDetail), border: '1px solid #999', borderRadius: '2px', marginLeft: '6px', verticalAlign: 'middle' } : {}} /></div></div>
                     <div className="app-data-row"><div className="app-data-key">Koleksiyon</div><div className="app-data-value">{selectedMamulDetail.koleksiyon_adi || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Kompozisyon</div><div className="app-data-value">{selectedMamulDetail.kompozisyon_ozeti || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Ölçü</div><div className="app-data-value">{selectedMamulDetail.en || '-'} EN / {selectedMamulDetail.gramaj || '-'} GR</div></div>
                    <div className="app-data-row"><div className="app-data-key">1 kg maliyet</div><div className="app-data-value">{Number(selectedMamulDetail.bir_kg_maliyet || 0).toFixed(2)} {selectedMamulDetail.para_birimi || 'TRY'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">1 kg satış</div><div className="app-data-value">{resolveDisplayPrice(selectedMamulDetail.bir_kg_maliyet, selectedMamulDetail.bir_kg_satis_fiyati, normalizedGenelAyarlar).toFixed(2)} {selectedMamulDetail.para_birimi || 'TRY'}{Number(selectedMamulDetail.bir_kg_maliyet || 0) > 0 && Number(selectedMamulDetail.bir_kg_satis_fiyati || 0) > 0 && Number(selectedMamulDetail.bir_kg_satis_fiyati) !== Number(selectedMamulDetail.bir_kg_maliyet) ? <span className={`ml-2 text-xs font-semibold ${Number(selectedMamulDetail.bir_kg_satis_fiyati) >= Number(selectedMamulDetail.bir_kg_maliyet) ? 'text-[color:var(--app-success)]' : 'text-red-500'}`}>%{(((Number(selectedMamulDetail.bir_kg_satis_fiyati) - Number(selectedMamulDetail.bir_kg_maliyet)) / Number(selectedMamulDetail.bir_kg_maliyet)) * 100).toFixed(1)} kâr</span> : null}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Durum</div><div className="app-data-value">{selectedMamulDetail.yayin_durumu || '-'}</div></div>
                  </div>

                  <div className="app-soft-panel p-4">
                    <div className="text-sm font-semibold text-[color:var(--app-text)]">İplik reçetesi</div>
                    <div className="mt-3 space-y-2">
                      {selectedMamulDetail.iplikler?.length ? selectedMamulDetail.iplikler.map((item) => (
                        <div key={item.id} className="text-sm text-[color:var(--app-text-muted)]">
                          {item.iplik_adi} / %{Number(item.oran_yuzde || 0).toFixed(2)} / {Number(item.birim_fiyat || 0).toFixed(2)}
                        </div>
                      )) : <div className="text-sm text-[color:var(--app-text-muted)]">-</div>}
                    </div>
                  </div>

                  <div className="app-soft-panel p-4">
                    <div className="text-sm font-semibold text-[color:var(--app-text)]">Prosesler</div>
                    <div className="mt-3 space-y-2">
                      {selectedMamulDetail.prosesler?.length ? selectedMamulDetail.prosesler.map((item) => (
                        <div key={item.id} className="text-sm text-[color:var(--app-text-muted)]">
                          {item.proses_adi}{item.proses_tipi && item.proses_tipi !== 'Excel' ? ` / ${item.proses_tipi}` : ''} / {Number(item.birim_maliyet || 0).toFixed(2)}
                        </div>
                      )) : <div className="text-sm text-[color:var(--app-text-muted)]">-</div>}
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
            ) : null}
            </AnimatePresence>

            {!selectedMamulDetail ? (
            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Kayıtlı mamüller</h2>
                <span className="text-sm text-[color:var(--app-text-muted)]">{mamulList.length} kayıt</span>
              </div>
              <div className="mt-5 app-mamul-list-shell">
                <div className="app-table-head app-mamul-table hidden md:grid">
                  <div>Mamül</div>
                  <div>Kayıt No</div>
                  <div>Tür / Renk</div>
                  <div>1 kg satış</div>
                  <div>İşlem</div>
                </div>
                {filteredMamulList.map((item) => (
                  <motion.div
                    key={item.id}
                    className="app-table-row app-mamul-table hidden md:grid"
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                    <div className="text-sm text-[color:var(--app-text-muted)]">{formatArticleLabel(item.article_code, item.article_no)}</div>
                    <div className="text-sm text-[color:var(--app-text-muted)]">{item.mamul_turu_adi}{extractColorName(item.renk) ? ` · ${extractColorName(item.renk)}` : ''}<span style={resolveColorHex(item) ? { display: 'inline-block', width: '10px', height: '10px', backgroundColor: resolveColorHex(item), border: '1px solid #999', borderRadius: '2px', marginLeft: '4px', verticalAlign: 'middle' } : {}} /></div>
                    <div className="text-sm font-semibold text-[color:var(--app-success)]">{resolveDisplayPrice(item.bir_kg_maliyet, item.bir_kg_satis_fiyati, normalizedGenelAyarlar).toFixed(2)}</div>
                    <div className="app-mamul-actions-pc" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', minWidth: 0 }}>
                      <button type="button" onClick={() => showMamulDetail(item.id)} className="app-btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.3rem 0.65rem', lineHeight: 1.4 }}>Detay</button>
                      <a href={`/u/${item.qr_slug}`} target="_blank" rel="noreferrer" className="app-btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.3rem 0.65rem', lineHeight: 1.4, textDecoration: 'none', display: 'inline-block' }}>Görüntüle</a>
                    </div>
                  </motion.div>
                ))}
                {filteredMamulList.map((item) => (
                  <div key={`mobile-${item.id}`} className="app-mamul-card md:hidden">
                    <div className="app-mamul-primary">{item.mamul_adi}</div>
                    <div className="app-mamul-mobile-grid">
                      <div className="app-mamul-mobile-field">
                        <div className="app-mamul-secondary-label">Kayıt No</div>
                        <div className="app-mamul-mobile-value">{formatArticleLabel(item.article_code, item.article_no)}</div>
                      </div>
                      <div className="app-mamul-mobile-field">
                        <div className="app-mamul-secondary-label">Satış</div>
                        <div className="app-mamul-mobile-value app-mamul-mobile-value-success">{resolveDisplayPrice(item.bir_kg_maliyet, item.bir_kg_satis_fiyati, normalizedGenelAyarlar).toFixed(2)}</div>
                      </div>
                      <div className="app-mamul-mobile-field">
                        <div className="app-mamul-secondary-label">Tür</div>
                        <div className="app-mamul-mobile-value app-mamul-mobile-value-muted">{item.mamul_turu_adi}</div>
                      </div>
                      <div className="app-mamul-mobile-field">
                        <div className="app-mamul-secondary-label">Renk</div>
                        <div className="app-mamul-mobile-value app-mamul-mobile-value-muted">
                          <span>{item.renk || '-'}</span>
                          <span style={resolveColorHex(item) ? { display: 'inline-block', width: '10px', height: '10px', backgroundColor: resolveColorHex(item), border: '1px solid #999', borderRadius: '2px', marginLeft: '4px', verticalAlign: 'middle' } : {}} />
                        </div>
                      </div>
                    </div>
                    <div className="app-mamul-actions">
                      <button type="button" onClick={() => showMamulDetail(item.id)} className="app-btn-secondary">Detay</button>
                      <a href={`/u/${item.qr_slug}`} target="_blank" rel="noreferrer" className="app-btn-secondary app-mamul-link-button">Görüntüle</a>
                    </div>
                  </div>
                ))}
                {listLoading ? <SkeletonList count={4} /> : null}
                {!listLoading && filteredMamulList.length === 0 ? (
                  <div className="app-soft-panel m-3 px-4 py-4 text-sm text-[color:var(--app-text-muted)]">Henüz mamül kaydı yok.</div>
                ) : null}
              </div>
            </section>
            ) : null}
    </div>
    </>
    </PullToRefresh>
  );
};

export default AdminMamulPage;
