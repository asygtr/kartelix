// src/pages/EtiketAyarlari.jsx
import { useState } from 'react';

const EtiketAyarlari = () => {
  const [etiketAlanlari, setEtiketAlanlari] = useState([
    { id: 'articleNo', label: 'ARTICLE NR', selected: true, order: 1 },
    { id: 'product', label: 'PRODUCT', selected: true, order: 2 },
    { id: 'composition', label: 'COMPOSITION', selected: true, order: 3 },
    { id: 'weight', label: 'WEIGHT', selected: false, order: 4 },
    { id: 'width', label: 'WIDTH', selected: false, order: 5 },
    { id: 'kgFabric', label: '1 KG FABRIC METER', selected: false, order: 6 }
  ]);

  const alanSiraDegistir = (fromIndex, toIndex) => {
    const updated = [...etiketAlanlari];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setEtiketAlanlari(updated.map((item, index) => ({ ...item, order: index + 1 })));
  };

  const alanToggle = (id) => {
    setEtiketAlanlari(prev => 
      prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Etiket Ayarları</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          Etiket üzerinde gösterilecek alanları seçin ve sıralayın:
        </p>
        
        <div className="space-y-2">
          {etiketAlanlari
            .sort((a, b) => a.order - b.order)
            .map((alan, index) => (
            <div key={alan.id} className="flex items-center gap-4 p-3 border rounded">
              <input
                type="checkbox"
                checked={alan.selected}
                onChange={() => alanToggle(alan.id)}
                className="w-4 h-4"
              />
              <span className="flex-1">{alan.label}</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => alanSiraDegistir(index, index - 1)}
                  disabled={index === 0}
                  className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  ↑
                </button>
                <button 
                  onClick={() => alanSiraDegistir(index, index + 1)}
                  disabled={index === etiketAlanlari.length - 1}
                  className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="mt-6 bg-blue-600 text-white px-6 py-2 rounded">
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
};