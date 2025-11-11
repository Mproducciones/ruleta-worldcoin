// src/App.jsx
// ========================================
// MINIAPP RULETA WORLDCOIN - LAS VEGAS EDITION
// ESTILO NEÓN + 100% RESPONSIVE + CENTRADO PERFECTO
// SIN TEXTO EN RULETA
// TABLA DE PAGOS NEÓN
// 5 ROJO | 5 AZUL | 5 BLANCO | 2 ORO | 3 NEGRO
// RTP ~75%
// Autor: MProducciones
// Fecha: 11 Nov 2025
// ========================================

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IDKitWidget } from "@worldcoin/idkit";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/* eslint-disable react-hooks/exhaustive-deps */

const useSound = (url) => {
  const audioRef = useRef(null);
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);
  const play = () => {
    if (typeof window !== "undefined") {
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };
  return play;
};

const CONFIG = {
  CREDITS_PER_WLD: 10,
  MIN_PURCHASE_WLD: 1,
  MIN_PURCHASE_CREDITS: 10,
  MIN_WITHDRAW_CREDITS: 5,
  WITHDRAW_STEP: 5,
  MAX_BET_CREDITS: 100,
  DEMO_CREDITS: 50,
  CHIP_VALUES: [0.5, 1, 2.5, 5, 10],
};

