import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="app-nav-icon-svg">
    <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
  </svg>
);

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || '';
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
};

const QrCameraModal = ({ title, onClose, onDetected }) => {
  const html5QrRef = useRef(null);
  const stoppedRef = useRef(false);
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('Arka kamera hazırlanıyor...');
  const [showFallback, setShowFallback] = useState(false);
  const reactId = useId();
  const scannerId = useMemo(() => `kartelix-qr-${reactId.replace(/:/g, '')}`, [reactId]);
  const mobileOnly = useMemo(() => isMobileDevice(), []);
  const canUseLiveCamera = useMemo(() => (
    mobileOnly &&
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    !!navigator.mediaDevices.getUserMedia
  ), [mobileOnly]);

  useEffect(() => {
    let mounted = true;

    const stopScanner = async () => {
      const scanner = html5QrRef.current;
      html5QrRef.current = null;

      if (!scanner) return;

      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {}

      try {
        await scanner.clear();
      } catch {}
    };

    const startScanner = async () => {
      if (!mobileOnly) {
        setStatus('QR okutma bu uygulamada sadece mobil cihazın yerleşik arka kamerasıyla kullanılır.');
        setShowFallback(false);
        return;
      }

      if (!canUseLiveCamera) {
        setStatus('Canlı kamera akışı bu bağlantıda açılamadı. Aşağıdaki butonla arka kamerayı açıp QR fotoğrafı çekebilirsiniz.');
        setShowFallback(true);
        return;
      }

      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });

      html5QrRef.current = scanner;

      const onScanSuccess = async (decodedText) => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;
        setStatus('QR algılandı.');
        await stopScanner();
        if (mounted) {
          onDetected(decodedText);
        }
      };

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1
          },
          onScanSuccess,
          () => {}
        );

        if (mounted) {
          setStatus('QR kodu arka kameraya hizalayın.');
          setShowFallback(true);
        }
      } catch (error) {
        if (mounted) {
          const message = String(error?.message || '');
          if (/permission|NotAllowedError/i.test(message)) {
            setStatus('Kamera izni verilmedi. Tarayıcı ayarlarından kamera iznini açın.');
          } else if (/Requested device not found|OverconstrainedError/i.test(message)) {
            setStatus('Arka kamera bulunamadı. Cihazın kamera erişimini kontrol edin.');
          } else {
            setStatus('Kamera başlatılamadı. Android için Chrome, iPhone için Safari veya Chrome deneyin.');
          }
          setShowFallback(true);
        }
        await stopScanner();
      }
    };

    startScanner();

    return () => {
      mounted = false;
      stoppedRef.current = true;
      stopScanner();
    };
  }, [canUseLiveCamera, mobileOnly, onDetected, scannerId]);

  const handleFileCapture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setStatus('QR görseli okunuyor...');
      const scanner = html5QrRef.current || new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
      html5QrRef.current = scanner;
      const decodedText = await scanner.scanFile(file, true);
      setStatus('QR algılandı.');
      onDetected(decodedText);
    } catch {
      setStatus('QR okunamadi. Kodu kadraja daha yakin ve net cekerek tekrar deneyin.');
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/78 p-4">
      <div className="app-panel w-full max-w-xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">{title}</h2>
            <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">{status}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-nav-icon-button"
            aria-label="Kamerayı kapat"
            title="Kamerayı kapat"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-black">
          <div id={scannerId} className="min-h-[18rem] w-full sm:min-h-[22rem]" />
        </div>

        {showFallback ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileCapture}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="app-btn-secondary w-full sm:w-auto"
          >
            QR görseli seç
          </button>
          <p className="text-center text-xs leading-6 text-[color:var(--app-text-muted)]">
            Canlı okumada zorlanıyorsa QR kodu daha yakın çekip görsel olarak seçin.
          </p>
        </div>
        ) : null}
      </div>
    </div>
  );
};

export default QrCameraModal;
