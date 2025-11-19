import React, { useRef, useEffect, useState, useCallback } from "react";
import { IDKitWidget } from '@worldcoin/idkit';
import { motion } from "framer-motion";
import "./ColorPlaneGame.css";

/* ===== GANCHO DE SONIDO MEJORADO ===== */
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
    if (typeof window !== 'undefined') {
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  };

  return play;
};

/* ===== CONFIG ===== */
const INITIAL_PLAYER_BALANCE = 1000.0;
const MAX_HISTORY = 10;
const MAX_BET = 100.0;
const API_URL = "http://localhost:3001"; // 🚨 Reemplaza con la URL de tu backend en producción

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
  const [result, setResult] = useState(null);
  const [chipValue, setChipValue] = useState(10);
  const [bets, setBets] = useState({ rojo: 0, azul: 0, blanco: 0 });
  const [lastBets, setLastBets] = useState(null);
  const [playerBalance, setPlayerBalance] = useState(INITIAL_PLAYER_BALANCE);
  const [planeAction, setPlaneAction] = useState("idle");
  const [lightAnimationState, setLightAnimationState] = useState('idle');
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("game");
  const radius = 160;

  const [isVerified, setIsVerified] = useState(false);

  const playSpinSound = useSound('/sounds/spin.mp3');
  const playWinSound = useSound('/sounds/win.mp3');
  const playLoseSound = useSound('/sounds/lose.mp3');
  const playBetSound = useSound('/sounds/bet.mp3');

  const wrapText = useCallback((ctx, text, x, y, maxWidth, lineHeight) => {
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
    let currentY = y - (totalTextHeight / 2) + (lineHeight / 2);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x, currentY);
      currentY += lineHeight;
    }
  }, []);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const sectionAngle = (2 * Math.PI) / sections.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sections.forEach((sec, i) => {
      const startAngle = i * sectionAngle;
      const endAngle = startAngle + sectionAngle;
      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = sec.hex;
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.stroke();
      const midAngle = startAngle + sectionAngle / 2;
      const textRadius = radius * 0.6;
      const x = radius + textRadius * Math.cos(midAngle);
      const y = radius + textRadius * Math.sin(midAngle);
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
  }, [radius, sections, wrapText]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => {
    if (view === "game") drawWheel();
  }, [view, rotation, drawWheel]);

  useEffect(() => {
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, []);

  const pushHistory = (landed, bets, totalWin, losses) => {
    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();
    setHistory((h) => {
      const next = [{ landed, bets: {...bets}, totalWin, losses: {...losses}, fecha, hora }, ...h];
      return next.slice(0, MAX_HISTORY);
    });
  };

  const spin = () => {
    const totalBet = bets.rojo + bets.azul + bets.blanco;
    if (spinning) return;
    if (totalBet <= 0) return alert("Debes apostar al menos en un color");
    if (totalBet > playerBalance) return alert("Saldo insuficiente");

    setSpinning(true);
    setIsRoundActive(true);
    setResult(null);
    setPlayerBalance((p) => Number((p - totalBet).toFixed(8)));
    setLastBets(bets);
    setPlaneAction("takeoff");
    setLightAnimationState('flicker');

    const tStartSpin = setTimeout(() => {
      playSpinSound();
      const randomRotation = 360 * 5 + Math.floor(Math.random() * 360);
      const final = rotation + randomRotation;
      setRotation(final);
      setPlaneAction("hiddenTop");

      const landingStartDelay = SPIN_DUR - LANDING_APPEAR_BEFORE_STOP;
      const tLandingStart = setTimeout(() => {
        setPlaneAction("landing");
      }, landingStartDelay);
      pushTimer(tLandingStart);

      const tEnd = setTimeout(() => {
        const normalized = (final % 360 + 360) % 360;
        const sectionSize = 360 / sections.length;
        const pointerAngle = 270;
        const landedAngle = (pointerAngle - normalized + 360) % 360;
        const index = Math.floor(landedAngle / sectionSize);
        const landed = sections[index];
        setResult(landed);

        let totalWin = 0;
        let losses = {};
        const landedColor = landed.name.toLowerCase();
        
        if (landedColor === "rojo" && bets.rojo > 0) {
            totalWin = bets.rojo * landed.multiplier;
        } else if (landedColor === "azul" && bets.azul > 0) {
            totalWin = bets.azul * landed.multiplier;
        } else if (landedColor === "blanco" && bets.blanco > 0) {
            totalWin = bets.blanco * landed.multiplier;
        }

        if (landedColor !== "rojo") losses.rojo = bets.rojo;
        if (landedColor !== "azul") losses.azul = bets.azul;
        if (landedColor !== "blanco") losses.blanco = bets.blanco;
        if (landedColor === "negro") {
            losses.rojo = bets.rojo;
            losses.azul = bets.azul;
            losses.blanco = bets.blanco;
        }

        if (landed.name === "NEGRO") {
          alert("Cayó NEGRO 😢 Pierdes todas las apuestas");
          playLoseSound(); 
        } else if (totalWin > 0) {
          setTimeout(() => {
            setPlayerBalance((p) => Number((p + totalWin).toFixed(8)));
            alert(`✅ Ganaste ${totalWin.toFixed(0)} puntos. Apostaste ${bets[landedColor].toFixed(0)} puntos en ${landed.name}.`);
            playWinSound(); 
          }, 50);
        } else {
          alert("❌ Perdiste esta ronda.");
          playLoseSound(); 
        }

        pushHistory(landed, bets, totalWin, losses);
        setLightAnimationState('on');

        const tFinish = setTimeout(() => {
          setSpinning(false);
          setPlaneAction("idle");
          setBets({ rojo: 0, azul: 0, blanco: 0 });
          setIsRoundActive(false);
          setLightAnimationState('idle');
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
        alert(`No puedes apostar más de ${MAX_BET} puntos en total`);
        return prev;
      }
      playBetSound();
      return { ...prev, [color]: prev[color] + chipValue };
    });
  };

  const repeatBet = () => {
    if (!lastBets) return;
    setBets(lastBets);
  };

  const doubleBet = () => {
    setBets((prev) => {
      const doubled = {
        rojo: prev.rojo * 2,
        azul: prev.azul * 2,
        blanco: prev.blanco * 2,
      };
      const total = doubled.rojo + doubled.azul + doubled.blanco;
      if (total > MAX_BET) {
        alert("El doble supera el límite de apuesta");
        return prev;
      }
      return doubled;
    });
  };
  
  const clearBets = () => {
    setBets({ rojo: 0, azul: 0, blanco: 0 });
  };

  const planeVariants = {
    idle: { y: -30, scale: 1, opacity: 1, rotate: 0 },
    takeoff: { y: 200, scale: 1.4, opacity: 0, rotate: 20, transition: { duration: TAKEOFF_DUR / 1000, ease: "easeIn" } },
    hiddenTop: { y: -420, scale: 0.7, opacity: 0, rotate: 20 },
    landing: { y: -30, scale: 1, opacity: 1, rotate: 0, transition: { duration: LANDING_DUR / 1000, ease: "easeOut" } },
  };

  const lightVariants = {
    idle: { opacity: 0.8, filter: 'brightness(0.7)' },
    on: { opacity: 1, filter: 'brightness(1.2)' },
    flicker: {
      opacity: [1, 0.7, 1],
      filter: ['brightness(1.5)', 'brightness(1.0)', 'brightness(1.5)'],
      transition: {
        duration: 0.3,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut"
      }
    }
  };
  const lightTransition = { duration: 0.2, ease: "easeInOut" };

  const renderView = () => {
    if (view === "historial") {
      return (
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            marginTop: 16,
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>📜 Historial completo</h3>
          {history.length === 0 && <p>No hay partidas aún</p>}
          {history.map((h, i) => {
            const ganancia = h.totalWin;
            const perdida = Object.values(h.losses).reduce((a, b) => a + b, 0);
            const won = ganancia > 0;
            return (
              <div
                key={i}
                style={{
                  marginBottom: 8,
                  padding: 10,
                  borderRadius: 6,
                  background: won
                    ? "rgba(0,200,0,0.08)"
                    : "rgba(200,0,0,0.08)",
                  border: "1px solid #ddd",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 20,
                      height: 20,
                      background: h.landed.hex,
                      border: "1px solid #222",
                      marginRight: 8,
                    }}
                  />
                  <strong>{h.landed.name}</strong>
                  <span style={{ marginLeft: 8 }}>
                    {won
                      ? `✅ Ganaste ${ganancia.toFixed(0)} puntos`
                      : `❌ Perdiste ${perdida.toFixed(0)} puntos`}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                  Apuesta: {h.bets.rojo.toFixed(0)}R, {h.bets.azul.toFixed(0)}A, {h.bets.blanco.toFixed(0)}B
                </div>
                <small style={{ color: "#555" }}>
                  {h.fecha} - {h.hora}
                </small>
              </div>
            );
          })}
          <button
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 6,
              background: "#eee",
            }}
            onClick={() => setView("game")}
          >
            🔙 Volver al juego
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: "url(/assets/background.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <img
        src="/assets/logo.png"
        alt="logo"
        style={{ width: "90%", maxWidth: 350, marginTop: 8 }}
      />

      {!isVerified ? (
        <div style={{ padding: '20px', textAlign: 'center', marginTop: 50, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
          <h2 style={{ color: '#fff', fontSize: '24px' }}>¡Bienvenido! 👋</h2>
          <p style={{ color: '#ddd', marginBottom: '20px' }}>Para empezar a jugar, conéctate con World ID.</p>
          <IDKitWidget
            app_id="app_staging_040375f564177d0137cfac4a180f1464"
            action="my_action"
            handleVerify={async (result) => {
              try {
                const response = await fetch(`${API_URL}/verify`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(result),
                });
                if (response.ok) {
                  const data = await response.json();
                  console.log("Verificación exitosa en el backend:", data);
                  setIsVerified(true);
                  alert("¡Verificación de World ID exitosa! Ya puedes jugar.");
                } else {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || "Verificación fallida");
                }
              } catch (error) {
                console.error("Error durante la verificación:", error);
                alert(`Error en la verificación: ${error.message}`);
              }
            }}
          >
            {({ open }) => (
              <button
                onClick={open}
                style={{
                  padding: '12px 24px',
                  background: '#1c74d6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                Verificar con World ID
              </button>
            )}
          </IDKitWidget>
        </div>
      ) : (
        <>
          {view === "game" && (
            <>
              <div
                style={{
                  position: "relative",
                  marginTop: 20,
                  width: "90%",
                  maxWidth: 400,
                }}
              >
                <motion.div
                  animate={{ rotate: rotation }}
                  transition={{ duration: SPIN_DUR / 1000, ease: "easeOut" }}
                  style={{ width: "100%", aspectRatio: "1" }}
                >
                  <canvas
                    ref={canvasRef}
                    width={radius * 2}
                    height={radius * 2}
                    style={{ width: "100%", height: "100%" }}
                  />
                </motion.div>
                <motion.img
                  id="rouletteLights"
                  src="/assets/roulette_lights_only.png"
                  alt="Luces de Ruleta"
                  variants={lightVariants}
                  animate={lightAnimationState}
                  transition={lightTransition}
                  initial="idle"
                  style={{
                    position: "absolute",
                    top: -20,
                    left: -23,
                    width: "111%",
                    height: "111%",
                    pointerEvents: "none",
                    zIndex: 15,
                  }}
                />
                <img
                  src="/assets/flecha.png"
                  alt="flecha"
                  style={{
                    position: "absolute",
                    top: 35,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "60px",
                    height: "auto",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                />
                <motion.img
                  src="/assets/plane.png"
                  variants={planeVariants}
                  animate={planeAction}
                  initial="idle"
                  style={{
                    position: "absolute",
                    left: "37.4%",
                    top: 1,
                    transform: "translateX(-50%)",
                    width: "25%",
                    maxWidth: 120,
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
                <button
                  onClick={spin}
                  disabled={spinning || isRoundActive}
                  style={{
                    position: "absolute",
                    top: "50.5%",
                    left: "49.8%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "12px 30px",
                    background: "#ffd54f",
                    borderRadius: "50%",
                    height: "110px",
                    width: "110px",
                    fontWeight: "bold",
                    fontSize: 18,
                    border: "none",
                    cursor: "pointer",
                    zIndex: 20,
                  }}
                >
                  {spinning ? "Girando..." : "Apostar"}
                </button>
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                {[10, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setChipValue(val)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: chipValue === val ? "#ffd54f" : "#eee",
                      fontWeight: chipValue === val ? "bold" : "normal",
                    }}
                  >
                    {val} Pts
                  </button>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <motion.button
                  onClick={() => addBet("rojo")}
                  whileTap={{ scale: 0.9, y: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                  disabled={spinning}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "linear-gradient(#ff3b30, #cc0000)",
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    border: "none",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  <span>ROJO</span>
                  <span>x1.5</span>
                  <small>({bets.rojo.toFixed(0)})</small>
                </motion.button>
                <motion.button
                  onClick={() => addBet("azul")}
                  whileTap={{ scale: 0.9, y: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                  disabled={spinning}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "linear-gradient(#0066ff, #0033cc)",
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    border: "none",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  <span>AZUL</span>
                  <span>x2</span>
                  <small>({bets.azul.toFixed(0)})</small>
                </motion.button>
                <motion.button
                  onClick={() => addBet("blanco")}
                  whileTap={{ scale: 0.9, y: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                  disabled={spinning}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "linear-gradient(#ffffff, #e0e0e0)",
                    color: "#111",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    border: "1px solid #ccc",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  <span>BLANCO</span>
                  <span>x3</span>
                  <small>({bets.blanco.toFixed(0)})</small>
                </motion.button>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <motion.button
                  onClick={repeatBet}
                  whileTap={{ scale: 0.9, y: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                  disabled={spinning}
                  style={{ padding: "8px 14px", borderRadius: 8 }}
                >
                  🔄 Repetir
                </motion.button>
                <motion.button
                  onClick={doubleBet}
                  whileTap={{ scale: 0.9, y: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                  disabled={spinning}
                  style={{ padding: "8px 14px", borderRadius: 8 }}
                >
                  ✖2 Doblar
                </motion.button>
                <motion.button
                  onClick={clearBets}
                  whileTap={{ scale: 0.9, y: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                  disabled={spinning}
                  style={{ padding: "8px 14px", borderRadius: 8 }}
                >
                  Cero Apuestas
                </motion.button>
              </div>
              <div style={{ marginTop: 12, fontSize: 14, color: "#ddd" }}>
                Saldo jugador: {playerBalance.toFixed(0)} puntos
              </div>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {history.length === 0 && (
                  <p style={{ color: "#eee" }}>Aún no hay resultados</p>
                )}
                {!isRoundActive &&
                  history.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => setView("historial")}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: h.landed.hex,
                        border: "2px solid #222",
                        cursor: "pointer",
                      }}
                    />
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