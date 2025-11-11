// src/App.jsx
// ========================================
// MINIAPP RULETA WORLDCOIN - SISTEMA DE CRÉDITOS
// Autor: MProducciones
// Fecha: 11 Nov 2025
// ========================================

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IDKitWidget } from "@worldcoin/idkit";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/* eslint-disable react-hooks/exhaustive-deps */

/* ===== GANCHO DE SONIDO ===== */
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

/* ===== CONFIGURACIÓN GLOBAL ===== */
const INITIAL_CREDITS = 0;           // Créditos al inicio
const CREDITS_PER_WLD = 1;            // 1 WLD = 1 crédito
const MIN_WITHDRAW_WLD = 5;          // Retiro mínimo: 5 WLD
const MAX_BET_CREDITS = 1;           // Máximo apuesta: 1 crédito
const DEMO_CREDITS = 50;             // Créditos en modo demo

/* ===== SECCIONES DE LA RUEDA ===== */
const sections = [
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#ffffff", name: "BLANCO", multiplier: 3 },
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#000000", name: "NEGRO", multiplier: 0 },
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#ffffff", name: "BLANCO", multiplier: 3 },
  { hex: "#ff0000", name: "ROJO", multiplier: 1.5 },
  { hex: "#0066ff", name: "AZUL", multiplier: 2 },
];

