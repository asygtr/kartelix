import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSession } from '../utils/auth';
import PageSearchBar from '../components/PageSearchBar';
import { useToast } from '../components/Toast';
import { Plus, Pencil, Trash2, X, CreditCard, Minus } from '../components/icons.jsx';
import { useHaptic } from '../utils/useHaptic';
import PullToRefresh from '../components/PullToRefresh';
import { SkeletonList } from '../components/Skeleton';

const emptyCustomerForm = {
  musteriAdi: '', firmaAdi: '', ilgiliKisi: '', telefon: '', email: '',
  fuarAdi: '', aciklama: '', durum: 'kaydedildi', onayEmail: '',
  kartvizitImageDataUrl: '', kartvizitNotu: '',
  kartvizitOcrFirma: '', kartvizitOcrKisi: '', kartvizitOcrTelefon: '', kartvizitOcrEmail: '',
  kartvizitOcrDurumu: 'bekleniyor'
};

const PlusIcon   = () => <Plus size={16} />;
const EditIcon   = () => <Pencil size={16} />;
const TrashIcon  = () => <Trash2 size={16} />;
const CloseIcon  = () => <X size={16} />;
const CardIcon   = () => <CreditCard size={16} />;
const RemoveIcon = () => <Minus size={16} />;

const createLineId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const normalizePhone = (v) => String(v || '').replace(/[^\d+]/g, '');

const extractBusinessCardFields = (lines) => {
  const cleanLines = lines.map(l => String(l || '').trim()).filter(Boolean).slice(0, 20);
  const merged = cleanLines.join('\n');
  const emailMatch = merged.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = merged.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const filtered = cleanLines.filter(l => !/@/.test(l) && !/\d{3,}/.test(l) && !l.toLowerCase().includes('www.') && !l.toLowerCase().includes('http'));
  const firma = filtered[0] || '';
  const kisi = filtered.find(l => l !== firma && l.split(' ').length >= 2) || '';
  return { firma, kisi, telefon: phoneMatch ? normalizePhone(phoneMatch[1]) : '', email: emailMatch ? emailMatch[0] : '' };
};

const detectBusinessCardText = async (file) => {
  if (typeof window === 'undefined' || !('TextDetector' in window) || typeof createImageBitmap !== 'function') return { supported: false, lines: [] };
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const detector = new window.TextDetector();
    const blocks = await detector.detect(bitmap);
    return { supported: true, lines: blocks.map(b => String(b.rawValue || '').trim()).filter(Boolean) };
  } catch { return { supported: true, lines: [] }; }
  finally { if (bitmap?.close) bitmap.close(); }
};

const matchesOrderSearch = (order, term) => {
  const v = String(term || '').trim().toLocaleLowerCase('tr');
  if (!v) return true;
  return [order.id, order.firma_adi, order.musteri_adi, order.ilgili_kisi, order.telefon, order.email,
    order.fuar_adi, order.aciklama, order.article_codes, order.article_nos, order.mamul_adlari,
    order.personel_username, order.kartvizit_ocr_firma, order.kartvizit_ocr_kisi, order.kartvizit_ocr_email
  ].some(f => String(f || '').toLocaleLowerCase('tr').includes(v));
};

