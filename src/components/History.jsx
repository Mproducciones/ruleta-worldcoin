import React from "react";

function History({ history }) {
  return (
    <div className="mt-6 bg-black/30 p-4 rounded-lg w-full max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">📜 Historial</h2>
      <ul className="space-y-1">
        {history.slice(-5).reverse().map((h, i) => (
          <li key={i} className="text-sm">
            🎯 Ronda {h.round}: {h.color} ({h.bet} WLD)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default History;
