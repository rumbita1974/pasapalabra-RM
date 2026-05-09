import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import levenshtein from "fast-levenshtein";
import { ROSCO_DB } from "../data/rosco-rm";

/* =========================
   CONFIG
========================= */

const ALPHABET = "ABCDEFGHIJLMNÑOPQRSTUVXYZ".split("");
const TOTAL_LETTERS = 25;
const QUESTION_TIME = 30;
const VERSION = "1.0.0";

/* =========================
   HELPERS
========================= */

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRosco() {
  const db = [...ROSCO_DB];
  const grouped = Object.fromEntries(ALPHABET.map((l) => [l, []]));
  
  db.forEach((item) => {
    if (item && item.letter) {
      const letter = item.letter.toUpperCase();
      if (grouped[letter]) {
        grouped[letter].push(item);
      }
    }
  });
  
  const rosco = [];
  
  ALPHABET.forEach((letter) => {
    const pool = grouped[letter] || [];
    let selectedItem = null;
    
    if (pool.length > 0) {
      selectedItem = shuffle(pool)[0];
    }
    
    if (!selectedItem) {
      const fallbackWords = {
        A: { answer: "amigo", clue: "Con la A: Persona con la que hay amistad." },
        B: { answer: "barco", clue: "Con la B: Vehículo que navega." },
        C: { answer: "casa", clue: "Con la C: Lugar donde se habita." },
        D: { answer: "dado", clue: "Con la D: Cubo con números." },
        E: { answer: "elefante", clue: "Con la E: Animal terrestre grande." },
        F: { answer: "fuego", clue: "Con la F: Calor de combustión." },
        G: { answer: "gato", clue: "Con la G: Animal doméstico." },
        H: { answer: "hielo", clue: "Con la H: Agua sólida." },
        I: { answer: "isla", clue: "Con la I: Tierra rodeada de agua." },
        J: { answer: "juego", clue: "Con la J: Actividad divertida." },
        L: { answer: "luna", clue: "Con la L: Satélite terrestre." },
        M: { answer: "mano", clue: "Con la M: Extremidad." },
        N: { answer: "nube", clue: "Con la N: Masa de vapor." },
        Ñ: { answer: "ñoño", clue: "Con la Ñ: Persona ingenua." },
        O: { answer: "ojo", clue: "Con la O: Órgano visual." },
        P: { answer: "perro", clue: "Con la P: Animal doméstico." },
        Q: { answer: "queso", clue: "Con la Q: Derivado lácteo." },
        R: { answer: "ratón", clue: "Con la R: Roedor." },
        S: { answer: "sol", clue: "Con la S: Estrella." },
        T: { answer: "tigre", clue: "Con la T: Felino." },
        U: { answer: "uva", clue: "Con la U: Fruta." },
        V: { answer: "vaca", clue: "Con la V: Animal lechero." },
        X: { answer: "xilófono", clue: "Con la X: Instrumento musical." },
        Y: { answer: "yate", clue: "Con la Y: Barco de lujo." },
        Z: { answer: "zapato", clue: "Con la Z: Calzado." }
      };
      selectedItem = fallbackWords[letter];
    }
    
    rosco.push({
      letter,
      answer: selectedItem.answer.toLowerCase(),
      question: selectedItem.clue,
      status: "pending",
      passed: false
    });
  });
  
  return rosco;
}

/* =========================
   CIRCULAR ROSCO COMPONENT
========================= */

