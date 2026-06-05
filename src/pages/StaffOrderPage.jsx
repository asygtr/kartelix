import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSession } from '../utils/auth';
import PageSearchBar from '../components/PageSearchBar';

const emptyCustomerForm = {
  musteriAdi: '',
  firmaAdi: '',
  ilgiliKisi: '',
  telefon: '',
  email: '',
  fuarAdi: '',
  aciklama: '',
  durum: 'kaydedildi',
  kartvizitImageDataUrl: '',
  kartvizitNotu: '',
  kartvizitOcrFirma: '',
  kartvizitOcrKisi: '',
  kartvizitOcrTelefon: '',
  kartvizitOcrEmail: '',
  kartvizitOcrDurumu: 'bekleniyor'
};

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="m16.86 3.49 3.65 3.65-9.9 9.9-4.4.75.75-4.4 9.9-9.9Zm-8.4 11.22-.3 1.78 1.78-.3 8.55-8.55-1.48-1.48-8.55 8.55Z" fill="currentColor" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M8 4h8l1 2h4v2H3V6h4l1-2Zm1 6h2v8H9v-8Zm4 0h2v8h-2v-8Z" fill="currentColor" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
  </svg>
);

const CardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 3v7h16V9H4Zm2 2h5v2H6v-2Z" fill="currentColor" />
  </svg>
);

const createLineId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');

const extractBusinessCardFields = (lines) => {
  const cleanLines = lines.map((line) => String(line || '').trim()).filter(Boolean).slice(0, 20);
  const merged = cleanLines.join('\n');
  const emailMatch = merged.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = merged.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const filteredForNames = cleanLines.filter((line) => {
    const lower = line.toLowerCase();
    return !/@/.test(line) && !/\d{3,}/.test(line) && !lower.includes('www.') && !lower.includes('http');
  });

  const firma = filteredForNames[0] || '';
  const kisi = filteredForNames.find((line) => line !== firma && line.split(' ').length >= 2) || '';

  return {
    firma,
    kisi,
    telefon: phoneMatch ? normalizePhone(phoneMatch[1]) : '',
    email: emailMatch ? emailMatch[0] : ''
  };
};

