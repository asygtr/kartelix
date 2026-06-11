import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import LabelPreviewCard from '../LabelPreviewCard';
import { buildLabelPrintDocument, mergeLabelTemplate } from '../../utils/labelTemplate';

const EtiketGoruntule = ({ siparis, firma, onClose, onEdit, onDelete }) => {
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    const loadActiveTemplate = async () => {
      try {
        const response = await fetch('/api/admin/label-templates/active');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setTemplate(mergeLabelTemplate(result.data));
          }
        }
      } catch {}
    };
    loadActiveTemplate();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!siparis) return null;

  const yazdir = (lang = 'tr') => {
    const record = {
      id: siparis?.id || 'preview',
      article_code: siparis?.articleNo || '-',
      mamul_adi: siparis?.mamul || '-',
      kompozisyon_ozeti: siparis?.kompozisyon || '-',
      renk: '-',
      en: String(siparis?.en || '-'),
      gramaj: String(siparis?.gramaj || '-'),
      mamul_turu_adi: siparis?.tip || '-',
      qr_slug: siparis?.articleNo ? `etiket-${siparis.articleNo}` : 'preview'
    };
    
    const printTemplate = template || { previewLang: 'tr' };
    const content = buildLabelPrintDocument([record], printTemplate, lang);
    const pencere = window.open('', '_blank', 'width=400,height=300');
    pencere.document.write(content);
    pencere.document.close();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Kartela Görüntüle - {siparis.articleNo}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="etiket-preview border-2 border-gray-200 rounded-lg bg-white p-4 flex justify-center">
            <LabelPreviewCard record={siparis} template={template} lang="tr" className="mx-auto" />
          </div>

          <div className="mt-6 flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(siparis)}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Düzenle
              </button>
              <button
                onClick={() => onDelete(siparis.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm font-medium transition-colors shadow-sm"
              >
                🗑️ Sil
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => yazdir('tr')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
              >
                🖨️ Yazdır (TR)
              </button>
              <button
                onClick={() => yazdir('en')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
              >
                🖨️ Print (EN)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EtiketGoruntule;