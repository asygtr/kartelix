import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export const isMobileCameraDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || navigator.vendor || '');
};

export const decodeQrFromFile = async (file) => {
  const scanner = new Html5Qrcode('kartelix-qr-file-reader', {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
  });

  try {
    return await scanner.scanFile(file, true);
  } finally {
    try {
      await scanner.clear();
    } catch {}
  }
};
