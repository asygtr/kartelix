// src/components/dashboard/MamulDashboard.jsx
import React, { useState } from "react";
import MamulSearch from "./MamulSearch";
import MamulStats from "./MamulStats";
import SiparisListesi from "./SiparisListesi";

const MamulDashboard = () => {
  const [selectedMamul, setSelectedMamul] = useState("");

  return (
    <div className="space-y-6">
      <MamulSearch onSearch={setSelectedMamul} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SiparisListesi selectedMamul={selectedMamul} />
        <MamulStats mamulKod={selectedMamul} />
      </div>
    </div>
  );
};

export default MamulDashboard;
