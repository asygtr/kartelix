import { useState } from 'react';
import * as XLSX from 'xlsx';
import Select from 'react-select';

const ExcelImportWizard = ({ onImport }) => {
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [mapping, setMapping] = useState({});

  const handleFile = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headers = json[0];
      const rows = json.slice(1, 6); // ilk 5 satır önizleme
      setColumns(headers);
      setPreview(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingChange = (field, selected) => {
    setMapping((prev) => ({ ...prev, [field]: selected?.value }));
  };

  const handleImport = () => {
    const structured = preview.map((row) => ({
      ad: row[columns.indexOf(mapping.ad)],
      aciklama: row[columns.indexOf(mapping.aciklama)],
      stok: parseInt(row[columns.indexOf(mapping.stok)] || 0),
    }));
    onImport(structured);
  };

  const options = columns.map((col) => ({ label: col, value: col }));

  return (
    <div className="bg-white p-6 rounded-lg shadow w-full space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">📥 Excel İçe Aktarma</h3>

      <input
        type="file"
        accept=".xlsx"
        onChange={handleFile}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {columns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mamül Adı</label>
            <Select options={options} onChange={(val) => handleMappingChange('ad', val)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <Select options={options} onChange={(val) => handleMappingChange('aciklama', val)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stok</label>
            <Select options={options} onChange={(val) => handleMappingChange('stok', val)} />
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-gray-800 font-semibold">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-2 border-b">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 border-b">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleImport}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-medium"
      >
        Verileri Aktar
      </button>
    </div>
  );
};

export default ExcelImportWizard;