export default function ColorPlaneGame() {
  // ========================================
  // ESTADO PRINCIPAL
  // ========================================
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
  const [chipValue, setChipValue] = useState(0.1); // Valor de ficha en créditos
  const [bets, setBets] = useState({ rojo: 0, azul: 0, blanco: 0 }); // Apuestas en créditos
  const [lastBets, setLastBets] = useState(null);
  const [playerCredits, setPlayerCredits] = useState(INITIAL_CREDITS); // Créditos del jugador
  const [accumulatedWLD, setAccumulatedWLD] = useState(0); // WLD ganados (para retiro)
  const [planeAction, setPlaneAction] = useState("idle");
  const [lightAnimationState, setLightAnimationState] = useState("idle");
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("game");
  const [isVerified, setIsVerified] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const radius = 160;

  // ========================================
  // SONIDOS
  // ========================================
  const playSpinSound = useSound("/sounds/spin.mp3");
  const playWinSound = useSound("/sounds/win.mp3");
  const playLoseSound = useSound("/sounds/lose.mp3");
  const playBetSound = useSound("/sounds/bet.mp3");

  // ========================================
  // MODO DEMO
  // ========================================
  const isDev = import.meta.env.DEV;
  const enableDemo = isDev || import.meta.env.VITE_ENABLE_DEMO === "true";

  useEffect(() => {
    if (enableDemo && (!import.meta.env.VITE_APP_ID || localStorage.getItem("demoMode") === "true")) {
      setIsVerified(true);
      setPlayerCredits(DEMO_CREDITS);
      localStorage.setItem("demoMode", "true");
    }
  }, [enableDemo]);

  const enterDemoMode = () => {
    localStorage.setItem("demoMode", "true");
    setIsVerified(true);
    setPlayerCredits(DEMO_CREDITS);
  };

  const exitDemoMode = () => {
    localStorage.removeItem("demoMode");
    setIsVerified(false);
    setPlayerCredits(INITIAL_CREDITS);
    setAccumulatedWLD(0);
    setBets({ rojo: 0, azul: 0, blanco: 0 });
    setHistory([]);
    setView("game");
    setPlaneAction("idle");
    setLightAnimationState("idle");
    setSpinning(false);
    setIsRoundActive(false);
  };

  // ========================================
  // DIBUJO DE LA RULETA
  // ========================================
  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(" ");
    let line = "", lines = [];
    if (ctx.measureText(text).width <= maxWidth) lines.push(text);
    else {
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else line = testLine;
      }
      lines.push(line);
    }
    const totalTextHeight = lines.length * lineHeight;
    let currentY = y - totalTextHeight / 2 + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x, currentY);
      currentY += lineHeight;
    }
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || radius * 2;
    canvas.height = rect.height || radius * 2;

    const sectionAngle = (2 * Math.PI) / sections.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sections.forEach((sec, i) => {
      const startAngle = i * sectionAngle;
      const endAngle = startAngle + sectionAngle;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = sec.hex;
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = startAngle + sectionAngle / 2;
      const textRadius = Math.min(canvas.width, canvas.height) * 0.3;
      const x = canvas.width / 2 + textRadius * Math.cos(midAngle);
      const y = canvas.height / 2 + textRadius * Math.sin(midAngle);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(midAngle + Math.PI / 2);

      if (sec.multiplier > 0) {
        ctx.fillStyle = sec.hex === "#ffffff" ? "#222" : "#fff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`x${sec.multiplier}`, 0, 0);
      } else {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        wrapText(ctx, "PIERDE TODO", 0, 0, 80, 16);
      }
      ctx.restore();
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

  // ========================================
  // HISTORIAL
  // ========================================
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

  // ========================================
  // GIRAR RULETA
  // ========================================
  const spin = () => {
    const totalBet = bets.rojo + bets.azul + bets.blanco;
    if (spinning || totalBet <= 0 || totalBet > playerCredits || totalBet > MAX_BET_CREDITS) {
      alert(`Apuesta inválida. Máximo ${MAX_BET_CREDITS} crédito.`);
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
        const color = landed.name.toLowerCase();

        if (color === "rojo" && bets.rojo > 0) totalWin = bets.rojo * landed.multiplier;
        else if (color === "azul" && bets.azul > 0) totalWin = bets.azul * landed.multiplier;
        else if (color === "blanco" && bets.blanco > 0) totalWin = bets.blanco * landed.multiplier;

        if (color !== "rojo") losses.rojo = bets.rojo;
        if (color !== "azul") losses.azul = bets.azul;
        if (color !== "blanco") losses.blanco = bets.blanco;
        if (color === "negro") {
          losses.rojo = bets.rojo;
          losses.azul = bets.azul;
          losses.blanco = bets.blanco;
        }

        if (landed.name === "NEGRO") {
          alert("Cayó NEGRO. Pierdes todo");
          playLoseSound();
        } else if (totalWin > 0) {
          setTimeout(() => {
            setPlayerCredits((p) => p + totalWin);
            setAccumulatedWLD((w) => w + totalWin);
            alert(`¡Ganaste ${totalWin} créditos!`);
            playWinSound();
          }, 50);
        } else {
          alert("Perdiste esta ronda.");
          playLoseSound();
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

  // ========================================
  // APUESTAS
  // ========================================
  const addBet = (color) => {
    setBets((prev) => {
      const total = prev.rojo + prev.azul + prev.blanco + chipValue;
      if (total > MAX_BET_CREDITS) {
        alert(`Máximo ${MAX_BET_CREDITS} crédito`);
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
      if (total > MAX_BET_CREDITS) {
        alert("Supera límite");
        return prev;
      }
      return doubled;
    });
  };
  const clearBets = () => setBets({ rojo: 0, azul: 0, blanco: 0 });

  // ========================================
  // ANIMACIONES
  // ========================================
  const planeVariants = {
    idle: { y: -30, scale: 1, opacity: 1, rotate: 0 },
    takeoff: { y: 200, scale: 1.4, opacity: 0, rotate: 20, transition: { duration: TAKEOFF_DUR / 1000, ease: "easeIn" } },
    hiddenTop: { y: -420, scale: 0.7, opacity: 0, rotate: 20 },
    landing: { y: -30, scale: 1, opacity: 1, rotate: 0, transition: { duration: LANDING_DUR / 1000, ease: "easeOut" } },
  };

  const lightVariants = {
    idle: { opacity: 0.8, filter: "brightness(0.7)" },
    on: { opacity: 1, filter: "brightness(1.2)" },
    flicker: {
      opacity: [1, 0.7, 1],
      filter: ["brightness(1.5)", "brightness(1.0)", "brightness(1.5)"],
      transition: { duration: 0.3, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
    },
  };

  // ========================================
  // MODALES
  // ========================================
  const BuyCreditsModal = () => {
    const [wldAmount, setWldAmount] = useState(1);
    return showBuyModal ? (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
        <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "90%", maxWidth: 400 }}>
          <h3>Comprar Créditos</h3>
          <p>1 WLD = 1 Crédito</p>
          <input
            type="number"
            min="1"
            value={wldAmount}
            onChange={(e) => setWldAmount(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: "100%", padding: 12, margin: "12px 0", borderRadius: 8, border: "1px solid #ccc" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowBuyModal(false); }} style={{ flex: 1, padding: 12, background: "#ccc", borderRadius: 8 }}>Cancelar</button>
            <button onClick={() => {
              // SIMULACIÓN: Aquí iría la integración con Worldcoin Wallet
              alert(`Compra simulada: ${wldAmount} WLD → ${wldAmount} créditos`);
              setPlayerCredits((c) => c + wldAmount);
              setShowBuyModal(false);
            }} style={{ flex: 1, padding: 12, background: "#ffd54f", borderRadius: 8, fontWeight: "bold" }}>Comprar</button>
          </div>
        </div>
      </div>
    ) : null;
  };

  const WithdrawModal = () => {
    return showWithdrawModal ? (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
        <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "90%", maxWidth: 400 }}>
          <h3>Retirar WLD</h3>
          <p>WLD acumulados: <strong>{accumulatedWLD}</strong></p>
          {accumulatedWLD >= MIN_WITHDRAW_WLD ? (
            <>
              <p>Puedes retirar hasta <strong>{accumulatedWLD}</strong> WLD</p>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: 12, background: "#ccc", borderRadius: 8 }}>Cancelar</button>
                <button onClick={() => {
                  alert(`Retiro simulado: ${accumulatedWLD} WLD`);
                  setAccumulatedWLD(0);
                  setShowWithdrawModal(false);
                }} style={{ flex: 1, padding: 12, background: "#28a745", color: "#fff", borderRadius: 8, fontWeight: "bold" }}>Retirar</button>
              </div>
            </>
          ) : (
            <p style={{ color: "#dc3545" }}>Mínimo {MIN_WITHDRAW_WLD} WLD para retirar</p>
          )}
          <button onClick={() => setShowWithdrawModal(false)} style={{ marginTop: 16, width: "100%", padding: 12, background: "#eee", borderRadius: 8 }}>Cerrar</button>
        </div>
      </div>
    ) : null;
  };

  // ========================================
  // VISTA HISTORIAL
  // ========================================
  const renderView = () => {
    if (view === "historial") {
      return (
        <div style={{ width: "100%", maxWidth: 520, marginTop: 16, background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
          <h3 style={{ marginBottom: 12 }}>Historial</h3>
          {history.length === 0 && <p>No hay partidas</p>}
          {history.map((h, i) => {
            const won = h.totalWin > 0;
            const lost = Object.values(h.losses).reduce((a, b) => a + b, 0);
            return (
              <div key={i} style={{ marginBottom: 8, padding: 10, borderRadius: 6, background: won ? "rgba(0,200,0,0.08)" : "rgba(200,0,0,0.08)", border: "1px solid #ddd" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ display: "inline-block", width: 20, height: 20, background: h.landed.hex, border: "1px solid #222", marginRight: 8 }} />
                  <strong>{h.landed.name}</strong>
                  <span style={{ marginLeft: 8 }}>{won ? `+${h.totalWin}` : `-${lost}`} créditos</span>
                </div>
                <small style={{ color: "#555" }}>{h.fecha} - {h.hora}</small>
              </div>
            );
          })}
          <button style={{ marginTop: 16, padding: "8px 14px", borderRadius: 6, background: "#eee" }} onClick={() => setView("game")}>
            Volver
          </button>
        </div>
      );
    }
    return null;
  };

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  return (
    <div style={{ minHeight: "100vh", backgroundImage: "url(/assets/background.jpg)", backgroundSize: "cover", padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <img src="/assets/logo.png" alt="logo" style={{ width: "90%", maxWidth: 350, marginTop: 8 }} />

      {/* ======================================== */}
      {/* VERIFICACIÓN WORLD ID */}
      {/* ======================================== */}
      {!isVerified ? (
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <h2 style={{ color: "#ffd54f", fontSize: 28, marginBottom: 20, fontWeight: "bold" }}>
            Verifica tu humanidad
          </h2>

          {import.meta.env.VITE_APP_ID ? (
            <>
              <IDKitWidget 
                app_id={import.meta.env.VITE_APP_ID} 
                action="play" 
                signal="ruleta-colores" 
                handleVerify={() => setIsVerified(true)}
              >
                {({ open }) => (
                  <button
                    onClick={open}
                    style={{
                      background: "linear-gradient(#ffd54f, #ffb800)",
                      color: "#000",
                      padding: "16px 32px",
                      borderRadius: 50,
                      fontWeight: "bold",
                      fontSize: 18,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      cursor: "pointer",
                    }}
                  >
                    Conectar World ID
                  </button>
                )}
              </IDKitWidget>

              {/* ACCESIBILIDAD: TÍTULO Y DESCRIPCIÓN OCULTOS */}
              <VisuallyHidden>
                <h3 id="world-id-title">Verificación con World ID</h3>
                <p id="world-id-desc">Escanea el código QR con la aplicación Worldcoin para verificar tu humanidad.</p>
              </VisuallyHidden>
            </>
          ) : (
            <p style={{ color: "#ccc" }}>App ID no configurado. Usa Modo Demo.</p>
          )}

          {/* MODO DEMO */}
          {enableDemo && !isVerified && (
            <button 
              onClick={enterDemoMode} 
              style={{ 
                marginTop: 16, 
                color: "#ccc", 
                textDecoration: "underline", 
                fontSize: 14,
                background: "none",
                border: "none",
                cursor: "pointer"
              }}>
              Modo Demo (50 créditos)
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ======================================== */}
          {/* SALIR DEL MODO DEMO */}
          {/* ======================================== */}
          {isVerified && localStorage.getItem("demoMode") === "true" && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ color: "#ffd54f", fontSize: 14 }}>Estás en Modo Demo</p>
              <button
                onClick={exitDemoMode}
                style={{
                  marginTop: 8,
                  padding: "8px 16px",
                  background: "#ff3b30",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Salir del Modo Demo
              </button>
            </div>
          )}

          {/* ======================================== */}
          {/* PANEL DE CRÉDITOS */}
          {/* ======================================== */}
          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => setShowBuyModal(true)} style={{ padding: "10px 16px", background: "#ffd54f", borderRadius: 8, fontWeight: "bold" }}>
              Comprar Créditos
            </button>
            <button 
              onClick={() => setShowWithdrawModal(true)} 
              disabled={accumulatedWLD < MIN_WITHDRAW_WLD}
              style={{ 
                padding: "10px 16px", 
                background: accumulatedWLD >= MIN_WITHDRAW_WLD ? "#28a745" : "#ccc", 
                color: "#fff",
                borderRadius: 8, 
                fontWeight: "bold",
                cursor: accumulatedWLD >= MIN_WITHDRAW_WLD ? "pointer" : "not-allowed"
              }}
            >
              Retirar WLD ({accumulatedWLD})
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 16, color: "#fff" }}>
            Créditos: <strong>{playerCredits}</strong> | WLD para retiro: <strong>{accumulatedWLD}</strong>
          </div>

          {/* ======================================== */}
          {/* JUEGO */}
          {/* ======================================== */}
          {view === "game" && (
            <>
              <div style={{ position: "relative", marginTop: 20, width: "90%", maxWidth: 400 }}>
                <motion.div
                  animate={{ rotate: rotation }}
                  transition={{ duration: SPIN_DUR / 1000, ease: "easeOut" }}
                  style={{ width: "100%", aspectRatio: "1" }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                </motion.div>

                <motion.img
                  src="/assets/roulette_lights_only.png"
                  variants={lightVariants}
                  animate={lightAnimationState}
                  initial="idle"
                  style={{ position: "absolute", top: -20, left: -20, width: "111%", height: "111%", pointerEvents: "none", zIndex: 15 }}
                />

                <img
                  src="/assets/flecha.png"
                  alt="flecha"
                  style={{ position: "absolute", top: 35, left: "50%", transform: "translateX(-50%)", width: "60px", zIndex: 10, pointerEvents: "none" }}
                />

                <motion.img
                  src="/assets/plane.png"
                  variants={planeVariants}
                  animate={planeAction}
                  initial="idle"
                  style={{ position: "absolute", left: "37.4%", top: 1, transform: "translateX(-50%)", width: "25%", maxWidth: 120, pointerEvents: "none", zIndex: 20 }}
                />

                <button
                  onClick={spin}
                  disabled={spinning}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "110px",
                    height: "110px",
                    background: "#ffd54f",
                    borderRadius: "50%",
                    border: "none",
                    fontWeight: "bold",
                    fontSize: 18,
                    cursor: "pointer",
                    zIndex: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  {spinning ? "Girando..." : "Apostar"}
                </button>
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                {[0.1, 0.5, 1].map((v) => (
                  <button key={v} onClick={() => setChipValue(v)} style={{ padding: "8px 14px", borderRadius: 8, background: chipValue === v ? "#ffd54f" : "#eee", fontWeight: chipValue === v ? "bold" : "normal" }}>
                    {v} crédito
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <motion.button onClick={() => addBet("rojo")} whileTap={{ scale: 0.9, y: 3 }} style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(#ff3b30, #cc0000)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", border: "none", fontSize: 14, fontWeight: "bold" }}>
                  <span>ROJO</span><span>x1.5</span><small>({bets.rojo})</small>
                </motion.button>
                <motion.button onClick={() => addBet("azul")} whileTap={{ scale: 0.9, y: 3 }} style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(#0066ff, #0033cc)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", border: "none", fontSize: 14, fontWeight: "bold" }}>
                  <span>AZUL</span><span>x2</span><small>({bets.azul})</small>
                </motion.button>
                <motion.button onClick={() => addBet("blanco")} whileTap={{ scale: 0.9, y: 3 }} style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(#ffffff, #e0e0e0)", color: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", border: "1px solid #ccc", fontSize: 14, fontWeight: "bold" }}>
                  <span>BLANCO</span><span>x3</span><small>({bets.blanco})</small>
                </motion.button>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <motion.button onClick={repeatBet} whileTap={{ scale: 0.9 }} style={{ padding: "8px 14px", borderRadius: 8 }}>Repetir</motion.button>
                <motion.button onClick={doubleBet} whileTap={{ scale: 0.9 }} style={{ padding: "8px 14px", borderRadius: 8 }}>x2 Doblar</motion.button>
                <motion.button onClick={clearBets} whileTap={{ scale: 0.9 }} style={{ padding: "8px 14px", borderRadius: 8 }}>Cero</motion.button>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {history.length === 0 && <p style={{ color: "#eee" }}>Sin resultados</p>}
                {!isRoundActive &&
                  history.map((h, i) => (
                    <div key={i} onClick={() => setView("historial")} style={{ width: 26, height: 26, borderRadius: "50%", background: h.landed.hex, border: "2px solid #222", cursor: "pointer" }} />
                  ))}
              </div>
            </>
          )}
          {renderView()}
        </>
      )}

      {/* ======================================== */}
      {/* MODALES */}
      {/* ======================================== */}
      <BuyCreditsModal />
      <WithdrawModal />
    </div>
  );
}