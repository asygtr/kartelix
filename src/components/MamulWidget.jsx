import React from 'react';
import MamulSearch from './MamulSearch';

const MamulWidget = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full max-w-md">
      <h3 className="text-lg font-semibold mb-2">🧵 Mamül Arama</h3>
      <MamulSearch />
    </div>
  );
};

export default MamulWidget;
