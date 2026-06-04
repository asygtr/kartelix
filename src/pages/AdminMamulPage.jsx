import React, { useEffect, useMemo, useState } from 'react';
import { clearSession } from '../utils/auth';
import AppNavbar from '../components/AppNavbar';
import PageSearchBar from '../components/PageSearchBar';

const emptyYarn = { iplik_tanim_id: '', iplik_adi: '', oran_yuzde: '', birim_fiyat: '' };
const emptyProcess = { proses_tanim_id: '', proses_adi: '', proses_tipi: '', birim_maliyet: '', renk_bazli: false, aciklama: '' };
const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

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
  aktif: true,
  iplikler: [{ ...emptyYarn }],
  prosesler: [{ ...emptyProcess }]
});

const AdminMamulPage = ({ mode = 'admin' }) => {
  const [types, setTypes] = useState([]);
  const [colors, setColors] = useState([]);
  const [yarnDefinitions, setYarnDefinitions] = useState([]);
  const [processDefinitions, setProcessDefinitions] = useState([]);
  const [mamulList, setMamulList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedMamulId, setSelectedMamulId] = useState(null);
  const [selectedMamulDetail, setSelectedMamulDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setShowEditor] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  const fetchInitial = async () => {
    const [typesResponse, colorsResponse, yarnsResponse, processesResponse, mamulResponse] = await Promise.all([
      fetch('/api/admin/mamul-turleri'),
      fetch('/api/admin/renkler'),
      fetch('/api/admin/iplikler'),
      fetch('/api/admin/prosesler'),
      fetch('/api/admin/mamuller')
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
  };

  useEffect(() => {
    fetchInitial();
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
        const response = await fetch(`/api/admin/mamuller/next-article-no/${form.mamulTuruId}`);
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
        headers: { 'Content-Type': 'application/json' },
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
        : `Mamül kaydedildi. Article Code: ${result.data.articleCode}`);
      setSelectedMamulId(null);
      setForm(createEmptyForm());
      setShowEditor(false);
      fetchInitial();
    } catch (err) {
      setMessage(err.message);
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

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  const showMamulDetail = async (mamulId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/mamuller/${mamulId}`);
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

  const pageTitle = mode === 'mamul' ? 'Excel mamül kartları' : 'Mamül kartı';
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
    <div className="app-page">
      <div className="app-container space-y-6">
        <AppNavbar
          title={pageTitle}
          onLogout={handleLogout}
        />

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
          <div className="space-y-6">
          {false ? (
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
                    <div className="app-stat-label">Article No</div>
                    <div className="text-lg font-bold mt-2">{form.articleNoPreview || '-'}</div>
                  </div>
                  <div className="app-stat">
                    <div className="app-stat-label">Article Code</div>
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
                  <div key={`iplik-${index}`} className="grid gap-3 md:grid-cols-4">
                    <select className="app-select" value={item.iplik_tanim_id} onChange={(e) => applyYarnDefinition(index, e.target.value)}>
                      <option value="">Tanımlı iplik seçin</option>
                      {yarnDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.ad}</option>)}
                    </select>
                    <input className="app-input" placeholder="İplik adı" value={item.iplik_adi} onChange={(e) => updateArrayItem('iplikler', index, 'iplik_adi', e.target.value)} />
                    <input className="app-input" placeholder="Oran %" value={item.oran_yuzde} onChange={(e) => updateArrayItem('iplikler', index, 'oran_yuzde', e.target.value)} />
                    <input className="app-input" placeholder="Birim fiyat" value={item.birim_fiyat} onChange={(e) => updateArrayItem('iplikler', index, 'birim_fiyat', e.target.value)} />
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
                  <div key={`proses-${index}`} className="grid gap-3 md:grid-cols-5">
                    <select className="app-select" value={item.proses_tanim_id} onChange={(e) => applyProcessDefinition(index, e.target.value)}>
                      <option value="">Tanımlı proses seçin</option>
                      {processDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.ad}</option>)}
                    </select>
                    <input className="app-input" placeholder="Proses adı" value={item.proses_adi} onChange={(e) => updateArrayItem('prosesler', index, 'proses_adi', e.target.value)} />
                    <input className="app-input" placeholder="Proses tipi" value={item.proses_tipi} onChange={(e) => updateArrayItem('prosesler', index, 'proses_tipi', e.target.value)} />
                    <input className="app-input" placeholder="Birim maliyet" value={item.birim_maliyet} onChange={(e) => updateArrayItem('prosesler', index, 'birim_maliyet', e.target.value)} />
                    <input className="app-input" placeholder="Açıklama" value={item.aciklama} onChange={(e) => updateArrayItem('prosesler', index, 'aciklama', e.target.value)} />
                  </div>
                ))}
              </div>
            </section>

            <section className="app-panel p-6">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Maliyet ve satış</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="app-stat">
                  <div className="app-stat-label">İplik maliyeti</div>
                  <div className="app-stat-value">{yarnCost.toFixed(2)}</div>
                </div>
                <div className="app-stat">
                  <div className="app-stat-label">Proses maliyeti</div>
                  <div className="app-stat-value">{processCost.toFixed(2)}</div>
                </div>
                <div className="app-stat" style={{ background: 'linear-gradient(135deg, var(--app-surface-strong), var(--app-primary-strong))', color: '#fff' }}>
                  <div className="app-stat-label" style={{ color: 'rgba(255,255,255,0.65)' }}>1 kg maliyet</div>
                  <div className="app-stat-value" style={{ color: '#fff' }}>{hasCostInput ? totalCost : '-'}</div>
                </div>
                <input className="app-input md:col-span-2" placeholder="1 kg satış fiyatı" value={form.birKgSatisFiyati} onChange={(e) => setForm((prev) => ({ ...prev, birKgSatisFiyati: e.target.value }))} />
                <label className="app-soft-panel flex items-center gap-3 px-4 py-3 text-sm">
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
            {selectedMamulDetail ? (
            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Mamül detayı</h2>
                <button type="button" onClick={() => setSelectedMamulDetail(null)} className="app-btn-secondary">Listeye geri dön</button>
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

                  <div className="app-data-table">
                    <div className="app-data-row"><div className="app-data-key">Renk</div><div className="app-data-value">{selectedMamulDetail.renk || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Koleksiyon</div><div className="app-data-value">{selectedMamulDetail.koleksiyon_adi || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Kompozisyon</div><div className="app-data-value">{selectedMamulDetail.kompozisyon_ozeti || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Ölçü</div><div className="app-data-value">{selectedMamulDetail.en || '-'} EN / {selectedMamulDetail.gramaj || '-'} GR</div></div>
                    <div className="app-data-row"><div className="app-data-key">1 kg maliyet</div><div className="app-data-value">{Number(selectedMamulDetail.bir_kg_maliyet || 0).toFixed(2)}</div></div>
                    <div className="app-data-row"><div className="app-data-key">1 kg satış</div><div className="app-data-value">{Number(selectedMamulDetail.bir_kg_satis_fiyati || 0).toFixed(2)}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Durum</div><div className="app-data-value">{selectedMamulDetail.yayin_durumu || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Excel dosyası</div><div className="app-data-value">{selectedMamulDetail.excel_kaynak_dosyasi || '-'}</div></div>
                    <div className="app-data-row"><div className="app-data-key">Excel satırı</div><div className="app-data-value">{selectedMamulDetail.excel_satir_no || '-'}</div></div>
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
                          {item.proses_adi} / {item.proses_tipi || 'Tip tanımsız'} / {Number(item.birim_maliyet || 0).toFixed(2)}
                        </div>
                      )) : <div className="text-sm text-[color:var(--app-text-muted)]">-</div>}
                    </div>
                  </div>
                </div>
              )}
            </section>
            ) : null}

            {!selectedMamulDetail ? (
            <section className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Kayıtlı mamüller</h2>
                <span className="text-sm text-[color:var(--app-text-muted)]">{mamulList.length} kayıt</span>
              </div>
              <div className="mt-5 overflow-x-auto rounded-xl border border-[color:var(--app-border)]">
                <div className="min-w-[980px]">
                  <div className="app-table-head app-mamul-table">
                    <div>Mamül</div>
                    <div>Article</div>
                    <div>Tür / Renk</div>
                    <div>1 kg satış</div>
                    <div>Durum</div>
                    <div>Görünüm</div>
                  </div>
                  {filteredMamulList.map((item) => (
                    <div key={item.id} className="app-table-row app-mamul-table">
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="text-sm text-[color:var(--app-text-muted)]">{item.article_code} / {item.article_no}</div>
                      <div className="text-sm text-[color:var(--app-text-muted)]">{item.mamul_turu_adi}{item.renk ? ` · ${item.renk}` : ''}</div>
                      <div className="text-sm font-semibold text-[color:var(--app-success)]">{Number(item.bir_kg_satis_fiyati || 0).toFixed(2)}</div>
                      <div className="text-sm text-[color:var(--app-text-muted)]">{item.yayin_durumu || (item.aktif ? 'yayinda' : 'taslak')}</div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => showMamulDetail(item.id)} className="app-btn-secondary">Detay gör</button>
                        <a href={`/u/${item.qr_slug}`} target="_blank" rel="noreferrer" className="app-btn-secondary">Public gör</a>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredMamulList.length === 0 ? (
                  <div className="app-soft-panel m-3 px-4 py-4 text-sm text-[color:var(--app-text-muted)]">Henüz mamül kaydı yok.</div>
                ) : null}
              </div>
            </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMamulPage;
