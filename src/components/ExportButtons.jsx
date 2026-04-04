import React from 'react';

const ExportButtons = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-2">Veri Dışa Aktar</h3>
      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
        Excel'e Aktar
      </button>
    </div>
  );
};

export default ExportButtons;
console.log('ExportButtons:', typeof ExportButtons);