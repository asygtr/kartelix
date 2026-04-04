import React, { useEffect, useRef, useState } from 'react';

const QrCameraModal = ({ title, onClose, onDetected }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectorRef = useRef(null);
  const [status, setStatus] = useState('Kamera hazırlanıyor...');

  useEffect(() => {
    let active = true;

    const stopScanner = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    const scan = async () => {
      if (!active || !videoRef.current || !detectorRef.current) {
        return;
      }

      try {
        if (videoRef.current.readyState >= 2) {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          const match = barcodes.find((item) => item.rawValue);

          if (match?.rawValue) {
            onDetected(match.rawValue);
            stopScanner();
            return;
          }
        }
      } catch {}

      frameRef.current = requestAnimationFrame(scan);
    };

    const startScanner = async () => {
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
        setStatus('Bu tarayıcı kamera erişimini desteklemiyor.');
        return;
      }

      if (!('BarcodeDetector' in window)) {
        setStatus('Bu tarayıcı yerleşik QR algılamayı desteklemiyor. Elle giriş kullanın.');
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('QR kodu kameraya gösterin.');
          frameRef.current = requestAnimationFrame(scan);
        }
      } catch (error) {
        setStatus(error?.name === 'NotAllowedError'
          ? 'Kamera izni verilmedi.'
          : 'Kamera başlatılamadı.');
      }
    };

    startScanner();

    return () => {
      active = false;
      stopScanner();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="app-panel w-full max-w-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">{title}</h2>
            <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">{status}</p>
          </div>
          <button type="button" onClick={onClose} className="app-btn-secondary">Kapat</button>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-black">
          <video ref={videoRef} className="h-[22rem] w-full object-cover" muted playsInline />
        </div>
      </div>
    </div>
  );
};

export default QrCameraModal;
