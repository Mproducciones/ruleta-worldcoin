import React from "react";

function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "jugar", label: "🎮 Jugar" },
    { id: "ranking", label: "🏆 Ranking" },
    { id: "saldo", label: "💰 Saldo" },
    { id: "perfil", label: "👤 Perfil" },
  ];

  return (
    <div className="bg-black/50 flex justify-around p-2 border-t border-gray-700">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`flex-1 py-2 ${activeTab === t.id ? "text-yellow-400 font-bold" : "text-white"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default Navbar;