const detectBusinessCardText = async (file) => {
  if (typeof window === 'undefined' || !('TextDetector' in window) || typeof createImageBitmap !== 'function') {
    return { supported: false, lines: [] };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const detector = new window.TextDetector();
    const blocks = await detector.detect(bitmap);
    const lines = blocks.map((block) => String(block.rawValue || '').trim()).filter(Boolean);
    return { supported: true, lines };
  } catch {
    return { supported: true, lines: [] };
  } finally {
    if (bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
};

const matchesOrderSearch = (order, term) => {
  const value = String(term || '').trim().toLowerCase();
  if (!value) return true;

  return [
    order.id,
    order.firma_adi,
    order.musteri_adi,
    order.ilgili_kisi,
    order.telefon,
    order.email,
    order.fuar_adi,
    order.aciklama,
    order.article_codes,
    order.article_nos,
    order.mamul_adlari,
    order.personel_username,
    order.kartvizit_ocr_firma,
    order.kartvizit_ocr_kisi,
    order.kartvizit_ocr_email
  ].some((field) => String(field || '').toLowerCase().includes(value));
};

const StaffOrderPage = ({ mode = 'staff' }) => {
  const user = getSession();
  const canSeePrices = mode === 'admin' || user?.yetki === 'admin';
  const fileInputRef = useRef(null);
  const searchBlockRef = useRef(null);
  const [companies, setCompanies] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [form, setForm] = useState(emptyCustomerForm);
  const [panelMode, setPanelMode] = useState(null);
  const [createStep, setCreateStep] = useState('items');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderDeleteTerm, setOrderDeleteTerm] = useState('');
  const [orderFilterExpanded, setOrderFilterExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [addQrMessage, setAddQrMessage] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  const title = 'Siparişler';
  const areaLabel = mode === 'admin' ? 'Kartelix / Yönetici' : 'Kartelix / Satıcı';
  const recentLimit = isMobile ? 5 : 8;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadOrders = async () => {
    const response = await fetch('/api/orders');
    const result = await response.json();
    setOrders(result.success ? result.data : []);
  };

  const loadCompanies = async () => {
    const response = await fetch('/api/firmalar');
    const result = await response.json();
    setCompanies(result.success ? result.data : []);
  };

  const loadColors = async () => {
    const response = await fetch('/api/admin/renkler');
    const result = await response.json();
    setColorOptions(result.success ? result.data : []);
  };

  useEffect(() => {
    loadOrders();
    loadCompanies();
    loadColors();
  }, []);

  const searchMamuller = async (term) => {
    const normalizedTerm = String(term || '').trim();
    if (normalizedTerm.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/mamuller?term=${encodeURIComponent(normalizedTerm)}`);
      const result = await response.json();
      setResults(result.success ? result.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchMamuller(searchTerm);
    }, 220);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const orderTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.tutar || 0), 0),
    [selectedItems]
  );

  const orderQuantity = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.miktarKg || 0), 0),
    [selectedItems]
  );

  const recentOrders = useMemo(() => {
    if (orderFilterExpanded) return orders;
    return orders.slice(0, recentLimit);
  }, [orders, orderFilterExpanded, recentLimit]);

  const searchableEditOrders = useMemo(
    () => orders.filter((order) => matchesOrderSearch(order, orderSearchTerm)),
    [orders, orderSearchTerm]
  );

  const searchableDeleteOrders = useMemo(
    () => orders.filter((order) => matchesOrderSearch(order, orderDeleteTerm)),
    [orders, orderDeleteTerm]
  );

  const addItem = (item) => {
    setSelectedItems((prev) => {
      const birimFiyat = Number(item.bir_kg_satis_fiyati || 0);
      return prev.concat({
        lineId: createLineId(),
        mamulId: item.id,
        mamul_adi: item.mamul_adi,
        article_code: item.article_code,
        article_no: item.article_no,
        renk: item.renk || '',
        birimFiyat: canSeePrices ? birimFiyat : 0,
        miktarKg: 1,
        tutar: Number((canSeePrices ? birimFiyat : 0).toFixed(2))
      });
    });
  };

  const handleQrAdd = async (event, incomingCode) => {
    if (event) event.preventDefault();
    const lookupCode = String(incomingCode || '').trim();
    if (!lookupCode) {
      setAddQrMessage('QR, public link, slug veya article code girin.');
      return;
    }

    try {
      setAddQrMessage('');
      const response = await fetch(`/api/admin/mamul-lookup?code=${encodeURIComponent(lookupCode)}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Mamül bulunamadı');
      }
      addItem(result.data);
      setSearchTerm('');
      setResults([]);
      setAddQrMessage(`Mamül siparişe eklendi: ${result.data.mamul_adi}`);
    } catch (error) {
      setAddQrMessage(error.message);
    }
  };

  const updateItem = (lineId, key, value) => {
    setSelectedItems((prev) => prev.map((item) => {
      if (item.lineId !== lineId) return item;
      const nextItem = { ...item, [key]: value };
      const miktar = Number(key === 'miktarKg' ? value : nextItem.miktarKg || 0);
      const fiyat = Number(canSeePrices ? (key === 'birimFiyat' ? value : nextItem.birimFiyat || 0) : 0);
      nextItem.tutar = Number((miktar * fiyat).toFixed(2));
      return nextItem;
    }));
  };

  const removeItem = (lineId) => {
    setSelectedItems((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const resetEditorState = () => {
    setEditingOrderId(null);
    setSelectedOrderDetail(null);
    setSelectedItems([]);
    setForm(emptyCustomerForm);
    setCreateStep('items');
    setSearchTerm('');
    setResults([]);
    setAddQrMessage('');
    setCardMessage('');
  };

  const openCreatePanel = () => {
    setPanelMode('create');
    resetEditorState();
  };

  const openEditPanel = () => {
    setPanelMode('edit');
    resetEditorState();
    setOrderSearchTerm('');
  };

  const openDeletePanel = () => {
    setPanelMode('delete');
    resetEditorState();
    setOrderDeleteTerm('');
  };

  const closePanel = () => {
    setPanelMode(null);
    resetEditorState();
  };

  const loadOrderDetail = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sipariş detayı alınamadı');
      }
      setSelectedOrderDetail(result.data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadOrderIntoEditor = (detail) => {
    setPanelMode('edit');
    setCreateStep('details');
    setEditingOrderId(detail.id);
    setForm({
      musteriAdi: detail.musteri_adi || '',
      firmaAdi: detail.firma_adi || '',
      ilgiliKisi: detail.ilgili_kisi || '',
      telefon: detail.telefon || '',
      email: detail.email || '',
      fuarAdi: detail.fuar_adi || '',
      aciklama: detail.aciklama || '',
      durum: detail.durum || 'kaydedildi',
      kartvizitImageDataUrl: detail.kartvizit_gorsel || '',
      kartvizitNotu: detail.kartvizit_notu || '',
      kartvizitOcrFirma: detail.kartvizit_ocr_firma || '',
      kartvizitOcrKisi: detail.kartvizit_ocr_kisi || '',
      kartvizitOcrTelefon: detail.kartvizit_ocr_telefon || '',
      kartvizitOcrEmail: detail.kartvizit_ocr_email || '',
      kartvizitOcrDurumu: detail.kartvizit_ocr_durumu || 'bekleniyor'
    });
    setSelectedItems((detail.items || []).map((item, index) => ({
      lineId: `${item.id || item.mamul_id}-${index}`,
      mamulId: item.mamul_id,
      mamul_adi: item.mamul_adi,
      article_code: item.article_code,
      article_no: item.article_no,
      renk: item.renk || '',
      birimFiyat: canSeePrices ? Number(item.birim_fiyat || 0) : 0,
      miktarKg: Number(item.miktar_kg || 0),
      tutar: canSeePrices ? Number(item.tutar || 0) : 0
    })));
    setSelectedOrderDetail(detail);
  };

  const handleBusinessCardPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setCardProcessing(true);
      setCardMessage('');
      const imageDataUrl = await readFileAsDataUrl(file);
      const detection = await detectBusinessCardText(file);
      const extracted = extractBusinessCardFields(detection.lines || []);

      setForm((prev) => ({
        ...prev,
        kartvizitImageDataUrl: imageDataUrl,
        kartvizitOcrDurumu: detection.supported ? 'hazir' : 'desteklenmiyor',
        kartvizitOcrFirma: extracted.firma || prev.kartvizitOcrFirma,
        kartvizitOcrKisi: extracted.kisi || prev.kartvizitOcrKisi,
        kartvizitOcrTelefon: extracted.telefon || prev.kartvizitOcrTelefon,
        kartvizitOcrEmail: extracted.email || prev.kartvizitOcrEmail,
        firmaAdi: prev.firmaAdi || extracted.firma,
        ilgiliKisi: prev.ilgiliKisi || extracted.kisi,
        telefon: prev.telefon || extracted.telefon,
        email: prev.email || extracted.email
      }));

      if (detection.supported && (extracted.firma || extracted.kisi || extracted.telefon || extracted.email)) {
        setCardMessage('Kartvizit okundu. Alanlar onay için dolduruldu.');
      } else if (detection.supported) {
        setCardMessage('Kartvizit eklendi. OCR net veri çıkaramadı, alanları elle tamamlayabilirsiniz.');
      } else {
        setCardMessage('Kartvizit eklendi. Bu cihazda OCR desteklenmediği için alanları elle tamamlayabilirsiniz.');
      }
    } catch {
      setCardMessage('Kartvizit görseli eklenemedi.');
    } finally {
      setCardProcessing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const deleteOrder = async (orderId) => {
    const confirmed = window.confirm(`Sipariş #${orderId} silinsin mi?`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setMessage('');
      const response = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sipariş silinemedi');
      }
      if (selectedOrderDetail?.id === orderId) {
        setSelectedOrderDetail(null);
      }
      setMessage(`Sipariş silindi: #${orderId}`);
      await loadOrders();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage('');

      const normalizedFirmaAdi = String(form.firmaAdi || '').trim();
      const companyExists = normalizedFirmaAdi
        ? companies.some((company) => company.ad?.toLowerCase() === normalizedFirmaAdi.toLowerCase())
        : true;

      if (normalizedFirmaAdi && !companyExists) {
        await fetch('/api/firmalar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ad: normalizedFirmaAdi,
            telefon: form.telefon,
            adres: ''
          })
        });
        await loadCompanies();
      }

      const response = await fetch(editingOrderId ? `/api/orders/${editingOrderId}` : '/api/orders', {
        method: editingOrderId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          personelUsername: user?.username || mode,
          items: selectedItems.map((item) => ({
            mamulId: item.mamulId,
            miktarKg: Number(item.miktarKg || 0),
            birimFiyat: Number(item.birimFiyat || 0),
            renk: item.renk
          })),
          kartvizit: {
            imageDataUrl: form.kartvizitImageDataUrl,
            note: form.kartvizitNotu,
            ocrFirma: form.kartvizitOcrFirma,
            ocrKisi: form.kartvizitOcrKisi,
            ocrTelefon: form.kartvizitOcrTelefon,
            ocrEmail: form.kartvizitOcrEmail,
            ocrDurumu: form.kartvizitOcrDurumu
          }
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sipariş kaydedilemedi');
      }

      const emailStatus = result.data.emailStatus;
      const emailText = !editingOrderId && emailStatus
        ? emailStatus.skipped
          ? ''
          : emailStatus.error
          ? ` / E-posta: ${emailStatus.error}`
          : ` / E-posta: ${emailStatus.message || 'işlendi'}`
        : '';
      setMessage(`${editingOrderId ? 'Sipariş güncellendi' : 'Sipariş kaydedildi'}. No: #${result.data.siparisId} / Toplam: ${result.data.toplamTutar.toFixed(2)}${emailText}`);
      closePanel();
      await loadOrders();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  const canContinueToDetails = selectedItems.length > 0;

  return (
    <>
      {message ? (
          <div className="app-panel px-4 py-3 text-sm text-[color:var(--app-text)]">{message}</div>
        ) : null}

        {!panelMode ? (
          <section className="app-panel app-order-band">
            <div className="app-order-band-grid">
              <button type="button" onClick={openCreatePanel} className="app-order-mode-button">
                <span className="app-order-mode-icon"><PlusIcon /></span>
                <span>Sipariş ekle</span>
              </button>
              <button type="button" onClick={openEditPanel} className="app-order-mode-button">
                <span className="app-order-mode-icon"><EditIcon /></span>
                <span>Sipariş düzenle</span>
              </button>
              <button type="button" onClick={openDeletePanel} className="app-order-mode-button is-danger">
                <span className="app-order-mode-icon"><TrashIcon /></span>
                <span>Sipariş sil</span>
              </button>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            {panelMode === 'create' && createStep === 'items' ? (
              <section className="app-panel p-6 app-collapse-panel">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Hızlı sipariş girişi</h2>
                  <button type="button" onClick={closePanel} className="app-nav-icon-button" aria-label="Kapat" title="Kapat"><CloseIcon /></button>
                </div>

                <div className="mt-5" ref={searchBlockRef}>
                  <PageSearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Kayıtlı mamül ara"
                    onSearch={searchMamuller}
                    onQrDetected={(value) => handleQrAdd(null, value)}
                    showResults={Boolean(searchTerm.trim())}
                    results={results.slice(0, 6)}
                    onResultSelect={(item) => {
                      addItem(item);
                      setSearchTerm('');
                      setResults([]);
                    }}
                    getResultPrimary={(item) => item.mamul_adi}
                    getResultSecondary={(item) => (
                      canSeePrices
                        ? `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''} / ${Number(item.bir_kg_satis_fiyati || 0).toFixed(2)}`
                        : `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''}`
                    )}
                    emptyResultsText={loading ? 'Aranıyor...' : 'Bu aramaya uygun mamül bulunamadı.'}
                  />
                </div>

                {addQrMessage ? (
                  <div className="app-soft-panel mt-3 px-4 py-3 text-sm text-[color:var(--app-text-muted)]">{addQrMessage}</div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.lineId} className="app-order-item-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{item.mamul_adi}</div>
                          <div className="mt-0.5 text-sm text-slate-600">{item.article_code}</div>
                        </div>
                        <button type="button" onClick={() => removeItem(item.lineId)} className="text-sm text-red-600 hover:text-red-700">
                          Kaldır
                        </button>
                      </div>

                      <div className="mt-3 app-order-line-grid">
                        <label className="app-order-line-field">
                          <span className="app-order-line-label">Renk</span>
                          <select value={item.renk} onChange={(event) => updateItem(item.lineId, 'renk', event.target.value)} className="app-select app-order-line-input">
                            <option value="">Renk seç</option>
                            {colorOptions.map((color) => (
                              <option key={color.id} value={color.ad}>{color.ad}</option>
                            ))}
                          </select>
                        </label>
                        <label className="app-order-line-field">
                          <span className="app-order-line-label">Kg</span>
                          <input value={item.miktarKg} onChange={(event) => updateItem(item.lineId, 'miktarKg', event.target.value)} placeholder="0" className="app-order-line-input" />
                        </label>
                        {canSeePrices ? (
                          <>
                            <label className="app-order-line-field">
                              <span className="app-order-line-label">1 kg fiyat</span>
                              <input value={item.birimFiyat} onChange={(event) => updateItem(item.lineId, 'birimFiyat', event.target.value)} placeholder="0" className="app-order-line-input" />
                            </label>
                            <div className="app-order-line-total">
                              <span className="app-order-line-label">Toplam</span>
                              <span className="app-order-line-total-value">{Number(item.tutar || 0).toFixed(2)}</span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  {selectedItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setResults([]);
                        searchBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="app-btn-secondary app-order-continue-button mb-3"
                    >
                      Yeni ürün ekle
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canContinueToDetails}
                    onClick={() => setCreateStep('details')}
                    className="app-btn-primary app-order-continue-button disabled:opacity-50"
                  >
                    Eklemeyi bitir ve devam et
                  </button>
                </div>

              </section>
            ) : null}

            {panelMode === 'edit' ? (
              <section className="app-panel p-6 app-collapse-panel">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Sipariş düzenle</h2>
                  <button type="button" onClick={closePanel} className="app-nav-icon-button" aria-label="Kapat" title="Kapat"><CloseIcon /></button>
                </div>
                <input
                  value={orderSearchTerm}
                  onChange={(event) => setOrderSearchTerm(event.target.value)}
                  placeholder="Sipariş no, firma, müşteri, article code, mamül adı, fuar veya not ara"
                  className="app-input mt-5"
                />
                <div className="mt-5 space-y-3">
                  {searchableEditOrders.length === 0 ? (
                    <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Düzenlenecek sipariş bulunamadı.</div>
                  ) : null}
                  {searchableEditOrders.slice(0, 8).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => loadOrderDetail(order.id)}
                      className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">#{order.id} {order.firma_adi || order.musteri_adi}</div>
                          <div className="mt-1 text-sm text-slate-600">{order.kalem_sayisi} mamül / {order.personel_username || '-'}</div>
                          <div className="mt-1 text-sm text-slate-500">{order.fuar_adi || 'Kaynak belirtilmedi'}</div>
                        </div>
                        <div className="text-right">
                          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{order.durum || 'kaydedildi'}</div>
                          <div className="mt-3 font-semibold text-slate-900">{Number(order.toplam_tutar || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {panelMode === 'delete' ? (
              <section className="app-panel p-6 app-collapse-panel">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Sipariş sil</h2>
                  <button type="button" onClick={closePanel} className="app-nav-icon-button" aria-label="Kapat" title="Kapat"><CloseIcon /></button>
                </div>
                <input
                  value={orderDeleteTerm}
                  onChange={(event) => setOrderDeleteTerm(event.target.value)}
                  placeholder="Sipariş no, firma, müşteri, article code, mamül adı veya not ara"
                  className="app-input mt-5"
                />
                <div className="mt-5 space-y-3">
                  {searchableDeleteOrders.length === 0 ? (
                    <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Silinecek sipariş bulunamadı.</div>
                  ) : null}
                  {searchableDeleteOrders.slice(0, 8).map((order) => (
                    <div key={order.id} className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">#{order.id} {order.firma_adi || order.musteri_adi}</div>
                          <div className="mt-1 text-sm text-slate-600">{order.kalem_sayisi} mamül / {order.article_codes || '-'}</div>
                        </div>
                        <button type="button" onClick={() => deleteOrder(order.id)} disabled={deleting} className="app-btn-danger">
                          Siparişi sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {(panelMode === 'create' ? createStep === 'details' : Boolean(editingOrderId)) ? (
              <section className="app-panel p-6 app-collapse-panel">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Sipariş satırları</h2>
                  <span className="text-sm text-[color:var(--app-text-muted)]">{selectedItems.length} mamül</span>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedItems.length === 0 ? (
                    <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Henüz siparişe mamül eklenmedi.</div>
                  ) : null}

                  {selectedItems.map((item) => (
                    <div key={item.lineId} className="app-order-item-card app-order-item-card-detail">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">{item.mamul_adi}</div>
                          <div className="mt-1 text-sm text-slate-600">{item.article_code}</div>
                          <div className="mt-1 text-sm text-slate-500">{item.renk || 'Renk tanımsız'}</div>
                        </div>
                        <button type="button" onClick={() => removeItem(item.lineId)} className="text-sm text-red-600 hover:text-red-700">
                          Kaldır
                        </button>
                      </div>

                      <div className="mt-4 app-order-line-grid">
                        <label className="app-order-line-field">
                          <span className="app-order-line-label">Renk</span>
                          <select value={item.renk} onChange={(event) => updateItem(item.lineId, 'renk', event.target.value)} className="app-select app-order-line-input">
                            <option value="">Renk seç</option>
                            {colorOptions.map((color) => (
                              <option key={color.id} value={color.ad}>{color.ad}</option>
                            ))}
                          </select>
                        </label>
                        <label className="app-order-line-field">
                          <span className="app-order-line-label">Kg</span>
                          <input value={item.miktarKg} onChange={(event) => updateItem(item.lineId, 'miktarKg', event.target.value)} placeholder="0" className="app-order-line-input" />
                        </label>
                        {canSeePrices ? (
                          <>
                            <label className="app-order-line-field">
                              <span className="app-order-line-label">1 kg fiyat</span>
                              <input value={item.birimFiyat} onChange={(event) => updateItem(item.lineId, 'birimFiyat', event.target.value)} placeholder="0" className="app-order-line-input" />
                            </label>
                            <div className="app-order-line-total">
                              <span className="app-order-line-label">Satır toplamı</span>
                              <span className="app-order-line-total-value">{Number(item.tutar || 0).toFixed(2)}</span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            {(panelMode === 'create' ? createStep === 'details' : Boolean(editingOrderId)) ? (
              <form onSubmit={submitOrder} className="app-panel p-6 app-collapse-panel">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
                    {editingOrderId ? `Sipariş düzenle #${editingOrderId}` : 'Hızlı giriş ve detay tamamlama'}
                  </h2>
                  {editingOrderId ? (
                    <button type="button" onClick={closePanel} className="app-btn-secondary">Düzenlemeyi kapat</button>
                  ) : (
                    <button type="button" onClick={() => setCreateStep('items')} className="app-btn-secondary">Ürünlere dön</button>
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <input value={form.musteriAdi} onChange={(event) => setForm((prev) => ({ ...prev, musteriAdi: event.target.value }))} placeholder="Müşteri adı" className="app-input" />
                  <input value={form.firmaAdi} onChange={(event) => setForm((prev) => ({ ...prev, firmaAdi: event.target.value }))} placeholder="Firma adı" list="firma-listesi" className="app-input" />
                  <datalist id="firma-listesi">
                    {companies.map((company) => (
                      <option key={company.id} value={company.ad} />
                    ))}
                  </datalist>
                  <input value={form.ilgiliKisi} onChange={(event) => setForm((prev) => ({ ...prev, ilgiliKisi: event.target.value }))} placeholder="İlgili kişi" className="app-input" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={form.telefon} onChange={(event) => setForm((prev) => ({ ...prev, telefon: event.target.value }))} placeholder="Telefon" className="app-input" />
                    <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="E-posta" className="app-input" />
                  </div>
                  <input value={form.fuarAdi} onChange={(event) => setForm((prev) => ({ ...prev, fuarAdi: event.target.value }))} placeholder="Fuar / kaynak" className="app-input" />
                  <select value={form.durum} onChange={(event) => setForm((prev) => ({ ...prev, durum: event.target.value }))} className="app-select">
                    <option value="kaydedildi">Kaydedildi</option>
                    <option value="isleme_alindi">İşleme alındı</option>
                    <option value="kapatildi">Kapatıldı</option>
                  </select>
                  <textarea value={form.aciklama} onChange={(event) => setForm((prev) => ({ ...prev, aciklama: event.target.value }))} placeholder="Sipariş notu" className="app-textarea min-h-28" />
                </div>

                <div className="app-soft-panel mt-5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--app-text)]">Kartvizit / firma görseli</div>
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="app-btn-secondary">
                      <span className="inline-flex items-center gap-2"><CardIcon />Kartvizit ekle</span>
                    </button>
                  </div>

                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleBusinessCardPick} style={{ display: 'none' }} />
                  {cardProcessing ? <div className="mt-3 text-sm text-[color:var(--app-text-muted)]">Kartvizit işleniyor...</div> : null}
                  {cardMessage ? <div className="mt-3 text-sm text-[color:var(--app-text-muted)]">{cardMessage}</div> : null}

                  {form.kartvizitImageDataUrl ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-[0.85fr,1.15fr]">
                      <div className="overflow-hidden rounded-2xl border border-[color:var(--app-border)] bg-white/50">
                        <img src={form.kartvizitImageDataUrl} alt="Kartvizit önizleme" className="h-full w-full object-cover" />
                      </div>
                      <div className="grid gap-3">
                        <input value={form.kartvizitOcrFirma} onChange={(event) => setForm((prev) => ({ ...prev, kartvizitOcrFirma: event.target.value }))} placeholder="OCR firma" className="app-input" />
                        <input value={form.kartvizitOcrKisi} onChange={(event) => setForm((prev) => ({ ...prev, kartvizitOcrKisi: event.target.value }))} placeholder="OCR ilgili kişi" className="app-input" />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input value={form.kartvizitOcrTelefon} onChange={(event) => setForm((prev) => ({ ...prev, kartvizitOcrTelefon: event.target.value }))} placeholder="OCR telefon" className="app-input" />
                          <input value={form.kartvizitOcrEmail} onChange={(event) => setForm((prev) => ({ ...prev, kartvizitOcrEmail: event.target.value }))} placeholder="OCR e-posta" className="app-input" />
                        </div>
                        <textarea value={form.kartvizitNotu} onChange={(event) => setForm((prev) => ({ ...prev, kartvizitNotu: event.target.value }))} placeholder="Kartvizit notu" className="app-textarea min-h-24" />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Toplam kg</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{orderQuantity.toFixed(2)}</div>
                  </div>
                  {canSeePrices ? (
                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-300">Toplam tutar</div>
                      <div className="mt-2 text-2xl font-semibold">{orderTotal.toFixed(2)}</div>
                    </div>
                  ) : null}
                </div>

                <button type="submit" disabled={saving} className="mt-6 w-full rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {saving ? 'Kaydediliyor...' : editingOrderId ? 'Siparişi güncelle' : 'Siparişi kaydet'}
                </button>
              </form>
            ) : null}

          </div>
        </div>

        {(panelMode === 'edit' || panelMode === 'delete' || !panelMode) ? (
          <section className="app-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Son siparişler</h2>
              <button type="button" onClick={loadOrders} className="text-sm text-emerald-700 hover:text-emerald-900">Yenile</button>
            </div>

            <div className="mt-5 space-y-3">
              {recentOrders.length === 0 ? (
                <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Henüz kayıtlı sipariş yok.</div>
              ) : null}

              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => loadOrderDetail(order.id)}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">#{order.id} {order.firma_adi || order.musteri_adi}</div>
                      <div className="mt-1 text-sm text-slate-600">{order.kalem_sayisi} mamül / {order.personel_username || '-'}</div>
                      <div className="mt-1 text-sm text-slate-500">{order.fuar_adi || 'Kaynak belirtilmedi'}</div>
                    </div>
                    <div className="text-right">
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{order.durum || 'kaydedildi'}</div>
                      <div className="mt-3 font-semibold text-slate-900">{Number(order.toplam_tutar || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {orders.length > recentLimit ? (
              <div className="mt-4">
                <button type="button" onClick={() => setOrderFilterExpanded((prev) => !prev)} className="app-btn-secondary">
                  {orderFilterExpanded ? 'Daha az göster' : 'Daha fazla göster'}
                </button>
              </div>
            ) : null}

            {selectedOrderDetail ? (
              <div className="app-soft-panel mt-5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--app-text-muted)]">Sipariş detayı</div>
                    <div className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">#{selectedOrderDetail.id} {selectedOrderDetail.firma_adi || selectedOrderDetail.musteri_adi}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedOrderDetail(null)} className="app-btn-secondary">Kapat</button>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => loadOrderIntoEditor(selectedOrderDetail)} className="app-btn-primary">Siparişi düzenle</button>
                  <button type="button" onClick={() => deleteOrder(selectedOrderDetail.id)} className="app-btn-danger">Siparişi sil</button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[color:var(--app-text-muted)]">
                  <div>Müşteri: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.musteri_adi || '-'}</span></div>
                  <div>Firma: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.firma_adi || '-'}</span></div>
                  <div>İlgili kişi: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.ilgili_kisi || '-'}</span></div>
                  <div>Telefon: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.telefon || '-'}</span></div>
                  <div>E-posta: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.email || '-'}</span></div>
                  <div>Fuar: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.fuar_adi || '-'}</span></div>
                  <div>Toplam: <span className="font-semibold text-[color:var(--app-text)]">{Number(selectedOrderDetail.toplam_tutar || 0).toFixed(2)}</span></div>
                  <div>Kartvizit OCR: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.kartvizit_ocr_durumu || '-'}</span></div>
                </div>

                {selectedOrderDetail.kartvizit_gorsel ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--app-border)] bg-white/50">
                    <img src={selectedOrderDetail.kartvizit_gorsel} alt="Kartvizit" className="max-h-56 w-full object-cover" />
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {selectedOrderDetail.items?.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[color:var(--app-border)] bg-white/50 px-4 py-3 text-sm">
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-1 text-[color:var(--app-text-muted)]">{item.article_code} / {item.article_no}</div>
                      <div className="mt-2 text-[color:var(--app-text-muted)]">
                        {Number(item.miktar_kg || 0).toFixed(2)} kg x {Number(item.birim_fiyat || 0).toFixed(2)} = {Number(item.tutar || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  {!selectedOrderDetail.items?.length ? (
                    <div className="text-sm text-[color:var(--app-text-muted)]">Bu siparişte henüz kalem görünmüyor.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
    </>
  );
};

export default StaffOrderPage;