const StaffOrderPage = ({ mode = 'staff' }) => {
  const user = getSession();
  const canSeePrices = true; // fiyat her zaman gorunur ve duzenlenebilir
  const { show: showToast } = useToast();
  const haptic = useHaptic();
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
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addQrMessage, setAddQrMessage] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const recentLimit = isMobile ? 5 : 8;

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const loadOrders    = async () => { setOrdersLoading(true); try { const r = await fetch('/api/orders'); const d = await r.json(); setOrders(d.success ? d.data : []); } finally { setOrdersLoading(false); } };
  const loadCompanies = async () => { const r = await fetch('/api/firmalar'); const d = await r.json(); setCompanies(d.success ? d.data : []); };
  const loadColors    = async () => { const r = await fetch('/api/admin/renkler'); const d = await r.json(); setColorOptions(d.success ? d.data : []); };

  useEffect(() => { loadOrders(); loadCompanies(); loadColors(); }, []);

  const searchMamuller = async (term) => {
    const t = String(term || '').trim();
    if (t.length < 2) { setResults([]); return; }
    try { setLoading(true); const r = await fetch(`/api/admin/mamuller?term=${encodeURIComponent(t)}`); const d = await r.json(); setResults(d.success ? d.data : []); }
    finally { setLoading(false); }
  };

  useEffect(() => { const id = setTimeout(() => searchMamuller(searchTerm), 220); return () => clearTimeout(id); }, [searchTerm]);

  const orderTotal    = useMemo(() => selectedItems.reduce((s, i) => s + Number(i.tutar || 0), 0), [selectedItems]);
  const orderQuantity = useMemo(() => selectedItems.reduce((s, i) => s + Number(i.miktarKg || 0), 0), [selectedItems]);
  const recentOrders  = useMemo(() => orderFilterExpanded ? orders : orders.slice(0, recentLimit), [orders, orderFilterExpanded, recentLimit]);
  const searchableEditOrders   = useMemo(() => orders.filter(o => matchesOrderSearch(o, orderSearchTerm)), [orders, orderSearchTerm]);
  const searchableDeleteOrders = useMemo(() => orders.filter(o => matchesOrderSearch(o, orderDeleteTerm)), [orders, orderDeleteTerm]);

  const addItem = (item) => setSelectedItems(prev => {
    const bp = Number(item.bir_kg_satis_fiyati || 0);
    return prev.concat({ lineId: createLineId(), mamulId: item.id, mamul_adi: item.mamul_adi, article_code: item.article_code, article_no: item.article_no, renk: item.renk || '', birimFiyat: canSeePrices ? bp : 0, miktarKg: 1, tutar: Number((canSeePrices ? bp : 0).toFixed(2)) });
  });

  const handleQrAdd = async (event, incomingCode) => {
    if (event) event.preventDefault();
    const code = String(incomingCode || '').trim();
    if (!code) { setAddQrMessage('QR, public link, slug veya article code girin.'); return; }
    try {
      setAddQrMessage('');
      const r = await fetch(`/api/admin/mamul-lookup?code=${encodeURIComponent(code)}`);
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Mamül bulunamadı');
      addItem(d.data); setSearchTerm(''); setResults([]);
      setAddQrMessage(`Mamül siparişe eklendi: ${d.data.mamul_adi}`);
    } catch (e) { setAddQrMessage(e.message); }
  };

  const updateItem = (lineId, key, value) => setSelectedItems(prev => prev.map(item => {
    if (item.lineId !== lineId) return item;
    const next = { ...item, [key]: value };
    const kg = Number(key === 'miktarKg' ? value : next.miktarKg || 0);
    const fiyat = Number(canSeePrices ? (key === 'birimFiyat' ? value : next.birimFiyat || 0) : 0);
    next.tutar = Number((kg * fiyat).toFixed(2));
    return next;
  }));

  const removeItem = (lineId) => setSelectedItems(prev => prev.filter(i => i.lineId !== lineId));

  const resetEditorState = () => { setEditingOrderId(null); setSelectedOrderDetail(null); setSelectedItems([]); setForm(emptyCustomerForm); setCreateStep('items'); setSearchTerm(''); setResults([]); setAddQrMessage(''); setCardMessage(''); };
  const openCreatePanel = () => { setPanelMode('create'); resetEditorState(); };
  const openEditPanel   = () => { setPanelMode('edit'); resetEditorState(); setOrderSearchTerm(''); };
  const openDeletePanel = () => { setPanelMode('delete'); resetEditorState(); setOrderDeleteTerm(''); };
  const closePanel      = () => { setPanelMode(null); resetEditorState(); };

  const loadOrderDetail = async (orderId) => {
    try { const r = await fetch(`/api/orders/${orderId}`); const d = await r.json(); if (!r.ok || !d.success) throw new Error(d.error || 'Detay alınamadı'); setSelectedOrderDetail(d.data); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const loadOrderIntoEditor = (detail) => {
    setPanelMode('edit'); setCreateStep('details'); setEditingOrderId(detail.id);
    setForm({ musteriAdi: detail.musteri_adi || '', firmaAdi: detail.firma_adi || '', ilgiliKisi: detail.ilgili_kisi || '', telefon: detail.telefon || '', email: detail.email || '', fuarAdi: detail.fuar_adi || '', aciklama: detail.aciklama || '', durum: detail.durum || 'kaydedildi', onayEmail: detail.onay_email || '', kartvizitImageDataUrl: detail.kartvizit_gorsel || '', kartvizitNotu: detail.kartvizit_notu || '', kartvizitOcrFirma: detail.kartvizit_ocr_firma || '', kartvizitOcrKisi: detail.kartvizit_ocr_kisi || '', kartvizitOcrTelefon: detail.kartvizit_ocr_telefon || '', kartvizitOcrEmail: detail.kartvizit_ocr_email || '', kartvizitOcrDurumu: detail.kartvizit_ocr_durumu || 'bekleniyor' });
    setSelectedItems((detail.items || []).map((item, idx) => ({ lineId: `${item.id || item.mamul_id}-${idx}`, mamulId: item.mamul_id, mamul_adi: item.mamul_adi, article_code: item.article_code, article_no: item.article_no, renk: item.renk || '', birimFiyat: canSeePrices ? Number(item.birim_fiyat || 0) : 0, miktarKg: Number(item.miktar_kg || 0), tutar: canSeePrices ? Number(item.tutar || 0) : 0 })));
    setSelectedOrderDetail(detail);
  };

  const handleBusinessCardPick = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      setCardProcessing(true); setCardMessage('');
      const imageDataUrl = await readFileAsDataUrl(file);
      const detection = await detectBusinessCardText(file);
      const ex = extractBusinessCardFields(detection.lines || []);
      setForm(prev => ({ ...prev, kartvizitImageDataUrl: imageDataUrl, kartvizitOcrDurumu: detection.supported ? 'hazir' : 'desteklenmiyor', kartvizitOcrFirma: ex.firma || prev.kartvizitOcrFirma, kartvizitOcrKisi: ex.kisi || prev.kartvizitOcrKisi, kartvizitOcrTelefon: ex.telefon || prev.kartvizitOcrTelefon, kartvizitOcrEmail: ex.email || prev.kartvizitOcrEmail, firmaAdi: prev.firmaAdi || ex.firma, ilgiliKisi: prev.ilgiliKisi || ex.kisi, telefon: prev.telefon || ex.telefon, email: prev.email || ex.email }));
      if (detection.supported && (ex.firma || ex.kisi || ex.telefon || ex.email)) setCardMessage('Kartvizit okundu. Alanlar onay için dolduruldu.');
      else if (detection.supported) setCardMessage('Kartvizit eklendi. OCR net veri çıkaramadı.');
      else setCardMessage('Kartvizit eklendi. Bu cihazda OCR desteklenmiyor.');
    } catch { setCardMessage('Kartvizit görseli eklenemedi.'); }
    finally { setCardProcessing(false); if (event.target) event.target.value = ''; }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm(`Sipariş #${orderId} silinsin mi?`)) return;
    try { setDeleting(true); const r = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' }); const d = await r.json(); if (!r.ok || !d.success) throw new Error(d.error || 'Silinemedi'); if (selectedOrderDetail?.id === orderId) setSelectedOrderDetail(null); haptic.success(); showToast(`Sipariş silindi: #${orderId}`, 'success'); await loadOrders(); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setDeleting(false); }
  };

  const completeOrder = async (orderId) => {
    if (!window.confirm(`Sipariş #${orderId} tamamlansın mı? Onay e-postası gönderilecek.`)) return;
    try {
      setCompleting(true);
      const r = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onayEmail: form.onayEmail })
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Tamamlanamadı');
      const es = d.data.emailStatus;
      const emailMsg = es?.skipped ? '' : es?.error ? ` / E-posta: ${es.error}` : ' / Onay e-postası gönderildi';
      haptic.success(); showToast(`Sipariş #${orderId} tamamlandı${emailMsg}`, 'success');
      closePanel(); await loadOrders();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCompleting(false); }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    try {
      setSaving(true); setAddQrMessage('');
      const firma = String(form.firmaAdi || '').trim();
      if (firma && !companies.some(c => c.ad?.toLocaleLowerCase('tr') === firma.toLocaleLowerCase('tr'))) {
        await fetch('/api/firmalar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: firma, telefon: form.telefon, adres: '' }) });
        await loadCompanies();
      }
      const r = await fetch(editingOrderId ? `/api/orders/${editingOrderId}` : '/api/orders', {
        method: editingOrderId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, personelUsername: user?.username || mode, items: selectedItems.map(i => ({ mamulId: i.mamulId, miktarKg: Number(i.miktarKg || 0), birimFiyat: Number(i.birimFiyat || 0), renk: i.renk })), kartvizit: { imageDataUrl: form.kartvizitImageDataUrl, note: form.kartvizitNotu, ocrFirma: form.kartvizitOcrFirma, ocrKisi: form.kartvizitOcrKisi, ocrTelefon: form.kartvizitOcrTelefon, ocrEmail: form.kartvizitOcrEmail, ocrDurumu: form.kartvizitOcrDurumu } })
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Kaydedilemedi');
      const es = d.data.emailStatus;
      const et = !editingOrderId && es ? (es.skipped ? '' : es.error ? ` / E-posta: ${es.error}` : ` / E-posta: ${es.message || 'işlendi'}`) : '';
      haptic.success(); showToast(`${editingOrderId ? 'Sipariş güncellendi' : 'Sipariş kaydedildi'}. No: #${d.data.siparisId} / Toplam: ${d.data.toplamTutar.toFixed(2)}${et}`, 'success');
      closePanel(); await loadOrders();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const canContinueToDetails = selectedItems.length > 0;
  const showDetailsForm = panelMode === 'create' ? createStep === 'details' : Boolean(editingOrderId);

  return (
    <PullToRefresh onRefresh={loadOrders}>
      {!panelMode ? (
        <section className="app-panel app-order-band">
          <div className="app-order-band-grid">
            <button type="button" onClick={openCreatePanel} className="app-order-mode-button"><span className="app-order-mode-icon"><PlusIcon /></span><span>Ekle</span></button>
            <button type="button" onClick={openEditPanel}   className="app-order-mode-button"><span className="app-order-mode-icon"><EditIcon /></span><span>Düzenle</span></button>
            <button type="button" onClick={openDeletePanel} className="app-order-mode-button is-danger"><span className="app-order-mode-icon"><TrashIcon /></span><span>Sil</span></button>
          </div>
        </section>
      ) : null}

      <div className="space-y-6">

        {/* ── Ürün arama adımı ── */}
        {panelMode === 'create' && createStep === 'items' ? (
          <section className="app-panel p-6 app-collapse-panel">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Hızlı sipariş girişi</h2>
              <button type="button" onClick={closePanel} className="app-nav-icon-button" aria-label="Kapat"><CloseIcon /></button>
            </div>
            <div className="mt-5" ref={searchBlockRef}>
              <PageSearchBar
                value={searchTerm}
                onChange={(val) => { setSearchTerm(val); setAddQrMessage(''); }}
                placeholder="Kayıtlı mamül ara"
                onSearch={searchMamuller}
                onQrDetected={(v) => handleQrAdd(null, v)}
                showResults={Boolean(searchTerm.trim())}
                results={results.slice(0, 6)}
                onResultSelect={(item) => { addItem(item); setSearchTerm(''); setResults([]); setAddQrMessage(''); }}
                getResultPrimary={(item) => item.mamul_adi}
                getResultSecondary={(item) => canSeePrices ? `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''} / ${Number(item.bir_kg_satis_fiyati || 0).toFixed(2)}` : `${item.article_code} / ${item.article_no}${item.renk ? ` / ${item.renk}` : ''}`}
                emptyResultsText={loading ? 'Aranıyor...' : 'Bu aramaya uygun mamül bulunamadı.'}
              />
            </div>
            {addQrMessage ? <div className="app-soft-panel mt-3 px-4 py-3 text-sm text-[color:var(--app-text-muted)]">{addQrMessage}</div> : null}

            <div className="mt-4 space-y-3">
              {selectedItems.map((item) => (
                <div key={item.lineId} className="app-order-item-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-0.5 text-sm text-[color:var(--app-text-muted)]">{item.article_code}</div>
                    </div>
                    <button type="button" onClick={() => removeItem(item.lineId)} className="app-nav-icon-button" aria-label="Kaldır" title="Kaldır" style={{ color: '#c0392b', border: '1px solid #f5c6c6', background: '#fff5f5' }}>
                      <RemoveIcon />
                    </button>
                  </div>
                  <div className="mt-3 app-order-line-grid">
                    <label className="app-order-line-field">
                      <span className="app-order-line-label">Renk</span>
                      <select value={item.renk} onChange={(e) => updateItem(item.lineId, 'renk', e.target.value)} className="app-select app-order-line-input">
                        <option value="">Renk seç</option>
                        {colorOptions.map(c => <option key={c.id} value={c.ad}>{c.ad}</option>)}
                      </select>
                    </label>
                    <label className="app-order-line-field">
                      <span className="app-order-line-label">Kg</span>
                      <input value={item.miktarKg} onChange={(e) => updateItem(item.lineId, 'miktarKg', e.target.value)} placeholder="0" className="app-order-line-input" />
                    </label>
                    {canSeePrices ? (
                      <>
                        <label className="app-order-line-field">
                          <span className="app-order-line-label">1 kg fiyat</span>
                          <input value={item.birimFiyat} onChange={(e) => updateItem(item.lineId, 'birimFiyat', e.target.value)} placeholder="0" className="app-order-line-input" />
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

            <div className="mt-5 space-y-3">
              {selectedItems.length > 0 ? (
                <button type="button" onClick={() => { setSearchTerm(''); setResults([]); setAddQrMessage(''); searchBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => searchBlockRef.current?.querySelector('input')?.focus(), 350); }} className="app-btn-secondary app-order-continue-button">
                  + Yeni ürün ekle
                </button>
              ) : null}
              <button type="button" disabled={!canContinueToDetails} onClick={() => setCreateStep('details')} className="app-btn-primary app-order-continue-button disabled:opacity-50">
                Eklemeyi bitir ve devam et
              </button>
            </div>
          </section>
        ) : null}

        {/* ── Sipariş düzenle listesi ── */}
        {panelMode === 'edit' ? (
          <section className="app-panel p-6 app-collapse-panel">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Sipariş düzenle</h2>
              <button type="button" onClick={closePanel} className="app-nav-icon-button" aria-label="Kapat"><CloseIcon /></button>
            </div>
            <input value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} placeholder="Sipariş no, firma, müşteri, article code, mamül adı ara" className="app-input mt-5" />
            <div className="mt-5 space-y-3">
              {searchableEditOrders.length === 0 ? <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Düzenlenecek sipariş bulunamadı.</div> : null}
              {searchableEditOrders.slice(0, 8).map((order) => (
                <button key={order.id} type="button" onClick={() => loadOrderDetail(order.id)} className="w-full app-panel p-4 text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[color:var(--app-text)]">#{order.id} {order.firma_adi || order.musteri_adi}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{order.kalem_sayisi} mamül / {order.personel_username || '-'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-[color:var(--app-primary)]">{order.durum || 'kaydedildi'}</div>
                      <div className="mt-1 font-semibold text-[color:var(--app-text)]">{Number(order.toplam_tutar || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Sipariş sil listesi ── */}
        {panelMode === 'delete' ? (
          <section className="app-panel p-6 app-collapse-panel">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Sipariş sil</h2>
              <button type="button" onClick={closePanel} className="app-nav-icon-button" aria-label="Kapat"><CloseIcon /></button>
            </div>
            <input value={orderDeleteTerm} onChange={(e) => setOrderDeleteTerm(e.target.value)} placeholder="Sipariş no, firma, müşteri, article code ara" className="app-input mt-5" />
            <div className="mt-5 space-y-3">
              {searchableDeleteOrders.length === 0 ? <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Silinecek sipariş bulunamadı.</div> : null}
              {searchableDeleteOrders.slice(0, 8).map((order) => (
                <div key={order.id} className="app-panel p-4" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[color:var(--app-text)]">#{order.id} {order.firma_adi || order.musteri_adi}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{order.kalem_sayisi} mamül / {order.article_codes || '-'}</div>
                    </div>
                    <button type="button" onClick={() => deleteOrder(order.id)} disabled={deleting} className="app-btn-danger shrink-0">Siparişi sil</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Satırlar ── */}
        {showDetailsForm ? (
          <section className="app-panel p-6 app-collapse-panel">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Sipariş satırları</h2>
              <span className="text-sm text-[color:var(--app-text-muted)]">{selectedItems.length} mamül</span>
            </div>
            <div className="mt-5 space-y-4">
              {selectedItems.length === 0 ? <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Henüz siparişe mamül eklenmedi.</div> : null}
              {selectedItems.map((item) => (
                <div key={item.lineId} className="app-order-item-card app-order-item-card-detail">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{item.article_code}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{item.renk || 'Renk tanımsız'}</div>
                    </div>
                    <button type="button" onClick={() => removeItem(item.lineId)} className="app-nav-icon-button shrink-0" aria-label="Kaldır" title="Kaldır" style={{ color: '#c0392b', border: '1px solid #f5c6c6', background: '#fff5f5' }}>
                      <RemoveIcon />
                    </button>
                  </div>
                  <div className="mt-4 app-order-line-grid">
                    <label className="app-order-line-field">
                      <span className="app-order-line-label">Renk</span>
                      <select value={item.renk} onChange={(e) => updateItem(item.lineId, 'renk', e.target.value)} className="app-select app-order-line-input">
                        <option value="">Renk seç</option>
                        {colorOptions.map(c => <option key={c.id} value={c.ad}>{c.ad}</option>)}
                      </select>
                    </label>
                    <label className="app-order-line-field">
                      <span className="app-order-line-label">Kg</span>
                      <input value={item.miktarKg} onChange={(e) => updateItem(item.lineId, 'miktarKg', e.target.value)} placeholder="0" className="app-order-line-input" />
                    </label>
                    {canSeePrices ? (
                      <>
                        <label className="app-order-line-field">
                          <span className="app-order-line-label">1 kg fiyat</span>
                          <input value={item.birimFiyat} onChange={(e) => updateItem(item.lineId, 'birimFiyat', e.target.value)} placeholder="0" className="app-order-line-input" />
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

        {/* ── Detay formu ── */}
        {showDetailsForm ? (
          <form onSubmit={submitOrder} className="app-panel p-6 app-collapse-panel">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">{editingOrderId ? `Sipariş düzenle #${editingOrderId}` : 'Müşteri bilgileri'}</h2>
              {editingOrderId ? <button type="button" onClick={closePanel} className="app-btn-secondary">Kapat</button> : <button type="button" onClick={() => setCreateStep('items')} className="app-btn-secondary">Ürünlere dön</button>}
            </div>
            <div className="mt-5 grid gap-3">
              <input value={form.musteriAdi} onChange={(e) => setForm(p => ({ ...p, musteriAdi: e.target.value }))} placeholder="Müşteri adı" className="app-input" />
              <input value={form.firmaAdi} onChange={(e) => setForm(p => ({ ...p, firmaAdi: e.target.value }))} placeholder="Firma adı" list="firma-listesi" className="app-input" />
              <datalist id="firma-listesi">{companies.map(c => <option key={c.id} value={c.ad} />)}</datalist>
              <input value={form.ilgiliKisi} onChange={(e) => setForm(p => ({ ...p, ilgiliKisi: e.target.value }))} placeholder="İlgili kişi" className="app-input" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.telefon} onChange={(e) => setForm(p => ({ ...p, telefon: e.target.value }))} placeholder="Telefon" className="app-input" />
                <input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="E-posta" className="app-input" />
              </div>
              <input value={form.fuarAdi} onChange={(e) => setForm(p => ({ ...p, fuarAdi: e.target.value }))} placeholder="Fuar / kaynak" className="app-input" />
              <select value={form.durum} onChange={(e) => setForm(p => ({ ...p, durum: e.target.value }))} className="app-select">
                <option value="kaydedildi">Kaydedildi</option>
                <option value="isleme_alindi">İşleme alındı</option>
                <option value="kapatildi">Kapatıldı</option>
              </select>
              <textarea value={form.aciklama} onChange={(e) => setForm(p => ({ ...p, aciklama: e.target.value }))} placeholder="Sipariş notu" className="app-textarea min-h-28" />
            </div>

            <div className="app-soft-panel mt-5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-[color:var(--app-text)]">Kartvizit / firma görseli</div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="app-btn-secondary"><span className="inline-flex items-center gap-2"><CardIcon />Kartvizit ekle</span></button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleBusinessCardPick} style={{ display: 'none' }} />
              {cardProcessing ? <div className="mt-3 text-sm text-[color:var(--app-text-muted)]">Kartvizit işleniyor...</div> : null}
              {cardMessage ? <div className="mt-3 text-sm text-[color:var(--app-text-muted)]">{cardMessage}</div> : null}
              {form.kartvizitImageDataUrl ? (
                <div className="mt-4 grid gap-4 md:grid-cols-[0.85fr,1.15fr]">
                  <div className="overflow-hidden rounded-xl border border-[color:var(--app-border)]"><img src={form.kartvizitImageDataUrl} alt="Kartvizit" className="h-full w-full object-cover" /></div>
                  <div className="grid gap-3">
                    <input value={form.kartvizitOcrFirma} onChange={(e) => setForm(p => ({ ...p, kartvizitOcrFirma: e.target.value }))} placeholder="OCR firma" className="app-input" />
                    <input value={form.kartvizitOcrKisi} onChange={(e) => setForm(p => ({ ...p, kartvizitOcrKisi: e.target.value }))} placeholder="OCR kişi" className="app-input" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={form.kartvizitOcrTelefon} onChange={(e) => setForm(p => ({ ...p, kartvizitOcrTelefon: e.target.value }))} placeholder="OCR telefon" className="app-input" />
                      <input value={form.kartvizitOcrEmail} onChange={(e) => setForm(p => ({ ...p, kartvizitOcrEmail: e.target.value }))} placeholder="OCR e-posta" className="app-input" />
                    </div>
                    <textarea value={form.kartvizitNotu} onChange={(e) => setForm(p => ({ ...p, kartvizitNotu: e.target.value }))} placeholder="Kartvizit notu" className="app-textarea min-h-24" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="app-stat">
                <div className="app-stat-label">Toplam kg</div>
                <div className="app-stat-value">{orderQuantity.toFixed(2)}</div>
              </div>
              {canSeePrices ? (
                <div className="app-stat" style={{ background: 'linear-gradient(135deg, var(--app-surface-strong), var(--app-primary-strong))', color: '#fff' }}>
                  <div className="app-stat-label" style={{ color: 'rgba(255,255,255,0.65)' }}>Toplam tutar</div>
                  <div className="app-stat-value" style={{ color: '#fff' }}>{orderTotal.toFixed(2)}</div>
                </div>
              ) : null}
            </div>

            <button type="submit" disabled={saving} className="app-btn-primary mt-6 w-full disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : editingOrderId ? 'Siparişi güncelle' : 'Siparişi kaydet'}
            </button>
          </form>
        ) : null}

        {/* ── Son siparişler ── */}
        {(panelMode === 'edit' || panelMode === 'delete' || !panelMode) ? (
          <section className="app-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Son siparişler</h2>
              <button type="button" onClick={loadOrders} className="text-sm text-[color:var(--app-primary)]">Yenile</button>
            </div>
            <div className="mt-5 space-y-3">
              {ordersLoading ? <SkeletonList count={3} /> : null}
              {!ordersLoading && recentOrders.length === 0 ? <div className="app-soft-panel px-4 py-6 text-sm text-[color:var(--app-text-muted)]">Henüz kayıtlı sipariş yok.</div> : null}
              {recentOrders.map((order) => (
                <button key={order.id} type="button" onClick={() => loadOrderDetail(order.id)} className="w-full app-panel p-4 text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[color:var(--app-text)]">#{order.id} {order.firma_adi || order.musteri_adi}</div>
                      <div className="mt-1 text-sm text-[color:var(--app-text-muted)]">{order.kalem_sayisi} mamül / {order.personel_username || '-'}</div>
                      <div className="mt-0.5 text-sm text-[color:var(--app-text-muted)]">{order.fuar_adi || ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-[color:var(--app-primary)]">{order.durum || 'kaydedildi'}</div>
                      <div className="mt-1 font-semibold text-[color:var(--app-text)]">{Number(order.toplam_tutar || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {orders.length > recentLimit ? (
              <div className="mt-4">
                <button type="button" onClick={() => setOrderFilterExpanded(p => !p)} className="app-btn-secondary">{orderFilterExpanded ? 'Daha az göster' : 'Daha fazla göster'}</button>
              </div>
            ) : null}
            {selectedOrderDetail ? (
              <div className="app-soft-panel mt-5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[color:var(--app-text-muted)]">Sipariş detayı</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--app-text)]">#{selectedOrderDetail.id} {selectedOrderDetail.firma_adi || selectedOrderDetail.musteri_adi}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedOrderDetail(null)} className="app-btn-secondary">Kapat</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => loadOrderIntoEditor(selectedOrderDetail)} className="app-btn-primary">Siparişi düzenle</button>
                  {selectedOrderDetail.durum !== 'tamamlandi' ? (
                    <button type="button" onClick={() => completeOrder(selectedOrderDetail.id)} disabled={completing} className="app-btn-primary" style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                      {completing ? 'İşleniyor...' : 'Siparişi tamamla'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 border border-green-200">✓ Tamamlandı</span>
                  )}
                  <button type="button" onClick={() => deleteOrder(selectedOrderDetail.id)} className="app-btn-danger">Siparişi sil</button>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2 text-sm text-[color:var(--app-text-muted)]">
                  <div>Müşteri: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.musteri_adi || '-'}</span></div>
                  <div>Firma: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.firma_adi || '-'}</span></div>
                  <div>Telefon: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.telefon || '-'}</span></div>
                  <div>E-posta: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.email || '-'}</span></div>
                  <div>Fuar: <span className="font-semibold text-[color:var(--app-text)]">{selectedOrderDetail.fuar_adi || '-'}</span></div>
                  <div>Toplam: <span className="font-semibold text-[color:var(--app-text)]">{Number(selectedOrderDetail.toplam_tutar || 0).toFixed(2)}</span></div>
                </div>
                {selectedOrderDetail.kartvizit_gorsel ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--app-border)]"><img src={selectedOrderDetail.kartvizit_gorsel} alt="Kartvizit" className="max-h-56 w-full object-cover" /></div>
                ) : null}
                <div className="mt-4 space-y-2">
                  {selectedOrderDetail.items?.map((item) => (
                    <div key={item.id} className="app-panel px-4 py-3 text-sm">
                      <div className="font-semibold text-[color:var(--app-text)]">{item.mamul_adi}</div>
                      <div className="mt-0.5 text-[color:var(--app-text-muted)]">{item.article_code} / {item.article_no}</div>
                      <div className="mt-1 text-[color:var(--app-text-muted)]">{Number(item.miktar_kg || 0).toFixed(2)} kg × {Number(item.birim_fiyat || 0).toFixed(2)} = {Number(item.tutar || 0).toFixed(2)}</div>
                    </div>
                  ))}
                  {!selectedOrderDetail.items?.length ? <div className="text-sm text-[color:var(--app-text-muted)]">Kalem bulunamadı.</div> : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

      </div>
    </PullToRefresh>
  );
};

export default StaffOrderPage;
