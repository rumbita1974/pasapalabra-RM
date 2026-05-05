import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import levenshtein from "fast-levenshtein";
import { ROSCO_DB } from "../data/rosco-db";

/* =========================
   CONFIG
========================= */

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const QUESTION_TIME = 30;
const VERSION = "2.0.6";

// Difficulty levels for Venezuelan slang
const DIFFICULTY_SETTINGS = {
  easy: { minSlang: 2, maxSlang: 3 },
  medium: { minSlang: 6, maxSlang: 8 },
  hard: { minSlang: 10, maxSlang: 12 }
};

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

function isVenezuelanSlang(item) {
  return item.clue && item.clue.includes("En Venezuela");
}

function buildRosco(difficulty, seedOffset = 0) {
  const db = [...ROSCO_DB];
  
  const regularWords = db.filter(item => !isVenezuelanSlang(item));
  const slangs = db.filter(item => isVenezuelanSlang(item));
  
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const slangCount = settings.minSlang + Math.floor(Math.random() * (settings.maxSlang - settings.minSlang + 1));
  const selectedSlangs = shuffle(slangs).slice(0, Math.min(slangCount, slangs.length));
  
  const grouped = Object.fromEntries(ALPHABET.map((l) => [l, []]));
  
  regularWords.forEach((item) => {
    if (!item || !item.letter) return;
    if (!item.answer || !item.clue) return;
    const letter = item.letter.toUpperCase();
    if (grouped[letter]) {
      grouped[letter].push(item);
    }
  });
  
  const slangByLetter = {};
  selectedSlangs.forEach(slang => {
    const letter = slang.letter.toUpperCase();
    if (!slangByLetter[letter]) slangByLetter[letter] = [];
    slangByLetter[letter].push(slang);
  });
  
  const rosco = [];
  
  ALPHABET.forEach((letter) => {
    const slangForLetter = slangByLetter[letter];
    let selectedItem = null;
    
    if (slangForLetter && slangForLetter.length > 0) {
      selectedItem = slangForLetter[0];
      delete slangByLetter[letter];
    } else {
      const pool = grouped[letter] || [];
      if (pool.length > 0) {
        const shuffled = shuffle(pool);
        selectedItem = shuffled[0];
      }
    }
    
    if (!selectedItem) {
      const defaultWords = {
        A: "amigo", B: "barco", C: "casa", D: "dado", E: "elefante",
        F: "fuego", G: "gato", H: "hielo", I: "isla", J: "juego",
        K: "kilo", L: "luna", M: "mano", N: "nube", Ñ: "ñoño",
        O: "ojo", P: "perro", Q: "queso", R: "ratón", S: "sol",
        T: "tigre", U: "uva", V: "vaca", W: "web", X: "xilófono",
        Y: "yate", Z: "zapato"
      };
      rosco.push({
        letter,
        answer: defaultWords[letter],
        question: `Con la ${letter}: Palabra que empieza con ${letter}.`,
        status: "pending",
        isSlang: false,
        passed: false
      });
      return;
    }
    
    rosco.push({
      letter,
      answer: (selectedItem.answer || "skip").toLowerCase(),
      question: selectedItem.clue || `Con la ${letter}`,
      status: "pending",
      isSlang: isVenezuelanSlang(selectedItem),
      passed: false
    });
  });
  
  return rosco;
}

function getNextPendingIndex(rosco, currentIndex) {
  for (let i = currentIndex + 1; i < rosco.length; i++) {
    if (rosco[i].status === "pending") return i;
  }
  return -1;
}

function getFirstPendingIndex(rosco) {
  for (let i = 0; i < rosco.length; i++) {
    if (rosco[i].status === "pending") return i;
  }
  return -1;
}

function hasPassedLetters(rosco) {
  return rosco.some(item => item.passed === true);
}

function resetPassedLetters(rosco) {
  return rosco.map(item => {
    if (item.passed) {
      return { ...item, passed: false };
    }
    return item;
  });
}

/* =========================
   CIRCULAR ROSCO COMPONENT - SHIFTED LEFT & SMALLER
========================= */

