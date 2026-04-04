// src/pages/ArticleNoAyarlari.jsx
const ArticleNoAyarlari = () => {
  const [onEkler, setOnEkler] = useState([
    { id: 1, prefix: 'PRD', aciklama: 'Standart Ürün' },
    { id: 2, prefix: 'SMP', aciklama: 'Numune' },
    { id: 3, prefix: 'SPR', aciklama: 'Özel Üretim' }
  ]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Article No Ön Ek Ayarları</h2>
      
      <div className="space-y-4">
        {onEkler.map((onEk) => (
          <div key={onEk.id} className="flex gap-4 items-center">
            <input 
              type="text" 
              value={onEk.prefix}
              className="border p-2 rounded w-20"
              onChange={(e) => {/* update logic */}}
            />
            <input 
              type="text" 
              value={onEk.aciklama}
              className="border p-2 rounded flex-1"
              placeholder="Açıklama"
              onChange={(e) => {/* update logic */}}
            />
            <button className="bg-red-500 text-white px-3 py-2 rounded">
              Sil
            </button>
          </div>
        ))}
        
        <button className="bg-green-500 text-white px-4 py-2 rounded">
          + Yeni Ön Ek Ekle
        </button>
      </div>
    </div>
  );
};