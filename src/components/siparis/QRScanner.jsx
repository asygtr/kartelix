// QRScanner.jsx
import { useEffect, useRef } from 'react';

const QRScanner = ({ onScan, onClose }) => {
  const videoRef = useRef();

  useEffect(() => {
    // QR scanner implementasyonu
    const initScanner = async () => {
      // HTML5 QR Code scanner implementasyonu
    };

    initScanner();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg">
        <video ref={videoRef} className="w-full h-64" />
        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">
            İptal
          </button>
        </div>
      </div>
    </div>
  );
};