function CircularRosco({ letters, currentLetter, onLetterClick, time }) {
  const size = 300;
  const center = size / 2;
  const radius = 130;
  const buttonRadius = 24;
  const fontSize = 13;
  
  const getAngle = (index) => {
    return (index * 360 / letters.length) - 90;
  };
  
  const getButtonColor = (item) => {
    if (item.passed) return "#FFC107";
    switch(item.status) {
      case 'correct': return '#4CAF50';
      case 'wrong': return '#f44336';
      default: return '#e0e0e0';
    }
  };
  
  const getTextColor = (item) => {
    if (item.passed) return "#333";
    return item.status === 'pending' ? '#333' : '#fff';
  };
  
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", margin: "10px 0" }}>
      <svg width={size} height={size} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
        <circle cx={center} cy={center} r={radius} fill="#f5f5f5" stroke="#ccc" strokeWidth="2"/>
        
        <circle cx={center} cy={center} r={38} fill="white" stroke="#2196F3" strokeWidth="3"/>
        <text x={center} y={center - 3} textAnchor="middle" dominantBaseline="middle" fill={time <= 10 ? "#f44336" : "#2196F3"} fontSize={24} fontWeight="bold">{time}</text>
        <text x={center} y={center + 16} textAnchor="middle" dominantBaseline="middle" fill="#666" fontSize={9}>seg</text>
        
        {letters.map((item, index) => {
          const angle = getAngle(index);
          const radian = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(radian);
          const y = center + radius * Math.sin(radian);
          const isCurrent = item.letter === currentLetter && item.status === "pending" && !item.passed;
          
          return (
            <g key={item.letter}>
              <circle 
                cx={x} 
                cy={y} 
                r={buttonRadius} 
                fill={getButtonColor(item)} 
                stroke={isCurrent ? "#FF9800" : "#999"} 
                strokeWidth={isCurrent ? 3 : 1.5}
                onClick={() => (item.status === "pending" && !item.passed) && onLetterClick(item.letter)}
                style={{ cursor: (item.status === "pending" && !item.passed) ? "pointer" : "not-allowed", transition: "all 0.2s" }}
              />
              <text 
                x={x} 
                y={y} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill={getTextColor(item)} 
                fontSize={fontSize} 
                fontWeight="bold"
                style={{ cursor: (item.status === "pending" && !item.passed) ? "pointer" : "not-allowed", userSelect: "none" }}
                onClick={() => (item.status === "pending" && !item.passed) && onLetterClick(item.letter)}
              >
                {item.letter}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */

export default function Game() {
  const [setup, setSetup] = useState(true);
  const [input, setInput] = useState("");
  const [time, setTime] = useState(QUESTION_TIME);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [game, setGame] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [showVersion, setShowVersion] = useState(true);
  
  const correctSound = useRef(null);
  const wrongSound = useRef(null);
  const welcomeSound = useRef(null);
  const timerInterval = useRef(null);
  const messageTimeout = useRef(null);

  const clearCacheAndReload = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    correctSound.current = new Audio("/correct.mp3");
    wrongSound.current = new Audio("/wrong.mp3");
    welcomeSound.current = new Audio("/welcome.mp3");
    if (correctSound.current) correctSound.current.volume = 1.0;
    if (wrongSound.current) wrongSound.current.volume = 1.0;
    if (welcomeSound.current) welcomeSound.current.volume = 1.0;
    setTimeout(() => setShowVersion(false), 5000);
  }, []);

  useEffect(() => {
    if (setup || !game || gameFinished || showAnswer) return;
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerInterval.current);
          handleTimeout();
          return QUESTION_TIME;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [setup, game, gameFinished, showAnswer]);

  const showMessage = (text, type, duration = 3000) => {
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    setMessage({ text, type });
    messageTimeout.current = setTimeout(() => setMessage({ text: "", type: "" }), duration);
  };

  const startGame = () => {
    welcomeSound.current?.play();
    setGame({
      round: 1,
      rosco: buildRosco(),
      currentIndex: 0,
      score: 0,
      completed: false
    });
    setSetup(false);
    setGameFinished(false);
    setTime(QUESTION_TIME);
    setInput("");
    showMessage("¡Comienza el juego! Letra A", "info", 2000);
    setShowAnswer(false);
  };

  const getNextPendingIndex = (rosco, currentIdx) => {
    for (let i = currentIdx + 1; i < rosco.length; i++) {
      if (rosco[i].status === "pending" && !rosco[i].passed) return i;
    }
    for (let i = 0; i < currentIdx; i++) {
      if (rosco[i].status === "pending" && !rosco[i].passed) return i;
    }
    return -1;
  };

  const getFirstPendingIndex = (rosco) => {
    for (let i = 0; i < rosco.length; i++) {
      if (rosco[i].status === "pending" && !rosco[i].passed) return i;
    }
    return -1;
  };

  const hasPassedLetters = (rosco) => rosco.some(item => item.passed === true && item.status === "pending");

  const handleTimeout = () => {
    if (!game || gameFinished) return;
    const item = game.rosco[game.currentIndex];
    if (!item || item.status !== "pending") return;
    
    const newRosco = [...game.rosco];
    newRosco[game.currentIndex] = { ...item, status: "wrong", passed: false };
    const nextIdx = getNextPendingIndex(newRosco, game.currentIndex);
    const completed = nextIdx === -1 && !hasPassedLetters(newRosco);
    
    setGame(prev => ({
      ...prev,
      rosco: newRosco,
      currentIndex: nextIdx !== -1 ? nextIdx : prev.currentIndex,
      completed: completed || prev.completed
    }));
    
    showMessage(`⏰ Tiempo! Respuesta: ${item.answer.toUpperCase()}`, "error", 3000);
    wrongSound.current?.play();
    
    setTimeout(() => setShowAnswer(false), 3000);
    setInput("");
    setTime(QUESTION_TIME);
    if (completed) {
      setTimeout(() => setGameFinished(true), 2000);
    }
  };

  const handleCorrectAnswer = () => {
    if (!game || gameFinished) return;
    const item = game.rosco[game.currentIndex];
    if (!item || item.status !== "pending") return;
    
    const newRosco = [...game.rosco];
    newRosco[game.currentIndex] = { ...item, status: "correct", passed: false };
    const nextIdx = getNextPendingIndex(newRosco, game.currentIndex);
    
    if (nextIdx === -1 && hasPassedLetters(newRosco)) {
      const secondRosco = newRosco.map(i => i.passed ? { ...i, passed: false } : i);
      setGame(prev => ({
        ...prev,
        rosco: secondRosco,
        currentIndex: getFirstPendingIndex(secondRosco),
        score: prev.score + 1
      }));
      showMessage(`🔄 ¡Segunda ronda! Letras pasadas`, "info", 3000);
    } else if (nextIdx === -1) {
      setGame(prev => ({
        ...prev,
        rosco: newRosco,
        score: prev.score + 1,
        completed: true
      }));
      showMessage(`🎉 ¡Completaste el ROSCO! 🎉`, "success", 3000);
      setTimeout(() => setGameFinished(true), 2000);
    } else {
      setGame(prev => ({
        ...prev,
        rosco: newRosco,
        currentIndex: nextIdx,
        score: prev.score + 1
      }));
      showMessage(`✅ ¡Correcto! Letra ${newRosco[nextIdx].letter}`, "success", 1500);
    }
    
    correctSound.current?.play();
    setInput("");
    setTime(QUESTION_TIME);
  };

  const handleWrongAnswer = () => {
    if (!game || gameFinished) return;
    const item = game.rosco[game.currentIndex];
    if (!item || item.status !== "pending") return;
    
    const newRosco = [...game.rosco];
    newRosco[game.currentIndex] = { ...item, status: "wrong", passed: false };
    const nextIdx = getNextPendingIndex(newRosco, game.currentIndex);
    
    if (nextIdx === -1 && hasPassedLetters(newRosco)) {
      const secondRosco = newRosco.map(i => i.passed ? { ...i, passed: false } : i);
      setGame(prev => ({
        ...prev,
        rosco: secondRosco,
        currentIndex: getFirstPendingIndex(secondRosco)
      }));
      showMessage(`🔄 ¡Segunda ronda! Letras pasadas`, "info", 3000);
    } else if (nextIdx === -1) {
      setGame(prev => ({
        ...prev,
        rosco: newRosco,
        completed: true
      }));
      showMessage(`📌 Completaste el rosco`, "info", 3000);
      setTimeout(() => setGameFinished(true), 2000);
    } else {
      setGame(prev => ({
        ...prev,
        rosco: newRosco,
        currentIndex: nextIdx
      }));
    }
    
    showMessage(`❌ Incorrecto. Respuesta: ${item.answer.toUpperCase()}`, "error", 3000);
    wrongSound.current?.play();
    
    setTimeout(() => setShowAnswer(false), 3000);
    setInput("");
    setTime(QUESTION_TIME);
  };

  const handlePasapalabra = () => {
    if (!game || gameFinished || showAnswer) return;
    const item = game.rosco[game.currentIndex];
    if (!item || item.status !== "pending") {
      showMessage("⚠️ Esta letra ya fue respondida", "error", 1500);
      return;
    }
    
    const newRosco = [...game.rosco];
    newRosco[game.currentIndex] = { ...item, passed: true };
    
    let nextIndex = -1;
    for (let i = game.currentIndex + 1; i < newRosco.length; i++) {
      if (newRosco[i].status === "pending" && !newRosco[i].passed) {
        nextIndex = i;
        break;
      }
    }
    if (nextIndex === -1) {
      for (let i = 0; i < game.currentIndex; i++) {
        if (newRosco[i].status === "pending" && !newRosco[i].passed) {
          nextIndex = i;
          break;
        }
      }
    }
    
    setGame(prev => ({
      ...prev,
      rosco: newRosco,
      currentIndex: nextIndex !== -1 ? nextIndex : prev.currentIndex
    }));
    
    showMessage(`⏭️ PASAPALABRA! Siguiente letra`, "info", 2000);
    setTime(QUESTION_TIME);
    setInput("");
  };

  const answer = () => {
    if (!game || gameFinished || showAnswer) return;
    if (!input.trim()) {
      showMessage("✏️ Escribe una respuesta", "error", 1500);
      return;
    }
    const item = game.rosco[game.currentIndex];
    if (!item || item.status !== "pending" || item.passed) {
      showMessage("⚠️ Esta letra no está disponible", "error", 1500);
      return;
    }
    const isCorrect = levenshtein.get(input.toLowerCase(), item.answer.toLowerCase()) <= 2;
    if (isCorrect) handleCorrectAnswer();
    else handleWrongAnswer();
  };

  const jumpToLetter = (letter) => {
    if (!game || gameFinished || showAnswer) return;
    const idx = game.rosco.findIndex(i => i.letter === letter);
    if (idx !== -1 && game.rosco[idx].status === "pending" && !game.rosco[idx].passed) {
      setGame(prev => ({ ...prev, currentIndex: idx }));
      setTime(QUESTION_TIME);
      setInput("");
      showMessage(`Saltaste a la letra ${letter}`, "info", 1000);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Enter" && !setup && game && !gameFinished && !showAnswer) answer(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Setup Screen
  if (setup) {
    return (
      <>
        <Head>
          <title>Pasapalabra Real Madrid 2025-2026 Edition</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
          <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
          <meta httpEquiv="Pragma" content="no-cache" />
          <meta httpEquiv="Expires" content="0" />
        </Head>
        <div style={{ textAlign: "center", padding: "20px", fontFamily: "system-ui", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ backgroundColor: "#4CAF50", color: "white", padding: "8px", borderRadius: "8px", marginBottom: "15px", fontSize: "12px" }}>
            ✅ Versión {VERSION}
          </div>
          <button onClick={clearCacheAndReload} style={{ marginBottom: "20px", padding: "10px 20px", fontSize: "14px", backgroundColor: "#FF9800", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            🗑️ Clear Cache & Force Reload
          </button>
          <h1 style={{ fontSize: "clamp(32px, 8vw, 48px)" }}>🎙️ Pasapalabra</h1>
          <h2 style={{ fontSize: "clamp(24px, 6vw, 36px)", color: "#4CAF50", marginBottom: "30px" }}>Real Madrid 2025-2026 Edition 🏆</h2>
          
          <button onClick={startGame} style={{ padding: "15px 30px", fontSize: "18px", cursor: "pointer", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" }}>🎮 Empezar Partida</button>
          
          <div style={{ textAlign: "left", backgroundColor: "#f5f5f5", padding: "20px", borderRadius: "15px", marginTop: "30px" }}>
            <h3>📖 Reglas:</h3>
            <ul style={{ lineHeight: 1.8 }}>
              <li>📌 Rosco de 25 letras</li>
              <li>✅ Acierto: suma punto y continúa</li>
              <li>❌ Fallo/tiempo: NO suma punto, pasa a la siguiente letra</li>
              <li>⏭️ PASAPALABRA: pasa letra a 2da ronda</li>
              <li>🔄 2da ronda: SOLO letras pasadas se intentan</li>
              <li>🏆 Completa todo el rosco para ganar</li>
              <li>⏱️ 30 segundos por pregunta</li>
            </ul>
          </div>
          
          <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "10px" }}>
            <p style={{ fontSize: "14px", fontWeight: "bold" }}>Designed by Armando Guillen - Copyright 2026</p>
            <p style={{ fontSize: "12px" }}>¡Hala Madrid! 🤍</p>
          </div>
        </div>
      </>
    );
  }

  // Game Finished Screen
  if (gameFinished && game) {
    const correctCount = game.rosco.filter(r => r.status === "correct").length;
    const wrongCount = game.rosco.filter(r => r.status === "wrong").length;
    const passedCount = game.rosco.filter(r => r.passed).length;
    const score = correctCount;
    
    return (
      <>
        <Head>
          <title>Resultados</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        </Head>
        <div style={{ fontFamily: "system-ui", padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
          <h1 style={{ textAlign: "center" }}>🏆 RESULTADOS FINALES 🏆</h1>
          <h2 style={{ textAlign: "center", color: "#2196F3" }}>🎉 ¡Felicidades! 🎉</h2>
          
          <div style={{ overflowX: "auto", marginBottom: "30px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>✅ Correctas</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>❌ Incorrectas</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>⏭️ Pasadas</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>⭐ Puntuación</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "12px", textAlign: "center", color: "#4CAF50", fontWeight: "bold", fontSize: "24px" }}>{correctCount} / {TOTAL_LETTERS}</td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#f44336", fontSize: "24px" }}>{wrongCount}</td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#FFC107", fontSize: "24px" }}>{passedCount}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: "28px", fontWeight: "bold", color: "#2196F3" }}>{score}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style={{ backgroundColor: "#f5f5f5", padding: "20px", borderRadius: "10px", margin: "30px 0" }}>
            <h3>📋 Resumen del Juego:</h3>
            <p>🎯 Has acertado {correctCount} de {TOTAL_LETTERS} letras</p>
            <p>📝 Tienes {wrongCount} fallos y {passedCount} letras pasadas</p>
            <p>⏱️ Tiempo máximo por pregunta: 30 segundos</p>
            <p>🏆 ¡Gracias por jugar! ¡Hala Madrid!</p>
          </div>
          
          <button onClick={() => { setSetup(true); setGame(null); setGameFinished(false); }} style={{ width: "100%", padding: "15px", fontSize: "18px", cursor: "pointer", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" }}>🔄 Jugar de Nuevo</button>
          
          <div style={{ marginTop: "30px", padding: "15px", textAlign: "center" }}>
            <button onClick={clearCacheAndReload} style={{ padding: "8px 16px", fontSize: "12px", backgroundColor: "#666", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>🗑️ Clear Cache & Reload</button>
          </div>
          
          <div style={{ marginTop: "20px", padding: "15px", textAlign: "center", fontSize: "11px", color: "#666" }}>
            <p>Designed by Armando Guillen - Copyright 2026</p>
            <p>(no association with Pasapalabra by ITV Studios Iberia or The Alphabet Game)</p>
          </div>
        </div>
      </>
    );
  }

  const currentItem = game.rosco[game.currentIndex];
  const pendingCount = game.rosco.filter(r => r.status === "pending" && !r.passed).length;
  const passedCount = game.rosco.filter(r => r.passed).length;

  return (
    <>
      <Head>
        <title>Pasapalabra - Real Madrid Edition</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>
      <div style={{ fontFamily: "system-ui", padding: "8px", maxWidth: "500px", margin: "0 auto" }}>
        {showVersion && (
          <div style={{ backgroundColor: "#4CAF50", color: "white", padding: "3px 6px", borderRadius: "4px", marginBottom: "6px", textAlign: "center", fontSize: "8px" }}>
            ✅ Versión {VERSION} | {game.round === 1 ? `${pendingCount + passedCount} letras restantes` : "Segunda ronda"}
          </div>
        )}
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "5px", borderRadius: "8px", backgroundColor: "#E3F2FD", border: "2px solid #2196F3" }}>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>🏆 PUNTUACIÓN</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2196F3" }}>{game.score}</div>
            <div style={{ fontSize: "8px" }}>✅ {game.rosco.filter(r => r.status === "correct").length} / {TOTAL_LETTERS}</div>
          </div>
          
          <div style={{ flex: 1, textAlign: "center", padding: "3px" }}>
            <div style={{ fontSize: "10px", color: "#666" }}>Ronda {game.round}</div>
          </div>
          
          <div style={{ flex: 1, textAlign: "center", padding: "5px", borderRadius: "8px", backgroundColor: "#FFF3E0" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px" }}>📊 ESTADÍSTICAS</div>
            <div style={{ fontSize: "11px" }}>❌ {game.rosco.filter(r => r.status === "wrong").length} fallos</div>
            <div style={{ fontSize: "11px" }}>⏭️ {game.rosco.filter(r => r.passed).length} pasadas</div>
          </div>
        </div>

        <CircularRosco letters={game.rosco} currentLetter={currentItem.letter} onLetterClick={jumpToLetter} time={time} />

        <div style={{ borderRadius: "10px", padding: "10px", marginBottom: "10px", textAlign: "center", backgroundColor: "#f5f5f5", border: "1px solid #ddd" }}>
          <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>Letra {currentItem.letter} | {game.round === 1 ? `${pendingCount + passedCount} restantes, ${passedCount} pasadas` : `${pendingCount} letra(s) pendiente(s)`}</div>
          <div style={{ fontSize: "14px", fontWeight: "bold", lineHeight: 1.3 }}>{currentItem.question}</div>
        </div>

        {!showAnswer && currentItem.status === "pending" && !currentItem.passed && (
          <div style={{ marginBottom: "10px" }}>
            <input 
              style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px", border: "2px solid #ccc", outline: "none", boxSizing: "border-box", marginBottom: "6px" }} 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Escribe tu respuesta..." 
              autoFocus 
            />
            <div style={{ display: "flex", gap: "6px", flexDirection: "row" }}>
              <button onClick={answer} style={{ flex: 1, padding: "10px", fontSize: "13px", fontWeight: "bold", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>📝 Responder</button>
              <button onClick={handlePasapalabra} style={{ flex: 1, padding: "10px", fontSize: "13px", fontWeight: "bold", backgroundColor: "#FFC107", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer" }}>⏭️ PASAPALABRA</button>
            </div>
          </div>
        )}

        {message.text && (
          <div style={{ marginBottom: "8px", padding: "6px", borderRadius: "6px", textAlign: "center", fontWeight: "bold", fontSize: "10px", backgroundColor: message.type === "success" ? "#C8E6C9" : message.type === "error" ? "#FFCDD2" : "#BBDEFB" }}>
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: "6px", fontSize: "7px", borderTop: "1px solid #ddd", paddingTop: "6px", flexWrap: "wrap" }}>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "50%", marginRight: "2px" }}></span> Sin responder</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#4CAF50", borderRadius: "50%", marginRight: "2px" }}></span> Correcto</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#f44336", borderRadius: "50%", marginRight: "2px" }}></span> Incorrecto</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#FFC107", borderRadius: "50%", marginRight: "2px" }}></span> Pasapalabra</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "50%", marginRight: "2px", border: "2px solid #FF9800" }}></span> Actual</div>
        </div>
        
        <div style={{ textAlign: "center", marginTop: "6px" }}>
          <button onClick={clearCacheAndReload} style={{ padding: "2px 6px", fontSize: "7px", backgroundColor: "#999", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>🗑️ Force Reload</button>
        </div>
      </div>
    </>
  );
}