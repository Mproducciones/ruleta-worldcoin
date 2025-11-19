import React, { useState } from "react";

function BetPanel({ balance, setBalance, setHistory }) {
  const [bet, setBet] = useState(0.1);
  const colors = ["Rojo", "Azul", "Blanco"];

  const placeBet = (color) => {
    if (balance >= bet) {
      setBalance(balance - bet);
      setHistory((prev) => [...prev, { round: prev.length + 1, color, bet }]);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center">
      <div className="flex gap-3">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => placeBet(c)}
            className={`px-4 py-2 rounded-lg font-bold ${
              c === "Rojo"
                ? "bg-red-600"
                : c === "Azul"
                ? "bg-blue-600"
                : "bg-white text-black"
            }`}
          >
            {c} ({bet} WLD)
          </button>
        ))}
      </div>
    </div>
  );
}

export default BetPanel;