function CircularRosco({ letters, currentLetter, onLetterClick, time }) {
  const size = 300;
  const center = size / 2;
  const radius = 130;
  const buttonRadius = 22;
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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", margin: "5px 0" }}>
      <svg width={size} height={size} style={{ display: "block", maxWidth: "100%", height: "auto", marginLeft: "-10px" }}>
        <circle cx={center} cy={center} r={radius} fill="#f5f5f5" stroke="#ccc" strokeWidth="2"/>
        
        {/* Timer centered in the middle */}
        <circle cx={center} cy={center} r={38} fill="white" stroke="#2196F3" strokeWidth="3"/>
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={time <= 10 ? "#f44336" : "#2196F3"}
          fontSize={24}
          fontWeight="bold"
        >
          {time}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#666"
          fontSize={9}
        >
          seg
        </text>
        
        {letters.map((item, index) => {
          const angle = getAngle(index);
          const radian = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(radian);
          const y = center + radius * Math.sin(radian);
          const isCurrent = item.letter === currentLetter;
          
          return (
            <g key={item.letter}>
              <circle
                cx={x}
                cy={y}
                r={buttonRadius}
                fill={getButtonColor(item)}
                stroke={isCurrent ? "#FF9800" : "#999"}
                strokeWidth={isCurrent ? 3 : 1.5}
                onClick={() => item.status === "pending" && !item.passed && onLetterClick(item.letter)}
                style={{ cursor: item.status === "pending" && !item.passed ? "pointer" : "not-allowed" }}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={getTextColor(item)}
                fontSize={fontSize}
                fontWeight="bold"
                style={{ cursor: item.status === "pending" && !item.passed ? "pointer" : "not-allowed", userSelect: "none" }}
                onClick={() => item.status === "pending" && !item.passed && onLetterClick(item.letter)}
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
  const [playersCount, setPlayersCount] = useState(1);
  const [difficulty, setDifficulty] = useState("easy");
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

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [setup, game, gameFinished, showAnswer, game?.currentPlayer]);

  const startGame = () => {
    welcomeSound.current?.play();

    const p1Rosco = buildRosco(difficulty, Math.random() * 1000);
    const p2Rosco = playersCount === 2 ? buildRosco(difficulty, Math.random() * 2000) : null;

    setGame({
      currentPlayer: 1,
      round: 1,
      players: {
        1: { 
          rosco: p1Rosco.map(item => ({ ...item, status: "pending", passed: false })), 
          currentIndex: 0,
          score: 0,
          completed: false
        },
        2: p2Rosco ? { 
          rosco: p2Rosco.map(item => ({ ...item, status: "pending", passed: false })), 
          currentIndex: 0,
          score: 0,
          completed: false
        } : null
      }
    });

    setSetup(false);
    setGameFinished(false);
    setTime(QUESTION_TIME);
    setInput("");
    setMessage({ text: "¡Comienza el Jugador 1! Letra A", type: "info" });
    setShowAnswer(false);
    
    setTimeout(() => setMessage({ text: "", type: "" }), 2000);
  };

  const handleTimeout = () => {
    if (!game || gameFinished) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") return;
    
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "wrong"
    };
    
    setShowAnswer(true);
    setMessage({ 
      text: `⏰ Tiempo! Respuesta: ${currentItem.answer.toUpperCase()}`, 
      type: "error" 
    });
    
    const nextIndex = getNextPendingIndex(updatedRosco, player.currentIndex);
    
    setGame(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [currentPlayer]: {
          ...player,
          rosco: updatedRosco,
          currentIndex: nextIndex !== -1 ? nextIndex : player.currentIndex
        }
      }
    }));
    
    wrongSound.current?.play();
    
    if (playersCount === 2 && !gameFinished) {
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      const nextPlayerData = game.players[nextPlayer];
      const nextPlayerIndex = getFirstPendingIndex(nextPlayerData.rosco);
      
      if (nextPlayerIndex !== -1) {
        setGame(prev => ({
          ...prev,
          currentPlayer: nextPlayer,
          players: {
            ...prev.players,
            [nextPlayer]: {
              ...nextPlayerData,
              currentIndex: nextPlayerIndex
            }
          }
        }));
      }
    }
    
    setTimeout(() => {
      setShowAnswer(false);
      setMessage({ text: "", type: "" });
    }, 2000);
    
    setInput("");
    setTime(QUESTION_TIME);
  };

  const handleCorrectAnswer = () => {
    if (!game || gameFinished) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") return;
    
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "correct",
      passed: false
    };
    
    const nextIndex = getNextPendingIndex(updatedRosco, player.currentIndex);
    
    if (nextIndex === -1) {
      if (hasPassedLetters(updatedRosco) && game.round === 1) {
        const resetRosco = resetPassedLetters(updatedRosco);
        const firstPending = getFirstPendingIndex(resetRosco);
        
        setGame(prev => ({
          ...prev,
          round: 2,
          players: {
            ...prev.players,
            [currentPlayer]: {
              ...player,
              rosco: resetRosco,
              currentIndex: firstPending !== -1 ? firstPending : 0,
              score: player.score + 1
            }
          }
        }));
        
        setMessage({ text: "🔄 ¡Segunda ronda! Letras pasadas", type: "info" });
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
      } else {
        setGame(prev => ({
          ...prev,
          players: {
            ...prev.players,
            [currentPlayer]: {
              ...player,
              rosco: updatedRosco,
              score: player.score + 1,
              completed: true
            }
          }
        }));
        
        setMessage({ text: `🎉 ¡Jugador ${currentPlayer} completó! 🎉`, type: "success" });
        
        const otherPlayer = currentPlayer === 1 ? 2 : 1;
        if (playersCount === 1 || game.players[otherPlayer]?.completed) {
          setTimeout(() => endGame(), 2000);
        } else {
          setTimeout(() => {
            const nextPlayerData = game.players[otherPlayer];
            const nextIdx = getFirstPendingIndex(nextPlayerData.rosco);
            setGame(prev => ({
              ...prev,
              currentPlayer: otherPlayer,
              players: {
                ...prev.players,
                [otherPlayer]: {
                  ...nextPlayerData,
                  currentIndex: nextIdx !== -1 ? nextIdx : 0
                }
              }
            }));
          }, 2000);
        }
      }
    } else {
      setGame(prev => ({
        ...prev,
        players: {
          ...prev.players,
          [currentPlayer]: {
            ...player,
            rosco: updatedRosco,
            currentIndex: nextIndex,
            score: player.score + 1
          }
        }
      }));
      
      setMessage({ text: `✅ ¡Correcto! Letra ${updatedRosco[nextIndex].letter}`, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
    }
    
    correctSound.current?.play();
    setInput("");
    setTime(QUESTION_TIME);
  };

  const handleWrongAnswer = () => {
    if (!game || gameFinished) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") return;
    
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "wrong"
    };
    
    setShowAnswer(true);
    setMessage({ 
      text: `❌ Respuesta: ${currentItem.answer.toUpperCase()}`, 
      type: "error" 
    });
    
    const nextIndex = getNextPendingIndex(updatedRosco, player.currentIndex);
    
    if (nextIndex === -1) {
      if (hasPassedLetters(updatedRosco) && game.round === 1) {
        const resetRosco = resetPassedLetters(updatedRosco);
        const firstPending = getFirstPendingIndex(resetRosco);
        
        setGame(prev => ({
          ...prev,
          round: 2,
          players: {
            ...prev.players,
            [currentPlayer]: {
              ...player,
              rosco: resetRosco,
              currentIndex: firstPending !== -1 ? firstPending : 0
            }
          }
        }));
        
        setMessage({ text: "🔄 ¡Segunda ronda!", type: "info" });
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
      } else {
        setGame(prev => ({
          ...prev,
          players: {
            ...prev.players,
            [currentPlayer]: {
              ...player,
              rosco: updatedRosco,
              completed: true
            }
          }
        }));
        
        const otherPlayer = currentPlayer === 1 ? 2 : 1;
        if (playersCount === 1 || game.players[otherPlayer]?.completed) {
          setTimeout(() => endGame(), 2000);
        } else {
          setTimeout(() => {
            const nextPlayerData = game.players[otherPlayer];
            const nextIdx = getFirstPendingIndex(nextPlayerData.rosco);
            setGame(prev => ({
              ...prev,
              currentPlayer: otherPlayer,
              players: {
                ...prev.players,
                [otherPlayer]: {
                  ...nextPlayerData,
                  currentIndex: nextIdx !== -1 ? nextIdx : 0
                }
              }
            }));
          }, 2000);
        }
      }
    } else {
      setGame(prev => ({
        ...prev,
        players: {
          ...prev.players,
          [currentPlayer]: {
            ...player,
            rosco: updatedRosco,
            currentIndex: nextIndex
          }
        }
      }));
      
      if (playersCount === 2) {
        const nextPlayer = currentPlayer === 1 ? 2 : 1;
        const nextPlayerData = game.players[nextPlayer];
        const nextPlayerIndex = getFirstPendingIndex(nextPlayerData.rosco);
        
        if (nextPlayerIndex !== -1) {
          setGame(prev => ({
            ...prev,
            currentPlayer: nextPlayer,
            players: {
              ...prev.players,
              [nextPlayer]: {
                ...nextPlayerData,
                currentIndex: nextPlayerIndex
              }
            }
          }));
        }
      }
    }
    
    wrongSound.current?.play();
    
    setTimeout(() => {
      setShowAnswer(false);
      setMessage({ text: "", type: "" });
    }, 2000);
    
    setInput("");
    setTime(QUESTION_TIME);
  };

  const handlePasapalabra = () => {
    if (!game || gameFinished || showAnswer) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") {
      setMessage({ text: "⚠️ Ya fue respondida", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
      return;
    }
    
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      passed: true
    };
    
    let nextIndex = -1;
    for (let i = player.currentIndex + 1; i < updatedRosco.length; i++) {
      if (updatedRosco[i].status === "pending" && !updatedRosco[i].passed) {
        nextIndex = i;
        break;
      }
    }
    if (nextIndex === -1) {
      for (let i = 0; i < player.currentIndex; i++) {
        if (updatedRosco[i].status === "pending" && !updatedRosco[i].passed) {
          nextIndex = i;
          break;
        }
      }
    }
    
    setGame(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [currentPlayer]: {
          ...player,
          rosco: updatedRosco,
          currentIndex: nextIndex !== -1 ? nextIndex : player.currentIndex
        }
      }
    }));
    
    if (playersCount === 2) {
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      const nextPlayerData = game.players[nextPlayer];
      const nextPlayerIndex = getFirstPendingIndex(nextPlayerData.rosco);
      
      if (nextPlayerIndex !== -1) {
        setGame(prev => ({
          ...prev,
          currentPlayer: nextPlayer,
          players: {
            ...prev.players,
            [nextPlayer]: {
              ...nextPlayerData,
              currentIndex: nextPlayerIndex
            }
          }
        }));
      }
    }
    
    setMessage({ text: `⏭️ PASAPALABRA! ${playersCount === 2 ? `Turno Jugador ${currentPlayer === 1 ? 2 : 1}` : "Siguiente letra"}`, type: "info" });
    setTimeout(() => setMessage({ text: "", type: "" }), 1500);
    
    setTime(QUESTION_TIME);
    setInput("");
  };

  const answer = () => {
    if (!game || gameFinished || showAnswer) return;
    if (!input.trim()) {
      setMessage({ text: "✏️ Escribe respuesta", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
      return;
    }

    const player = game.players[game.currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") {
      setMessage({ text: "⚠️ Ya fue respondida", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
      return;
    }

    const isCorrect = levenshtein.get(input.toLowerCase(), currentItem.answer.toLowerCase()) <= 2;
    
    if (isCorrect) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  const jumpToLetter = (letter) => {
    if (!game || gameFinished || showAnswer) return;
    
    const player = game.players[game.currentPlayer];
    const letterIndex = player.rosco.findIndex(item => item.letter === letter);
    
    if (letterIndex !== -1 && player.rosco[letterIndex].status === "pending" && !player.rosco[letterIndex].passed) {
      setGame(prev => ({
        ...prev,
        players: {
          ...prev.players,
          [prev.currentPlayer]: {
            ...player,
            currentIndex: letterIndex
          }
        }
      }));
      setTime(QUESTION_TIME);
      setInput("");
      setMessage({ text: `Letra ${letter}`, type: "info" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1000);
    }
  };

  const endGame = () => {
    if (!game) return;
    setGameFinished(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && !setup && game && !gameFinished && !showAnswer) {
        answer();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Setup Screen
  if (setup) {
    const slangInfo = {
      easy: "2-3 palabras venezolanas",
      medium: "6-8 palabras venezolanas",
      hard: "10-12 palabras venezolanas"
    };
    
    return (
      <>
        <Head>
          <title>Pasapalabra Venezuela</title>
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

          <h1 style={{ fontSize: "clamp(32px, 8vw, 48px)" }}>🎙️ Pasapalabra Venezuela 🎙️</h1>
          <p style={{ marginBottom: "30px", color: "#666" }}>¡Incluye palabras del argot venezolano!</p>

          <div style={{ marginBottom: "30px" }}>
            <h3>👥 Jugadores</h3>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setPlayersCount(1)} style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", border: "2px solid", borderRadius: "10px", backgroundColor: playersCount === 1 ? "#2196F3" : "#fff", color: playersCount === 1 ? "#fff" : "#333", borderColor: playersCount === 1 ? "#2196F3" : "#ccc" }}>1 jugador</button>
              <button onClick={() => setPlayersCount(2)} style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", border: "2px solid", borderRadius: "10px", backgroundColor: playersCount === 2 ? "#2196F3" : "#fff", color: playersCount === 2 ? "#fff" : "#333", borderColor: playersCount === 2 ? "#2196F3" : "#ccc" }}>2 jugadores</button>
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <h3>📚 Dificultad</h3>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setDifficulty("easy")} style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", border: "2px solid", borderRadius: "10px", backgroundColor: difficulty === "easy" ? "#4CAF50" : "#fff", color: difficulty === "easy" ? "#fff" : "#333", borderColor: difficulty === "easy" ? "#4CAF50" : "#ccc" }}>
                Fácil
                <div style={{ fontSize: "10px", marginTop: "2px" }}>({slangInfo.easy})</div>
              </button>
              <button onClick={() => setDifficulty("medium")} style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", border: "2px solid", borderRadius: "10px", backgroundColor: difficulty === "medium" ? "#FF9800" : "#fff", color: difficulty === "medium" ? "#fff" : "#333", borderColor: difficulty === "medium" ? "#FF9800" : "#ccc" }}>
                Medio
                <div style={{ fontSize: "10px", marginTop: "2px" }}>({slangInfo.medium})</div>
              </button>
              <button onClick={() => setDifficulty("hard")} style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", border: "2px solid", borderRadius: "10px", backgroundColor: difficulty === "hard" ? "#f44336" : "#fff", color: difficulty === "hard" ? "#fff" : "#333", borderColor: difficulty === "hard" ? "#f44336" : "#ccc" }}>
                Difícil
                <div style={{ fontSize: "10px", marginTop: "2px" }}>({slangInfo.hard})</div>
              </button>
            </div>
          </div>

          <button onClick={startGame} style={{ padding: "15px 30px", fontSize: "18px", cursor: "pointer", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" }}>🎮 Empezar Partida</button>
          
          <div style={{ textAlign: "left", backgroundColor: "#f5f5f5", padding: "20px", borderRadius: "15px", marginTop: "30px" }}>
            <h3>📖 Reglas:</h3>
            <ul style={{ lineHeight: 1.8 }}>
              <li>📌 Cada jugador tiene su propio rosco</li>
              <li>✅ Acierto: suma punto y continúa</li>
              <li>❌ Fallo/tiempo: NO suma punto, pasa turno (2P)</li>
              <li>⏭️ PASAPALABRA: pasa letra a 2da ronda</li>
              <li>🔄 2da ronda: letras pasadas se intentan</li>
              <li>🏆 Gana quien tenga más aciertos</li>
              <li>🇻🇪 Palabras venezolanas según dificultad</li>
              <li>⏱️ 30 segundos por pregunta</li>
            </ul>
          </div>

          <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "10px" }}>
            <p style={{ fontSize: "14px", fontWeight: "bold" }}>Designed by Armando Guillen - Copyright 2026</p>
            <p style={{ fontSize: "12px" }}>(no association with Pasapalabra by ITV Studios Iberia or The Alphabet Game)</p>
          </div>
        </div>
      </>
    );
  }

  // Game Finished Screen
  if (gameFinished && game) {
    const p1Correct = game.players[1].rosco.filter(r => r.status === "correct").length;
    const p1Wrong = game.players[1].rosco.filter(r => r.status === "wrong").length;
    const p1Passed = game.players[1].rosco.filter(r => r.passed).length;
    const p1Score = p1Correct;
    
    let p2Correct = 0, p2Wrong = 0, p2Passed = 0, p2Score = 0;
    let twoPlayer = false;
    
    if (game.players[2]) {
      twoPlayer = true;
      p2Correct = game.players[2].rosco.filter(r => r.status === "correct").length;
      p2Wrong = game.players[2].rosco.filter(r => r.status === "wrong").length;
      p2Passed = game.players[2].rosco.filter(r => r.passed).length;
      p2Score = p2Correct;
    }
    
    const winner = p1Score > p2Score ? 1 : (p2Score > p1Score ? 2 : 0);
    
    return (
      <>
        <Head>
          <title>Resultados</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
          <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
          <meta httpEquiv="Pragma" content="no-cache" />
          <meta httpEquiv="Expires" content="0" />
        </Head>
        <div style={{ fontFamily: "system-ui", padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
          <h1 style={{ textAlign: "center" }}>🏆 RESULTADOS FINALES 🏆</h1>
          {winner === 1 && <h2 style={{ textAlign: "center", color: "#2196F3" }}>🎉 ¡Jugador 1 GANA! 🎉</h2>}
          {winner === 2 && <h2 style={{ textAlign: "center", color: "#FF9800" }}>🎉 ¡Jugador 2 GANA! 🎉</h2>}
          {winner === 0 && <h2 style={{ textAlign: "center" }}>🤝 ¡EMPATE! 🤝</h2>}
          
          <div style={{ overflowX: "auto", marginBottom: "30px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>Jugador</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>✅ Correctas</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>❌ Incorrectas</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>⏭️ Pasadas</th>
                  <th style={{ padding: "12px", backgroundColor: "#2196F3", color: "white" }}>⭐ Puntuación</th>
                </tr>
              </thead>
              <tbody>
                <tr style={winner === 1 ? { backgroundColor: "#FFF9C4" } : {}}>
                  <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #ddd" }}><strong>Jugador 1</strong></td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#4CAF50", fontWeight: "bold" }}>{p1Correct}</td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#f44336" }}>{p1Wrong}</td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#FFC107" }}>{p1Passed}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>{p1Score}</td>
                </tr>
                {twoPlayer && (
                  <tr style={winner === 2 ? { backgroundColor: "#FFF9C4" } : {}}>
                    <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #ddd" }}><strong>Jugador 2</strong></td>
                    <td style={{ padding: "12px", textAlign: "center", color: "#4CAF50", fontWeight: "bold" }}>{p2Correct}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "#f44336" }}>{p2Wrong}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "#FFC107" }}>{p2Passed}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: "20px", fontWeight: "bold", color: "#FF9800" }}>{p2Score}</td>
                  </tr>
                )}
              </tbody>
            </table>
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

  const player = game.players[game.currentPlayer];
  const currentItem = player.rosco[player.currentIndex];
  const answeredCount = player.rosco.filter(r => r.status !== "pending").length;
  const remainingCount = 27 - answeredCount;
  const passedCount = player.rosco.filter(r => r.passed).length;
  const slangCount = player.rosco.filter(r => r.isSlang).length;

  return (
    <>
      <Head>
        <title>Pasapalabra - Jugador {game.currentPlayer}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>
      <div style={{ fontFamily: "system-ui", padding: "8px", maxWidth: "500px", margin: "0 auto" }}>
        
        {showVersion && (
          <div style={{ backgroundColor: "#4CAF50", color: "white", padding: "3px 6px", borderRadius: "4px", marginBottom: "6px", textAlign: "center", fontSize: "8px" }}>
            ✅ Versión {VERSION} | {slangCount} palabras venezolanas
          </div>
        )}
        
        {/* Player Score Cards */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "5px", borderRadius: "8px", backgroundColor: game.currentPlayer === 1 ? "#E3F2FD" : "#f5f5f5", border: game.currentPlayer === 1 ? "2px solid #2196F3" : "1px solid #ddd" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px" }}>Jugador 1</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>{game.players[1].score}</div>
            <div style={{ fontSize: "7px" }}>✅ {game.players[1].rosco.filter(r => r.status === "correct").length}  ❌ {game.players[1].rosco.filter(r => r.status === "wrong").length}  ⏭️ {game.players[1].rosco.filter(r => r.passed).length}</div>
          </div>
          
          <div style={{ flex: 1, textAlign: "center", padding: "3px" }}>
            <div style={{ fontSize: "10px", color: "#666" }}>Ronda {game.round}</div>
            <div style={{ fontSize: "10px", color: "#2196F3", fontWeight: "bold" }}>Turno J{game.currentPlayer}</div>
          </div>
          
          {game.players[2] && (
            <div style={{ flex: 1, textAlign: "center", padding: "5px", borderRadius: "8px", backgroundColor: game.currentPlayer === 2 ? "#FFF3E0" : "#f5f5f5", border: game.currentPlayer === 2 ? "2px solid #FF9800" : "1px solid #ddd" }}>
              <div style={{ fontWeight: "bold", fontSize: "11px" }}>Jugador 2</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#FF9800" }}>{game.players[2].score}</div>
              <div style={{ fontSize: "7px" }}>✅ {game.players[2].rosco.filter(r => r.status === "correct").length}  ❌ {game.players[2].rosco.filter(r => r.status === "wrong").length}  ⏭️ {game.players[2].rosco.filter(r => r.passed).length}</div>
            </div>
          )}
        </div>

        {/* Circular Rosco - Shifted left, smaller */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CircularRosco letters={player.rosco} currentLetter={currentItem.letter} onLetterClick={jumpToLetter} time={time} />
        </div>

        {/* Question Card */}
        <div style={{ borderRadius: "10px", padding: "10px", marginBottom: "10px", textAlign: "center", backgroundColor: currentItem.isSlang ? "#FFF3E0" : "#f5f5f5", border: currentItem.isSlang ? "2px solid #FF9800" : "1px solid #ddd" }}>
          {currentItem.isSlang && <div style={{ fontSize: "10px", color: "#FF9800", fontWeight: "bold", marginBottom: "3px" }}>🇻🇪 Palabra Venezolana 🇻🇪</div>}
          <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>Letra {currentItem.letter} | Restantes: {remainingCount} | Pasadas: {passedCount}</div>
          <div style={{ fontSize: "14px", fontWeight: "bold", lineHeight: 1.3 }}>{currentItem.question}</div>
        </div>

        {/* Input and Buttons */}
        {!showAnswer && (
          <div style={{ marginBottom: "10px" }}>
            <input
              style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px", border: "2px solid #ccc", outline: "none", boxSizing: "border-box", marginBottom: "6px" }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta..."
              autoFocus
            />
            <div style={{ display: "flex", gap: "6px", flexDirection: "row" }}>
              <button onClick={answer} style={{ flex: 1, padding: "10px", fontSize: "13px", fontWeight: "bold", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                📝 Responder
              </button>
              <button onClick={handlePasapalabra} style={{ flex: 1, padding: "10px", fontSize: "13px", fontWeight: "bold", backgroundColor: "#FFC107", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                ⏭️ PASAPALABRA
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div style={{ marginBottom: "8px", padding: "6px", borderRadius: "6px", textAlign: "center", fontWeight: "bold", fontSize: "10px", backgroundColor: message.type === "success" ? "#C8E6C9" : message.type === "error" ? "#FFCDD2" : "#BBDEFB" }}>
            {message.text}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", fontSize: "7px", borderTop: "1px solid #ddd", paddingTop: "6px", flexWrap: "wrap" }}>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "50%", marginRight: "2px" }}></span> Sin responder</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#4CAF50", borderRadius: "50%", marginRight: "2px" }}></span> Correcto</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#f44336", borderRadius: "50%", marginRight: "2px" }}></span> Incorrecto</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#FFC107", borderRadius: "50%", marginRight: "2px" }}></span> Pasapalabra</div>
          <div><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "50%", marginRight: "2px", border: "2px solid #FF9800" }}></span> Actual</div>
        </div>
        
        {/* Force Reload Button */}
        <div style={{ textAlign: "center", marginTop: "6px" }}>
          <button onClick={clearCacheAndReload} style={{ padding: "2px 6px", fontSize: "7px", backgroundColor: "#999", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
            🗑️ Force Reload
          </button>
        </div>
      </div>
    </>
  );
}