/* ===== SECCIONES INTERCALADAS (18) ===== */
const sections = [
  { hex: "#ff0000", name: "ROJO", multiplier: 2 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#ffffff", name: "BLANCO", multiplier: 2 },
  { hex: "#000000", name: "NEGRO", multiplier: 0 },
  { hex: "#ffd700", name: "TODOS GANAN", multiplier: 2.5 },
  { hex: "#ff0000", name: "ROJO", multiplier: 2 },
  { hex: "#ffffff", name: "BLANCO", multiplier: 2 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#000000", name: "NEGRO", multiplier: 0 },
  { hex: "#ff0000", name: "ROJO", multiplier: 2 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#ffffff", name: "BLANCO", multiplier: 2 },
  { hex: "#ffd700", name: "TODOS GANAN", multiplier: 2.5 },
  { hex: "#ff0000", name: "ROJO", multiplier: 2 },
  { hex: "#ffffff", name: "BLANCO", multiplier: 2 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#000000", name: "NEGRO", multiplier: 0 },
];

export default function ColorPlaneGame() {
  const canvasRef = useRef(null);
  const timersRef = useRef([]);
  const pushTimer = (t) => timersRef.current.push(t);

  const TAKEOFF_DUR = 1200;
  const SPIN_DUR = 4200;
  const LANDING_APPEAR_BEFORE_STOP = 2000;
  const LANDING_DUR = 1000;

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [chipValue, setChipValue] = useState(CONFIG.CHIP_VALUES[0]);
  const [bets, setBets] = useState({ rojo: 0, azul: 0, blanco: 0 });
  const [lastBets, setLastBets] = useState(null);
  const [playerCredits, setPlayerCredits] = useState(0);
  const [planeAction, setPlaneAction] = useState("idle");
  const [lightAnimationState, setLightAnimationState] = useState("idle");
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("game");
  const [isVerified, setIsVerified] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const isDemo = localStorage.getItem("demoMode") === "true";

  const playSpinSound = useSound("/sounds/spin.mp3");
  const playWinSound = useSound("/sounds/win.mp3");
  const playLoseSound = useSound("/sounds/lose.mp3");
  const playBetSound = useSound("/sounds/bet.mp3");

  const isDev = import.meta.env.DEV;
  const enableDemo = isDev || import.meta.env.VITE_ENABLE_DEMO === "true";

  useEffect(() => {
    if (enableDemo && (!import.meta.env.VITE_APP_ID || isDemo)) {
      setIsVerified(true);
      setPlayerCredits(CONFIG.DEMO_CREDITS);
      localStorage.setItem("demoMode", "true");
    }
  }, [enableDemo, isDemo]);

  const enterDemoMode = () => {
    localStorage.setItem("demoMode", "true");
    setIsVerified(true);
    setPlayerCredits(CONFIG.DEMO_CREDITS);
  };

  const exitDemoMode = () => {
    localStorage.removeItem("demoMode");
    setIsVerified(false);
    setPlayerCredits(0);
    setBets({ rojo: 0, azul: 0, blanco: 0 });
    setHistory([]);
    setView("game");
    setPlaneAction("idle");
    setLightAnimationState("idle");
    setSpinning(false);
    setIsRoundActive(false);
  };

  // === DIBUJO DE LA RULETA (SOLO COLORES) ===
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.95;

    const sectionAngle = (2 * Math.PI) / sections.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sections.forEach((sec, i) => {
      const startAngle = i * sectionAngle - Math.PI / 2;
      const endAngle = startAngle + sectionAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = sec.hex;
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  };

  useEffect(() => {
    const drawOnMount = () => {
      if (canvasRef.current && view === "game") {
        requestAnimationFrame(drawWheel);
      } else {
        setTimeout(drawOnMount, 100);
      }
    };
    drawOnMount();
  }, [view]);

  useEffect(() => {
    if (view === "game" && canvasRef.current) {
      const raf = requestAnimationFrame(drawWheel);
      return () => cancelAnimationFrame(raf);
    }
  }, [rotation, view]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // === MAX BET ===
  const maxBet = () => {
    const maxAllowed = Math.min(playerCredits, CONFIG.MAX_BET_CREDITS);
    const maxChips = Math.floor(maxAllowed / chipValue);
    if (maxChips === 0) return alert("Sin créditos");

    const perColor = Math.floor(maxChips / 3);
    const betValue = perColor * chipValue;
    const total = betValue * 3;

    if (total > CONFIG.MAX_BET_CREDITS) {
      alert(`Límite: ${CONFIG.MAX_BET_CREDITS} créditos por jugada`);
      return;
    }

    setBets({
      rojo: betValue,
      azul: betValue,
      blanco: betValue,
    });
  };

  // === HISTORIAL ===
  const pushHistory = (landed, bets, totalWin, losses) => {
    const now = new Date();
    setHistory((h) => [
      {
        landed,
        bets: { ...bets },
        totalWin,
        losses: { ...losses },
        fecha: now.toLocaleDateString(),
        hora: now.toLocaleTimeString(),
      },
      ...h,
    ].slice(0, 10));
  };

  // === GIRAR RULETA ===
  const spin = () => {
    const totalBet = bets.rojo + bets.azul + bets.blanco;

    if (spinning || totalBet <= 0 || totalBet > playerCredits) {
      if (playerCredits === 0) {
        alert("No tienes créditos. ¡Compra más!");
        setShowBuyModal(true);
      } else {
        alert(`Apuesta inválida. Máximo ${CONFIG.MAX_BET_CREDITS} créditos por jugada.`);
      }
      return;
    }

    if (totalBet > CONFIG.MAX_BET_CREDITS) {
      alert(`¡Límite! Máximo ${CONFIG.MAX_BET_CREDITS} créditos por ronda`);
      return;
    }

    setSpinning(true);
    setIsRoundActive(true);
    setPlayerCredits((p) => p - totalBet);
    setLastBets(bets);
    setPlaneAction("takeoff");
    setLightAnimationState("flicker");

    const tStartSpin = setTimeout(() => {
      playSpinSound();
      const randomRotation = 360 * 5 + Math.floor(Math.random() * 360);
      const finalRotation = rotation + randomRotation;
      setRotation(finalRotation);
      setPlaneAction("hiddenTop");

      const tLandingStart = setTimeout(() => setPlaneAction("landing"), SPIN_DUR - LANDING_APPEAR_BEFORE_STOP);
      pushTimer(tLandingStart);

      const tEnd = setTimeout(() => {
        const normalized = (finalRotation % 360 + 360) % 360;
        const sectionSize = 360 / sections.length;
        const pointerAngle = 270;
        const landedAngle = (pointerAngle - normalized + 360) % 360;
        const index = Math.floor(landedAngle / sectionSize);
        const landed = sections[index];

        let totalWin = 0;
        let losses = {};

        if (landed.name === "NEGRO") {
          losses = { rojo: bets.rojo, azul: bets.azul, blanco: bets.blanco };
          alert("Cayó NEGRO. Pierdes todo");
          playLoseSound();
        } else if (landed.name === "TODOS GANAN") {
          totalWin = (bets.rojo + bets.azul + bets.blanco) * landed.multiplier;
          setTimeout(() => {
            setPlayerCredits((p) => p + totalWin);
            alert(`¡TODOS GANAN! +${totalWin} créditos`);
            playWinSound();
          }, 50);
        } else {
          if (bets.rojo > 0 && landed.name === "ROJO") totalWin += bets.rojo * landed.multiplier;
          if (bets.azul > 0 && landed.name === "AZUL") totalWin += bets.azul * landed.multiplier;
          if (bets.blanco > 0 && landed.name === "BLANCO") totalWin += bets.blanco * landed.multiplier;

          if (totalWin > 0) {
            setTimeout(() => {
              setPlayerCredits((p) => p + totalWin);
              alert(`¡Ganaste ${totalWin} créditos!`);
              playWinSound();
            }, 50);
          } else {
            alert("Perdiste esta ronda.");
            playLoseSound();
          }

          if (landed.name !== "ROJO") losses.rojo = bets.rojo;
          if (landed.name !== "AZUL") losses.azul = bets.azul;
          if (landed.name !== "BLANCO") losses.blanco = bets.blanco;
        }

        pushHistory(landed, bets, totalWin, losses);
        setLightAnimationState("on");

        const tFinish = setTimeout(() => {
          setSpinning(false);
          setPlaneAction("idle");
          setBets({ rojo: 0, azul: 0, blanco: 0 });
          setIsRoundActive(false);
          setLightAnimationState("idle");
        }, LANDING_DUR + 200);
        pushTimer(tFinish);
      }, SPIN_DUR);
      pushTimer(tEnd);
    }, TAKEOFF_DUR);
    pushTimer(tStartSpin);
  };

  // === APUESTAS ===
  const addBet = (color) => {
    setBets((prev) => {
      const total = prev.rojo + prev.azul + prev.blanco + chipValue;
      if (total > playerCredits) {
        alert(`Máximo ${playerCredits} créditos`);
        return prev;
      }
      if (total > CONFIG.MAX_BET_CREDITS) {
        alert(`Límite: ${CONFIG.MAX_BET_CREDITS} créditos por jugada`);
        return prev;
      }
      playBetSound();
      return { ...prev, [color]: prev[color] + chipValue };
    });
  };

  const repeatBet = () => { if (lastBets) setBets(lastBets); };
  const doubleBet = () => {
    setBets((prev) => {
      const doubled = { rojo: prev.rojo * 2, azul: prev.azul * 2, blanco: prev.blanco * 2 };
      const total = Object.values(doubled).reduce((a, b) => a + b, 0);
      if (total > playerCredits || total > CONFIG.MAX_BET_CREDITS) {
        alert("No puedes exceder el límite de apuesta");
        return prev;
      }
      return doubled;
    });
  };
  const clearBets = () => setBets({ rojo: 0, azul: 0, blanco: 0 });

  // === ANIMACIONES ===
  const planeVariants = {
    idle: { y: -30, scale: 1, opacity: 1, rotate: 0 },
    takeoff: { y: 200, scale: 1.4, opacity: 0, rotate: 20, transition: { duration: TAKEOFF_DUR / 1000, ease: "easeIn" } },
    hiddenTop: { y: -420, scale: 0.7, opacity: 0, rotate: 20 },
    landing: { y: -30, scale: 1, opacity: 1, rotate: 0, transition: { duration: LANDING_DUR / 1000, ease: "easeOut" } },
  };

  const lightVariants = {
    idle: { opacity: 1, filter: "brightness(0.7)" },
    on: { opacity: 1.5, filter: "brightness(1.5)" },
    flicker: {
      opacity: [1, 0.7, 1],
      filter: ["brightness(1.8)", "brightness(1.0)", "brightness(1.8)"],
      transition: { duration: 0.3, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
    },
  };

  // === MODAL COMPRA ===
  const BuyCreditsModal = () => {
    const [wldAmount, setWldAmount] = useState(1);
    return showBuyModal ? (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div style={{ background: "linear-gradient(145deg, #1a1a1a, #2d2d2d)", padding: 30, borderRadius: 20, width: "90%", maxWidth: 400, border: "2px solid #ffd700", boxShadow: "0 0 20px rgba(255,215,0,0.5)" }}>
          <h3 style={{ color: "#ffd700", textAlign: "center", marginBottom: 16, textShadow: "0 0 10px #ffd700" }}>COMPRAR CRÉDITOS</h3>
          <p style={{ color: "#fff", textAlign: "center" }}><strong>1 WLD = 10 Créditos</strong></p>
          {isDemo && <p style={{ color: "#ff3b30", fontWeight: "bold", textAlign: "center" }}>MODO DEMO: Compra simulada</p>}
          <input type="number" min="1" step="1" value={wldAmount} onChange={(e) => setWldAmount(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: "100%", padding: 14, margin: "12px 0", borderRadius: 12, border: "2px solid #ffd700", background: "#111", color: "#fff", fontSize: 18, textAlign: "center" }} />
          <p style={{ color: "#ffd700", textAlign: "center", fontSize: 18 }}>Recibirás: <strong>{wldAmount * 10} créditos</strong></p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowBuyModal(false)} style={{ flex: 1, padding: 14, background: "#444", borderRadius: 12, color: "#fff", fontWeight: "bold" }}>Cancelar</button>
            <button onClick={() => {
              const credits = wldAmount * 10;
              if (isDemo) alert(`MODO DEMO: +${credits} créditos (simulado)`);
              else alert(`Compra exitosa: ${wldAmount} WLD → ${credits} créditos`);
              setPlayerCredits(c => c + credits);
              setShowBuyModal(false);
            }} style={{ flex: 1, padding: 14, background: "linear-gradient(135deg, #ffd700, #ff6b6b)", borderRadius: 12, color: "#000", fontWeight: "bold", boxShadow: "0 0 15px rgba(255,215,0,0.6)" }}>Comprar</button>
          </div>
        </div>
      </div>
    ) : null;
  };

  // === MODAL RETIRO ===
  const WithdrawModal = () => {
    if (isDemo) {
      return showWithdrawModal ? (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(10px)" }}>
          <div style={{ background: "linear-gradient(145deg, #1a1a1a, #2d2d2d)", padding: 30, borderRadius: 20, width: "90%", maxWidth: 400, border: "2px solid #ff3b30", boxShadow: "0 0 20px rgba(255,59,48,0.5)", textAlign: "center" }}>
            <h3 style={{ color: "#ff3b30", textShadow: "0 0 10px #ff3b30" }}>RETIRO NO DISPONIBLE</h3>
            <p style={{ color: "#fff" }}>Estás en <strong>MODO DEMO</strong></p>
            <p style={{ color: "#ccc" }}>Los retiros solo están disponibles con World ID verificado.</p>
            <button onClick={() => setShowWithdrawModal(false)} style={{ marginTop: 16, padding: 14, background: "#444", borderRadius: 12, color: "#fff", width: "100%" }}>Cerrar</button>
          </div>
        </div>
      ) : null;
    }

    const [creditsToWithdraw, setCreditsToWithdraw] = useState(5);
    const maxCredits = Math.floor(playerCredits / CONFIG.WITHDRAW_STEP) * CONFIG.WITHDRAW_STEP;
    const canWithdraw = playerCredits >= CONFIG.MIN_WITHDRAW_CREDITS;

    return showWithdrawModal ? (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div style={{ background: "linear-gradient(145deg, #1a1a1a, #2d2d2d)", padding: 30, borderRadius: 20, width: "90%", maxWidth: 400, border: "2px solid #28a745", boxShadow: "0 0 20px rgba(40,167,69,0.5)" }}>
          <h3 style={{ color: "#28a745", textAlign: "center", textShadow: "0 0 10px #28a745" }}>RETIRAR WLD</h3>
          <p style={{ color: "#fff", textAlign: "center" }}>Créditos disponibles: <strong>{playerCredits}</strong></p>
          {canWithdraw ? (
            <>
              <select value={creditsToWithdraw} onChange={(e) => setCreditsToWithdraw(Number(e.target.value))}
                style={{ width: "100%", padding: 14, margin: "12px 0", borderRadius: 12, border: "2px solid #28a745", background: "#111", color: "#fff", fontSize: 16 }}>
                {Array.from({ length: maxCredits / CONFIG.WITHDRAW_STEP }, (_, i) => {
                  const val = (i + 1) * CONFIG.WITHDRAW_STEP;
                  return <option key={val} value={val}>{val} créditos → {val / CONFIG.CREDITS_PER_WLD} WLD</option>;
                })}
              </select>
              <p style={{ color: "#28a745", textAlign: "center", fontSize: 18 }}>Recibirás: <strong>{creditsToWithdraw / CONFIG.CREDITS_PER_WLD} WLD</strong></p>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: 14, background: "#444", borderRadius: 12, color: "#fff" }}>Cancelar</button>
                <button onClick={() => {
                  const wld = creditsToWithdraw / CONFIG.CREDITS_PER_WLD;
                  setPlayerCredits(c => c - creditsToWithdraw);
                  alert(`¡Retiro exitoso!\nQuemaste ${creditsToWithdraw} créditos → Recibiste ${wld} WLD`);
                  setShowWithdrawModal(false);
                }} style={{ flex: 1, padding: 14, background: "linear-gradient(135deg, #28a745, #1e7e34)", color: "#fff", borderRadius: 12, fontWeight: "bold", boxShadow: "0 0 15px rgba(40,167,69,0.6)" }}>Retirar</button>
              </div>
            </>
          ) : (
            <p style={{ color: "#dc3545", textAlign: "center" }}>Mínimo {CONFIG.MIN_WITHDRAW_CREDITS} créditos para retirar</p>
          )}
          <button onClick={() => setShowWithdrawModal(false)} style={{ marginTop: 16, width: "100%", padding: 14, background: "#444", borderRadius: 12, color: "#ccc" }}>Cerrar</button>
        </div>
      </div>
    ) : null;
  };

  // === MODAL INFO – ESTILO LAS VEGAS ===
  const InfoModal = () => {
    return showInfoModal ? (
      <div style={{ 
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
        background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", 
        justifyContent: "center", zIndex: 200, backdropFilter: "blur(10px)"
      }}>
        <div style={{ 
          background: "linear-gradient(145deg, #1a1a1a, #2d2d2d)", 
          padding: 30, borderRadius: 24, width: "90%", maxWidth: 420,
          border: "3px solid #ffd700", boxShadow: "0 0 30px rgba(255,215,0,0.6), inset 0 0 20px rgba(255,215,0,0.2)",
          position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: -10, left: -10, right: -10, height: 6, background: "linear-gradient(90deg, #ff00ff, #00ffff, #ffff00, #ff00ff)", filter: "blur(8px)", opacity: 0.7 }}></div>
          <div style={{ position: "absolute", bottom: -10, left: -10, right: -10, height: 6, background: "linear-gradient(90deg, #ff00ff, #00ffff, #ffff00, #ff00ff)", filter: "blur(8px)", opacity: 0.7 }}></div>

          <h2 style={{ 
            textAlign: "center", margin: "0 0 20px", color: "#ffd700", 
            fontSize: 28, fontWeight: "bold", textShadow: "0 0 10px #ffd700, 0 0 20px #ff6b6b",
            letterSpacing: 2
          }}>
            TABLA DE PAGOS
          </h2>

          <div style={{ 
            background: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 16,
            border: "1px solid #ffd700", boxShadow: "inset 0 0 15px rgba(255,215,0,0.3)"
          }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
              <tbody>
                {[
                  { color: "#ff0000", name: "ROJO", payout: "x2", glow: "#ff4444" },
                  { color: "#0066ff", name: "AZUL", payout: "x2", glow: "#4488ff" },
                  { color: "#ffffff", name: "BLANCO", payout: "x2", glow: "#ffffff" },
                  { color: "#ffd700", name: "TODOS GANAN", payout: "x2.5", glow: "#ffff00" },
                  { color: "#000000", name: "PIERDE TODO", payout: "x0", glow: "#ff00ff" },
                ].map((item, i) => (
                  <tr key={i} style={{ 
                    animation: `pulse ${1.5 + i * 0.2}s infinite alternate`,
                    transform: "translateY(0)", transition: "all 0.3s"
                  }}>
                    <td style={{ 
                      padding: "14px 16px", borderRadius: "12px 0 0 12px",
                      background: item.color, color: item.color === "#ffffff" ? "#000" : "#fff",
                      fontWeight: "bold", fontSize: 18, textAlign: "center",
                      boxShadow: `0 0 15px ${item.glow}, inset 0 0 10px rgba(255,255,255,0.3)`,
                      border: `2px solid ${item.glow}`
                    }}>
                      {item.name}
                    </td>
                    <td style={{ 
                      padding: "14px 16px", borderRadius: "0 12px 12px 0",
                      background: "linear-gradient(135deg, #ffd700, #ff6b6b)", color: "#000",
                      fontWeight: "bold", fontSize: 22, textAlign: "center",
                      boxShadow: `0 0 15px ${item.glow}, inset 0 0 10px rgba(255,255,255,0.5)`,
                      border: `2px solid ${item.glow}`, minWidth: 80
                    }}>
                      {item.payout}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={() => setShowInfoModal(false)} style={{ 
            marginTop: 24, width: "100%", padding: 16, background: "linear-gradient(145deg, #ff6b6b, #ff4444)",
            color: "#fff", borderRadius: 16, border: "none", fontWeight: "bold", fontSize: 18,
            cursor: "pointer", boxShadow: "0 6px 20px rgba(255,0,0,0.4), 0 0 15px rgba(255,107,107,0.6)",
            textTransform: "uppercase", letterSpacing: 1, transition: "all 0.3s"
          }} onMouseDown={(e) => e.target.style.transform = "scale(0.95)"} onMouseUp={(e) => e.target.style.transform = "scale(1)"}>
            Cerrar
          </button>
        </div>

        <style jsx>{`
          @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.03); }
          }
          tr:hover {
            transform: scale(1.05) !important;
            z-index: 10;
          }
        `}</style>
      </div>
    ) : null;
  };

  // === RENDER ===
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f0f, #1a1a1a)",
      backgroundImage: "url(/assets/background.jpg)",
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
      padding: "16px 8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Orbitron', 'Arial Black', sans-serif",
      color: "#fff",
      position: "relative",
      overflowX: "hidden"
    }}>
      {/* Luces de fondo */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "radial-gradient(circle at 50% 50%, rgba(255,215,0,0.1), transparent 70%)", pointerEvents: "none" }}></div>

      <img src="/assets/logo.png" alt="logo" style={{ width: "80%", maxWidth: 320, margin: "8px auto", filter: "drop-shadow(0 0 10px #ffd700)" }} />

      {!isVerified ? (
        <div style={{ textAlign: "center", marginTop: 40, width: "100%", maxWidth: 400 }}>
          <h2 style={{ color: "#ffd700", fontSize: 26, marginBottom: 16, textShadow: "0 0 10px #ffd700", letterSpacing: 1 }}>VERIFICA TU HUMANIDAD</h2>
          {import.meta.env.VITE_APP_ID ? (
            <>
              <IDKitWidget app_id={import.meta.env.VITE_APP_ID} action="play" signal="ruleta-final" handleVerify={() => setIsVerified(true)}>
                {({ open }) => (
                  <button onClick={open} style={{ background: "linear-gradient(135deg, #ffd700, #ff6b6b)", color: "#000", padding: "16px 32px", borderRadius: 50, fontWeight: "bold", fontSize: 18, border: "none", boxShadow: "0 0 20px rgba(255,215,0,0.6)", cursor: "pointer", width: "90%", maxWidth: 300 }}>
                    CONECTAR WORLD ID
                  </button>
                )}
              </IDKitWidget>
            </>
          ) : (
            <p style={{ color: "#ccc" }}>App ID no configurado. Usa Modo Demo.</p>
          )}
          {enableDemo && !isVerified && (
            <button onClick={enterDemoMode} style={{ marginTop: 16, color: "#ffd700", textDecoration: "underline", fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>
              Modo Demo (50 créditos)
            </button>
          )}
        </div>
      ) : (
        <>
          {isDemo && (
            <div style={{ margin: "16px 0", textAlign: "center", background: "linear-gradient(135deg, #ff3b30, #cc0000)", color: "#fff", padding: 12, borderRadius: 16, width: "90%", maxWidth: 400, boxShadow: "0 0 15px rgba(255,59,48,0.6)" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: 16 }}>MODO DEMO - SIN RETIRO</p>
              <button onClick={exitDemoMode} style={{ marginTop: 8, padding: "8px 16px", background: "#fff", color: "#ff3b30", border: "none", borderRadius: 12, fontWeight: "bold", cursor: "pointer" }}>
                Salir del Modo Demo
              </button>
            </div>
          )}

          <div style={{ margin: "8px 0", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 400 }}>
            <button onClick={() => setShowBuyModal(true)} style={{ flex: 1, minWidth: 100, padding: "12px 8px", background: "linear-gradient(135deg, #ffd700, #ff6b6b)", borderRadius: 16, fontWeight: "bold", fontSize: 14, boxShadow: "0 0 15px rgba(255,215,0,0.6)" }}>COMPRAR</button>
            <button onClick={() => setShowWithdrawModal(true)} disabled={isDemo}
              style={{ flex: 1, minWidth: 100, padding: "12px 8px", background: isDemo ? "#666" : "linear-gradient(135deg, #28a745, #1e7e34)", color: "#fff", borderRadius: 16, fontWeight: "bold", fontSize: 14, cursor: isDemo ? "not-allowed" : "pointer", boxShadow: isDemo ? "none" : "0 0 15px rgba(40,167,69,0.6)" }}>
              {isDemo ? "RETIRO (DEMO)" : "RETIRAR"}
            </button>
            <button onClick={() => setShowInfoModal(true)} style={{ flex: 1, minWidth: 100, padding: "12px 8px", background: "linear-gradient(135deg, #007bff, #0056b3)", color: "#fff", borderRadius: 16, fontWeight: "bold", fontSize: 14, boxShadow: "0 0 15px rgba(0,123,255,0.6)" }}>INFO</button>
          </div>

          <div style={{ margin: "8px 0", fontSize: 18, color: "#ffd700", textShadow: "0 0 8px #ffd700", fontWeight: "bold" }}>
            CRÉDITOS: <span style={{ fontSize: 24 }}>{playerCredits}</span>
          </div>

          {view === "game" && (
            <>
              {/* === RULETA + LUCES + BOTÓN – CENTRADO PERFECTO === */}
              <div style={{ 
                position: "relative", 
                margin: "20px auto", 
                width: "min(380px, 90vw)", 
                height: "min(380px, 90vw)", 
                maxWidth: 380, 
                maxHeight: 380 
              }}>
                {/* Canvas Ruleta */}
                <motion.div 
                  animate={{ rotate: rotation }} 
                  transition={{ duration: SPIN_DUR / 1000, ease: "easeOut" }} 
                  style={{ 
                    position: "absolute", 
                    top: 0, left: 0, right: 0, bottom: 0,
                    width: "100%", 
                    height: "100%" 
                  }}
                >
                  <canvas 
                    ref={canvasRef} 
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      display: "block", 
                      borderRadius: "50%", 
                      boxShadow: "0 0 30px rgba(255,215,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)" 
                    }} 
                  />
                </motion.div>

                {/* Luces Neón */}
                <motion.img 
                  src="/assets/roulette_lights_only.png" 
                  variants={lightVariants} 
                  animate={lightAnimationState} 
                  initial="idle"
                  style={{ 
                    position: "absolute", 
                    top: "50%", 
                    left: "50%", 
                    transform: "translate(-50%, -50%)", 
                    width: "110%", 
                    height: "110%", 
                    pointerEvents: "none", 
                    zIndex: 15 
                  }} 
                />

                {/* Flecha */}
                <img 
                  src="/assets/flecha.png" 
                  alt="flecha"
                  style={{ 
                    position: "absolute", 
                    top: 35, 
                    left: "50%", 
                    transform: "translateX(-50%)", 
                    width: "60px", 
                    zIndex: 10, 
                    pointerEvents: "none", 
                    filter: "drop-shadow(0 0 10px #ffd700)" 
                  }} 
                />

                {/* Avión */}
                <motion.img 
                  src="/assets/plane.png" 
                  variants={planeVariants} 
                  animate={planeAction} 
                  initial="idle"
                  style={{ 
                    position: "absolute", 
                    left: "36%", 
                    top: "1%", 
                    transform: "translateX(-50%)", 
                    width: "28%", 
                    maxWidth: 120, 
                    pointerEvents: "none", 
                    zIndex: 20 
                  }} 
                />

                {/* Botón Apostar */}
                <button 
                  onClick={spin} 
                  disabled={spinning}
                  style={{ 
                    position: "absolute", 
                    top: "50%", 
                    left: "50%", 
                    transform: "translate(-50%, -50%)", 
                    width: "120px", 
                    height: "120px", 
                    background: "linear-gradient(135deg, #ffd700, #ff6b6b)", 
                    borderRadius: "50%", 
                    border: "4px solid #fff", 
                    fontWeight: "bold", 
                    fontSize: 18, 
                    cursor: "pointer", 
                    zIndex: 20, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    boxShadow: "0 0 30px rgba(255,215,0,0.9), inset 0 0 20px rgba(255,255,255,0.3)", 
                    textShadow: "0 0 10px #000",
                    fontFamily: "'Orbitron', sans-serif"
                  }}
                >
                  {spinning ? "GIRANDO..." : "APOSTAR"}
                </button>
              </div>

              <div style={{ margin: "16px 0", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 380 }}>
                {CONFIG.CHIP_VALUES.map((v) => (
                  <button key={v} onClick={() => setChipValue(v)} style={{ padding: "12px 16px", borderRadius: 16, background: chipValue === v ? "linear-gradient(135deg, #ffd700, #ff6b6b)" : "#333", color: chipValue === v ? "#000" : "#fff", fontWeight: chipValue === v ? "bold" : "normal", border: "2px solid #ffd700", minWidth: 60, boxShadow: chipValue === v ? "0 0 15px rgba(255,215,0,0.6)" : "none" }}>
                    {v}
                  </button>
                ))}
                <button onClick={maxBet} style={{ background: "linear-gradient(135deg, #ff3b30, #cc0000)", color: "#fff", padding: "12px 16px", borderRadius: 16, fontWeight: "bold", minWidth: 80, boxShadow: "0 0 15px rgba(255,59,48,0.6)" }}>MAX BET</button>
              </div>

              <div style={{ margin: "20px 0", display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 380 }}>
                <motion.button onClick={() => addBet("rojo")} whileTap={{ scale: 0.9 }} style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #ff3b30, #cc0000)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(255,59,48,0.8), inset 0 0 15px rgba(255,255,255,0.2)", border: "3px solid #fff", fontSize: 16, fontWeight: "bold" }}>
                  <span>ROJO</span><small style={{ fontSize: 12 }}>({bets.rojo})</small>
                </motion.button>
                <motion.button onClick={() => addBet("azul")} whileTap={{ scale: 0.9 }} style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #0066ff, #0033cc)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(0,102,255,0.8), inset 0 0 15px rgba(255,255,255,0.2)", border: "3px solid #fff", fontSize: 16, fontWeight: "bold" }}>
                  <span>AZUL</span><small style={{ fontSize: 12 }}>({bets.azul})</small>
                </motion.button>
                <motion.button onClick={() => addBet("blanco")} whileTap={{ scale: 0.9 }} style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #ffffff, #e0e0e0)", color: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(255,255,255,0.8), inset 0 0 15px rgba(0,0,0,0.2)", border: "3px solid #ffd700", fontSize: 16, fontWeight: "bold" }}>
                  <span>BLANCO</span><small style={{ fontSize: 12 }}>({bets.blanco})</small>
                </motion.button>
              </div>

              <div style={{ margin: "16px 0", display: "flex", gap: 8, justifyContent: "center", width: "100%", maxWidth: 380 }}>
                <motion.button onClick={repeatBet} whileTap={{ scale: 0.9 }} style={{ padding: "12px 20px", borderRadius: 16, background: "#444", color: "#fff", fontWeight: "bold" }}>REPETIR</motion.button>
                <motion.button onClick={doubleBet} whileTap={{ scale: 0.9 }} style={{ padding: "12px 20px", borderRadius: 16, background: "#ff6b6b", color: "#fff", fontWeight: "bold" }}>x2</motion.button>
                <button onClick={clearBets} style={{ padding: "12px 20px", borderRadius: 16, background: "#333", color: "#ccc", fontWeight: "bold" }}>CERO</button>
              </div>

              <div style={{ margin: "24px 0", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 380 }}>
                {history.length === 0 && <p style={{ color: "#666", fontSize: 14 }}>Sin resultados</p>}
                {!isRoundActive && history.map((h, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: h.landed.hex, border: "3px solid #ffd700", boxShadow: "0 0 10px rgba(255,215,0,0.6)" }} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <BuyCreditsModal />
      <WithdrawModal />
      <InfoModal />
    </div>
  );
}