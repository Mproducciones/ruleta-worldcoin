// src/App.jsx
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

/* ===== CONFIG ===== */
const INITIAL_PLAYER_BALANCE = 10.0;
const MAX_HISTORY = 10;
const MAX_BET = 1.0;

/* ===== SECCIONES RUEDA ===== */
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
  const [chipValue, setChipValue] = useState(0.1);
  const [bets, setBets] = useState({ rojo: 0, azul: 0, blanco: 0 });
  const [lastBets, setLastBets] = useState(null);
  const [playerBalance, setPlayerBalance] = useState(INITIAL_PLAYER_BALANCE);
  const [planeAction, setPlaneAction] = useState("idle");
  const [lightAnimationState, setLightAnimationState] = useState("idle");
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("game");
  const [isVerified, setIsVerified] = useState(false);
  const radius = 160;

  const playSpinSound = useSound("/sounds/spin.mp3");
  const playWinSound = useSound("/sounds/win.mp3");
  const playLoseSound = useSound("/sounds/lose.mp3");
  const playBetSound = useSound("/sounds/bet.mp3");

  const isDev = import.meta.env.DEV;
  const enableDemo = isDev || import.meta.env.VITE_ENABLE_DEMO === "true";

  // MODO DEMO AUTOMÁTICO SI NO HAY APP_ID
  useEffect(() => {
    if (enableDemo && (!import.meta.env.VITE_APP_ID || localStorage.getItem("demoMode") === "true")) {
      setIsVerified(true);
      setPlayerBalance(50);
      localStorage.setItem("demoMode", "true");
    }
  }, [enableDemo]);

  const enterDemoMode = () => {
    localStorage.setItem("demoMode", "true");
    setIsVerified(true);
    setPlayerBalance(50);
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(" ");
    let line = "";
    let lines = [];
    if (ctx.measureText(text).width <= maxWidth) {
      lines.push(text);
    } else {
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
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

    // AJUSTAR TAMAÑO REAL DEL CANVAS
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

  // DIBUJA AL INICIO
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

  // REDIBUJA AL GIRAR
  useEffect(() => {
    if (view === "game" && canvasRef.current) {
      const raf = requestAnimationFrame(drawWheel);
      return () => cancelAnimationFrame(raf);
    }
  }, [rotation, view]);

  // LIMPIA TIMERS
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

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
    ].slice(0, MAX_HISTORY));
  };

  const spin = () => {
    const totalBet = bets.rojo + bets.azul + bets.blanco;
    if (spinning || totalBet <= 0 || totalBet > playerBalance) {
      alert("Apuesta inválida");
      return;
    }

    setSpinning(true);
    setIsRoundActive(true);
    setPlayerBalance((p) => Number((p - totalBet).toFixed(8)));
    setLastBets(bets);
    setPlaneAction("takeoff");
    setLightAnimationState("flicker");

    const tStartSpin = setTimeout(() => {
      playSpinSound();
      const randomRotation = 360 * 5 + Math.floor(Math.random() * 360);
      const finalRotation = rotation + randomRotation;
      setRotation(finalRotation);
      setPlaneAction("hiddenTop");

      requestAnimationFrame(() => {
        if (canvasRef.current) drawWheel();
      });

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
            setPlayerBalance((p) => Number((p + totalWin).toFixed(8)));
            alert(`¡Ganaste ${totalWin.toFixed(4)} WLD!`);
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

  const addBet = (color) => {
    setBets((prev) => {
      const total = prev.rojo + prev.azul + prev.blanco + chipValue;
      if (total > MAX_BET) {
        alert(`Máximo ${MAX_BET} WLD`);
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
      if (total > MAX_BET) {
        alert("Supera límite");
        return prev;
      }
      return doubled;
    });
  };
  const clearBets = () => setBets({ rojo: 0, azul: 0, blanco: 0 });

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
                  <span style={{ marginLeft: 8 }}>{won ? `+${h.totalWin.toFixed(4)}` : `-${lost.toFixed(4)}`} WLD</span>
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

  return (
    <div style={{ minHeight: "100vh", backgroundImage: "url(/assets/background.jpg)", backgroundSize: "cover", padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <img src="/assets/logo.png" alt="logo" style={{ width: "90%", maxWidth: 350, marginTop: 8 }} />

      {!isVerified ? (
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <h2 style={{ color: "#ffd54f", fontSize: 28, marginBottom: 20, fontWeight: "bold" }}>Verifica tu humanidad</h2>
          {import.meta.env.VITE_APP_ID ? (
            <IDKitWidget app_id={import.meta.env.VITE_APP_ID} action="play" signal="ruleta-colores" handleVerify={() => setIsVerified(true)}>
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
          ) : (
            <p style={{ color: "#ccc" }}>App ID no configurado. Usa Modo Demo.</p>
          )}
          <VisuallyHidden>
            <h3>Verificación World ID</h3>
            <p>Escanea el QR con la app de Worldcoin.</p>
          </VisuallyHidden>
          {enableDemo && (
            <button onClick={enterDemoMode} style={{ marginTop: 16, color: "#ccc", textDecoration: "underline", fontSize: 14 }}>
              Modo Demo (50 WLD)
            </button>
          )}
        </div>
      ) : (
        <>
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
                    {v} WLD
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <motion.button onClick={() => addBet("rojo")} whileTap={{ scale: 0.9, y: 3 }} style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(#ff3b30, #cc0000)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", border: "none", fontSize: 14, fontWeight: "bold" }}>
                  <span>ROJO</span><span>x1.5</span><small>({bets.rojo.toFixed(2)})</small>
                </motion.button>
                <motion.button onClick={() => addBet("azul")} whileTap={{ scale: 0.9, y: 3 }} style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(#0066ff, #0033cc)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", border: "none", fontSize: 14, fontWeight: "bold" }}>
                  <span>AZUL</span><span>x2</span><small>({bets.azul.toFixed(2)})</small>
                </motion.button>
                <motion.button onClick={() => addBet("blanco")} whileTap={{ scale: 0.9, y: 3 }} style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(#ffffff, #e0e0e0)", color: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", border: "1px solid #ccc", fontSize: 14, fontWeight: "bold" }}>
                  <span>BLANCO</span><span>x3</span><small>({bets.blanco.toFixed(2)})</small>
                </motion.button>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <motion.button onClick={repeatBet} whileTap={{ scale: 0.9 }} style={{ padding: "8px 14px", borderRadius: 8 }}>Repetir</motion.button>
                <motion.button onClick={doubleBet} whileTap={{ scale: 0.9 }} style={{ padding: "8px 14px", borderRadius: 8 }}>x2 Doblar</motion.button>
                <motion.button onClick={clearBets} whileTap={{ scale: 0.9 }} style={{ padding: "8px 14px", borderRadius: 8 }}>Cero</motion.button>
              </div>

              <div style={{ marginTop: 12, fontSize: 14, color: "#ddd" }}>Saldo: {playerBalance.toFixed(4)} WLD</div>

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
    </div>
  );
}