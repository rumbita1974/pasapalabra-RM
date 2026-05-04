import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import levenshtein from "fast-levenshtein";
import { ROSCO_DB } from "../data/rosco-db";

/* =========================
   CONFIG
========================= */

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const QUESTION_TIME = 30;
const MIN_SLANG_PER_ROSCO = 2;
const MAX_SLANG_PER_ROSCO = 3;

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
  
  const slangCount = MIN_SLANG_PER_ROSCO + Math.floor(Math.random() * (MAX_SLANG_PER_ROSCO - MIN_SLANG_PER_ROSCO + 1));
  const selectedSlangs = shuffle(slangs).slice(0, slangCount);
  
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
        isSlang: false
      });
      return;
    }
    
    rosco.push({
      letter,
      answer: (selectedItem.answer || "skip").toLowerCase(),
      question: selectedItem.clue || `Con la ${letter}`,
      status: "pending",
      isSlang: isVenezuelanSlang(selectedItem)
    });
  });
  
  return rosco;
}

function findNextLetter(rosco, currentIndex) {
  for (let i = currentIndex + 1; i < rosco.length; i++) {
    return i;
  }
  return -1;
}

/* =========================
   CIRCULAR ROSCO COMPONENT
========================= */

function CircularRosco({ letters, currentLetter, onLetterClick, isMobile }) {
  const size = isMobile ? 320 : 440;
  const center = size / 2;
  const radius = isMobile ? 140 : 190;
  const buttonRadius = isMobile ? 22 : 28;
  const fontSize = isMobile ? 14 : 18;
  
  const getAngle = (index) => {
    return (index * 360 / letters.length) - 90;
  };
  
  const getButtonColor = (letterStatus) => {
    switch(letterStatus) {
      case 'correct': return '#4CAF50';
      case 'wrong': return '#f44336';
      default: return '#e0e0e0';
    }
  };
  
  const getTextColor = (letterStatus) => {
    return letterStatus === 'pending' ? '#333' : '#fff';
  };
  
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
      <svg width={size} height={size} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
        <circle cx={center} cy={center} r={radius} fill="#f5f5f5" stroke="#ccc" strokeWidth="2"/>
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
                fill={getButtonColor(item.status)}
                stroke={isCurrent ? "#FF9800" : "#999"}
                strokeWidth={isCurrent ? 3 : 1.5}
                onClick={() => item.status === "pending" && onLetterClick(item.letter)}
                style={{ cursor: item.status === "pending" ? "pointer" : "not-allowed", transition: "all 0.3s" }}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={getTextColor(item.status)}
                fontSize={fontSize}
                fontWeight="bold"
                style={{ cursor: item.status === "pending" ? "pointer" : "not-allowed", userSelect: "none" }}
                onClick={() => item.status === "pending" && onLetterClick(item.letter)}
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
  const [isMobile, setIsMobile] = useState(false);
  
  const correctSound = useRef(null);
  const wrongSound = useRef(null);
  const welcomeSound = useRef(null);
  const timerInterval = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    correctSound.current = new Audio("/correct.mp3");
    wrongSound.current = new Audio("/wrong.mp3");
    welcomeSound.current = new Audio("/welcome.mp3");
    
    if (correctSound.current) correctSound.current.volume = 1.0;
    if (wrongSound.current) wrongSound.current.volume = 1.0;
    if (welcomeSound.current) welcomeSound.current.volume = 1.0;
  }, []);

  // Timer effect - handles timeout
  useEffect(() => {
    if (setup || !game || gameFinished || showAnswer) return;

    if (timerInterval.current) clearInterval(timerInterval.current);

    timerInterval.current = setInterval(() => {
      setTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerInterval.current);
          // Timeout - treat as wrong answer
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

  const handleTimeout = () => {
    if (!game || gameFinished) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") return;
    
    // Mark as wrong
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "wrong"
    };
    
    setShowAnswer(true);
    setMessage({ 
      text: `⏰ Tiempo agotado! Respuesta correcta: ${currentItem.answer.toUpperCase()}`, 
      type: "error" 
    });
    
    // Move to next letter for THIS player
    const nextIndex = findNextLetter(updatedRosco, player.currentIndex);
    
    if (nextIndex === -1) {
      // Player completed their rosco
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
    } else {
      // Update player's progress
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
    }
    
    // SWITCH PLAYER after timeout (for 2-player mode)
    if (playersCount === 2 && !gameFinished) {
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      setGame(prev => ({
        ...prev,
        currentPlayer: nextPlayer
      }));
    }
    
    setTimeout(() => {
      setShowAnswer(false);
      setMessage({ text: "", type: "" });
    }, 2000);
    
    setInput("");
    setTime(QUESTION_TIME);
  };

  const startGame = () => {
    welcomeSound.current?.play();

    const p1Rosco = buildRosco(difficulty, Math.random() * 1000);
    const p2Rosco = playersCount === 2 ? buildRosco(difficulty, Math.random() * 2000) : null;

    setGame({
      currentPlayer: 1,
      players: {
        1: { 
          rosco: p1Rosco.map(item => ({ ...item, status: "pending" })), 
          currentIndex: 0,
          score: 0,
          completed: false
        },
        2: p2Rosco ? { 
          rosco: p2Rosco.map(item => ({ ...item, status: "pending" })), 
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
    setMessage({ text: "¡Comienza el Jugador 1! Letra A - 30 segundos", type: "info" });
    setShowAnswer(false);
    
    setTimeout(() => setMessage({ text: "", type: "" }), 2000);
  };

  const handleWrongAnswer = (errorMessage = null) => {
    if (!game || gameFinished) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") return;
    
    // Mark as wrong
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "wrong"
    };
    
    setShowAnswer(true);
    setMessage({ 
      text: errorMessage || `❌ Incorrecto. Respuesta correcta: ${currentItem.answer.toUpperCase()}`, 
      type: "error" 
    });
    
    // Move to next letter for THIS player
    const nextIndex = findNextLetter(updatedRosco, player.currentIndex);
    
    if (nextIndex === -1) {
      // Player completed their rosco
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
    } else {
      // Update player's progress
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
    }
    
    wrongSound.current?.play();
    
    // SWITCH PLAYER after wrong answer (for 2-player mode)
    if (playersCount === 2 && !gameFinished) {
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      setGame(prev => ({
        ...prev,
        currentPlayer: nextPlayer
      }));
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
    
    // Mark as correct
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "correct"
    };
    
    // Move to next letter
    const nextIndex = findNextLetter(updatedRosco, player.currentIndex);
    
    if (nextIndex === -1) {
      // Player completed their rosco
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
      
      setMessage({ text: `🎉 ¡Jugador ${currentPlayer} completó el ROSCO! 🎉`, type: "success" });
      
      // Check if game should end
      const otherPlayer = currentPlayer === 1 ? 2 : 1;
      if (playersCount === 1 || game.players[otherPlayer]?.completed) {
        setTimeout(() => endGame(), 2000);
      } else {
        // Switch to other player after completion
        setTimeout(() => {
          setGame(prev => ({
            ...prev,
            currentPlayer: otherPlayer
          }));
          setTime(QUESTION_TIME);
        }, 2000);
      }
    } else {
      // Same player continues to next letter
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
      setTime(QUESTION_TIME);
      setMessage({ text: `✅ ¡Correcto! Letra ${updatedRosco[nextIndex].letter}`, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
    }
    
    correctSound.current?.play();
    setInput("");
  };

  const answer = () => {
    if (!game || gameFinished || showAnswer) return;
    if (!input.trim()) {
      setMessage({ text: "✏️ Escribe una respuesta", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
      return;
    }

    const player = game.players[game.currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    if (!currentItem || currentItem.status !== "pending") {
      setMessage({ text: "⚠️ Esta letra ya fue respondida", type: "error" });
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
    
    if (letterIndex !== -1 && player.rosco[letterIndex].status === "pending") {
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
      setMessage({ text: `Saltaste a la letra ${letter}`, type: "info" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1000);
    } else if (letterIndex !== -1 && player.rosco[letterIndex].status !== "pending") {
      setMessage({ text: `La letra ${letter} ya fue ${player.rosco[letterIndex].status === "correct" ? "acertada" : "fallada"}`, type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
    }
  };

  const endGame = () => {
    if (!game) return;
    
    setGameFinished(true);
    
    const p1Correct = game.players[1].rosco.filter(r => r.status === "correct").length;
    const p1Wrong = game.players[1].rosco.filter(r => r.status === "wrong").length;
    const p1Score = p1Correct;
    
    let p2Correct = 0, p2Wrong = 0, p2Score = 0;
    let twoPlayer = false;
    
    if (game.players[2]) {
      twoPlayer = true;
      p2Correct = game.players[2].rosco.filter(r => r.status === "correct").length;
      p2Wrong = game.players[2].rosco.filter(r => r.status === "wrong").length;
      p2Score = p2Correct;
    }
    
    const winner = p1Score > p2Score ? 1 : (p2Score > p1Score ? 2 : 0);
    
    setMessage({ 
      text: winner === 1 ? "🎮 JUGADOR 1 GANA 🎮" : winner === 2 ? "🎮 JUGADOR 2 GANA 🎮" : "🎮 EMPATE 🎮", 
      type: "gameover" 
    });
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
    return (
      <>
        <Head>
          <title>Pasapalabra Venezuela</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
          <meta name="description" content="Juego de Pasapalabra con palabras venezolanas" />
        </Head>
        <div style={styles.setupContainer}>
          <h1 style={styles.title}>🎙️ Pasapalabra<br/>Venezuela 🎙️</h1>
          <p style={styles.subtitle}>¡Incluye palabras del argot venezolano!</p>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>👥 Jugadores</h3>
            <div style={styles.buttonGroup}>
              <button 
                onClick={() => setPlayersCount(1)} 
                style={{
                  ...styles.choiceButton,
                  backgroundColor: playersCount === 1 ? "#2196F3" : "#fff",
                  color: playersCount === 1 ? "#fff" : "#333",
                  borderColor: playersCount === 1 ? "#2196F3" : "#ccc"
                }}
              >
                1 jugador
              </button>
              <button 
                onClick={() => setPlayersCount(2)} 
                style={{
                  ...styles.choiceButton,
                  backgroundColor: playersCount === 2 ? "#2196F3" : "#fff",
                  color: playersCount === 2 ? "#fff" : "#333",
                  borderColor: playersCount === 2 ? "#2196F3" : "#ccc"
                }}
              >
                2 jugadores
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📚 Dificultad</h3>
            <div style={styles.buttonGroup}>
              <button 
                onClick={() => setDifficulty("easy")} 
                style={{
                  ...styles.choiceButton,
                  backgroundColor: difficulty === "easy" ? "#4CAF50" : "#fff",
                  color: difficulty === "easy" ? "#fff" : "#333",
                  borderColor: difficulty === "easy" ? "#4CAF50" : "#ccc"
                }}
              >
                Fácil
              </button>
              <button 
                onClick={() => setDifficulty("medium")} 
                style={{
                  ...styles.choiceButton,
                  backgroundColor: difficulty === "medium" ? "#FF9800" : "#fff",
                  color: difficulty === "medium" ? "#fff" : "#333",
                  borderColor: difficulty === "medium" ? "#FF9800" : "#ccc"
                }}
              >
                Medio
              </button>
              <button 
                onClick={() => setDifficulty("hard")} 
                style={{
                  ...styles.choiceButton,
                  backgroundColor: difficulty === "hard" ? "#f44336" : "#fff",
                  color: difficulty === "hard" ? "#fff" : "#333",
                  borderColor: difficulty === "hard" ? "#f44336" : "#ccc"
                }}
              >
                Difícil
              </button>
            </div>
          </div>

          <button onClick={startGame} style={styles.startButton}>
            🎮 Empezar Partida
          </button>
          
          <div style={styles.rulesContainer}>
            <h3 style={styles.rulesTitle}>📖 Reglas:</h3>
            <ul style={styles.rulesList}>
              <li>📌 Cada jugador tiene su propio rosco</li>
              <li>🎯 Empieza el Jugador 1 desde la letra A</li>
              <li>✅ Si acierta: suma punto y continúa el mismo jugador</li>
              <li>❌ Si falla o tiempo agotado: NO suma punto y PASA EL TURNO</li>
              <li>🔄 El siguiente jugador continúa desde donde quedó</li>
              <li>🏆 Gana quien tenga más aciertos al final</li>
              <li>🇻🇪 Cada rosco incluye 2-3 palabras venezolanas</li>
              <li>⏱️ 30 segundos por pregunta - Se reinicia en cada letra</li>
            </ul>
          </div>

          <div style={styles.copyright}>
            <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              Designed by Armando Guillen - Copyright 2026
            </p>
            <p style={{ fontSize: "12px", marginTop: "0" }}>
              (no association with Pasapalabra by ITV Studios Iberia or The Alphabet Game) 
              - All rights remain with their corresponding owners.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Game Finished Screen
  if (gameFinished && game) {
    const p1Correct = game.players[1].rosco.filter(r => r.status === "correct").length;
    const p1Wrong = game.players[1].rosco.filter(r => r.status === "wrong").length;
    const p1Score = p1Correct;
    
    let p2Correct = 0, p2Wrong = 0, p2Score = 0;
    let twoPlayer = false;
    
    if (game.players[2]) {
      twoPlayer = true;
      p2Correct = game.players[2].rosco.filter(r => r.status === "correct").length;
      p2Wrong = game.players[2].rosco.filter(r => r.status === "wrong").length;
      p2Score = p2Correct;
    }
    
    const winner = p1Score > p2Score ? 1 : (p2Score > p1Score ? 2 : 0);
    
    return (
      <>
        <Head>
          <title>Pasapalabra - Resultados Finales</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        </Head>
        <div style={styles.summaryContainer}>
          <h1 style={styles.summaryTitle}>🏆 RESULTADOS FINALES 🏆</h1>
          
          {winner === 1 && <h2 style={styles.winnerText}>🎉 ¡Jugador 1 GANA! 🎉</h2>}
          {winner === 2 && <h2 style={styles.winnerText}>🎉 ¡Jugador 2 GANA! 🎉</h2>}
          {winner === 0 && <h2 style={styles.winnerText}>🤝 ¡EMPATE! 🤝</h2>}
          
          <div style={styles.summaryTable}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Jugador</th>
                  <th style={styles.th}>✅ Correctas</th>
                  <th style={styles.th}>❌ Incorrectas</th>
                  <th style={styles.th}>📊 Total</th>
                  <th style={styles.th}>⭐ Puntuación</th>
                </tr>
              </thead>
              <tbody>
                <tr style={winner === 1 ? styles.winnerRow : {}}>
                  <td style={styles.td}><strong>Jugador 1</strong></td>
                  <td style={{...styles.td, color: "#4CAF50", fontWeight: "bold"}}>{p1Correct}</td>
                  <td style={{...styles.td, color: "#f44336"}}>{p1Wrong}</td>
                  <td style={styles.td}>{p1Correct + p1Wrong}/27</td>
                  <td style={{...styles.td, fontSize: "20px", fontWeight: "bold", color: "#2196F3"}}>{p1Score}</td>
                </tr>
                {twoPlayer && (
                  <tr style={winner === 2 ? styles.winnerRow : {}}>
                    <td style={styles.td}><strong>Jugador 2</strong></td>
                    <td style={{...styles.td, color: "#4CAF50", fontWeight: "bold"}}>{p2Correct}</td>
                    <td style={{...styles.td, color: "#f44336"}}>{p2Wrong}</td>
                    <td style={styles.td}>{p2Correct + p2Wrong}/27</td>
                    <td style={{...styles.td, fontSize: "20px", fontWeight: "bold", color: "#FF9800"}}>{p2Score}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div style={styles.summaryDetails}>
            <h3>📋 Resumen del Juego:</h3>
            <p>🎯 Jugador 1: {p1Correct} aciertos, {p1Wrong} fallos</p>
            {twoPlayer && <p>🎯 Jugador 2: {p2Correct} aciertos, {p2Wrong} fallos</p>}
            <p>🇻🇪 Cada rosco incluyó 2-3 palabras del argot venezolano</p>
            <p>⏱️ Tiempo máximo por pregunta: 30 segundos</p>
          </div>
          
          <button onClick={() => {
            setSetup(true);
            setGame(null);
            setGameFinished(false);
          }} style={styles.playAgainButton}>
            🔄 Jugar de Nuevo
          </button>
          
          <div style={styles.copyright}>
            <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
              Designed by Armando Guillen - Copyright 2026
            </p>
            <p style={{ fontSize: "10px", marginTop: "0" }}>
              (no association with Pasapalabra by ITV Studios Iberia or The Alphabet Game)
            </p>
          </div>
        </div>
      </>
    );
  }

  const player = game.players[game.currentPlayer];
  const currentItem = player.rosco[player.currentIndex];
  const answeredCount = player.rosco.filter(r => r.status !== "pending").length;
  const remainingCount = 27 - answeredCount;

  return (
    <>
      <Head>
        <title>Pasapalabra - Jugador {game.currentPlayer}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
      </Head>
      <div style={styles.gameContainer}>
        <div style={styles.header}>
          <div style={{
            ...styles.playerCard,
            backgroundColor: game.currentPlayer === 1 ? "#E3F2FD" : "#f5f5f5",
            border: game.currentPlayer === 1 ? "2px solid #2196F3" : "1px solid #ddd"
          }}>
            <div style={{ fontWeight: "bold" }}>👤 Jugador 1</div>
            <div style={styles.playerScore}>{game.players[1].score}</div>
            <div style={styles.playerProgress}>
              ✅{game.players[1].rosco.filter(r => r.status === "correct").length} ❌{game.players[1].rosco.filter(r => r.status === "wrong").length}
            </div>
          </div>
          
          <div style={styles.timerContainer}>
            <div style={{ ...styles.timer, color: time <= 10 ? "#f44336" : "#333" }}>
              ⏱️ {time}s
            </div>
            <div style={styles.turnLabel}>🎯 Turno Jugador {game.currentPlayer}</div>
          </div>
          
          {game.players[2] && (
            <div style={{
              ...styles.playerCard,
              backgroundColor: game.currentPlayer === 2 ? "#FFF3E0" : "#f5f5f5",
              border: game.currentPlayer === 2 ? "2px solid #FF9800" : "1px solid #ddd"
            }}>
              <div style={{ fontWeight: "bold" }}>👤 Jugador 2</div>
              <div style={{ ...styles.playerScore, color: "#FF9800" }}>{game.players[2].score}</div>
              <div style={styles.playerProgress}>
                ✅{game.players[2].rosco.filter(r => r.status === "correct").length} ❌{game.players[2].rosco.filter(r => r.status === "wrong").length}
              </div>
            </div>
          )}
        </div>

        <div style={styles.roscoWrapper}>
          <CircularRosco 
            letters={player.rosco}
            currentLetter={currentItem.letter}
            onLetterClick={jumpToLetter}
            isMobile={isMobile}
          />
        </div>

        <div style={{
          ...styles.questionCard,
          backgroundColor: currentItem.isSlang ? "#FFF3E0" : "#f5f5f5",
          border: currentItem.isSlang ? "2px solid #FF9800" : "1px solid #ddd"
        }}>
          {currentItem.isSlang && (
            <div style={styles.slangBadge}>🇻🇪 Palabra Venezolana 🇻🇪</div>
          )}
          <div style={styles.letterBadge}>Letra {currentItem.letter} ({remainingCount} restantes)</div>
          <div style={styles.questionText}>{currentItem.question}</div>
        </div>

        {!showAnswer && (
          <div style={styles.inputContainer}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta..."
              autoFocus
            />
            <button onClick={answer} style={styles.answerButton}>
              📝 Responder
            </button>
          </div>
        )}

        {message.text && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === "success" ? "#C8E6C9" : 
                            message.type === "error" ? "#FFCDD2" : "#BBDEFB"
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.legend}>
          <div><span style={styles.legendDotGrey}></span> Sin responder</div>
          <div><span style={styles.legendDotGreen}></span> Correcto ✓</div>
          <div><span style={styles.legendDotRed}></span> Incorrecto ✗</div>
          <div><span style={styles.legendDotOrange}></span> Actual</div>
        </div>
      </div>
    </>
  );
}

const styles = {
  setupContainer: {
    textAlign: "center",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center"
  },
  title: {
    fontSize: "clamp(32px, 8vw, 48px)",
    marginBottom: "10px"
  },
  subtitle: {
    marginBottom: "30px",
    fontSize: "clamp(14px, 4vw, 18px)",
    color: "#666"
  },
  section: {
    marginBottom: "30px"
  },
  sectionTitle: {
    marginBottom: "10px"
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  choiceButton: {
    padding: "12px 24px",
    fontSize: "16px",
    cursor: "pointer",
    border: "2px solid",
    borderRadius: "10px",
    transition: "all 0.3s",
    fontWeight: "bold"
  },
  startButton: {
    padding: "15px 30px",
    fontSize: "clamp(16px, 5vw, 20px)",
    cursor: "pointer",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    marginBottom: "30px"
  },
  rulesContainer: {
    textAlign: "left",
    backgroundColor: "#f5f5f5",
    padding: "20px",
    borderRadius: "15px",
    marginTop: "20px"
  },
  rulesList: {
    margin: 0,
    paddingLeft: "20px",
    lineHeight: 1.8
  },
  copyright: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "10px",
    borderTop: "2px solid #ddd",
    marginBottom: "20px"
  },
  gameContainer: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "clamp(10px, 3vw, 20px)",
    maxWidth: "700px",
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  playerCard: {
    padding: "8px 12px",
    borderRadius: "10px",
    textAlign: "center",
    flex: 1,
    minWidth: "80px",
    transition: "all 0.3s"
  },
  playerScore: {
    fontSize: "clamp(20px, 6vw, 28px)",
    fontWeight: "bold",
    color: "#2196F3"
  },
  playerProgress: {
    fontSize: "10px",
    color: "#666"
  },
  timerContainer: {
    textAlign: "center",
    flex: 1
  },
  timer: {
    fontSize: "clamp(28px, 7vw, 42px)",
    fontWeight: "bold"
  },
  turnLabel: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#2196F3"
  },
  roscoWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "15px",
    marginTop: "5px"
  },
  questionCard: {
    borderRadius: "15px",
    padding: "clamp(15px, 4vw, 20px)",
    marginBottom: "15px",
    textAlign: "center"
  },
  slangBadge: {
    fontSize: "13px",
    color: "#FF9800",
    marginBottom: "8px",
    fontWeight: "bold"
  },
  letterBadge: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "8px"
  },
  questionText: {
    fontSize: "clamp(16px, 5vw, 20px)",
    fontWeight: "bold",
    lineHeight: 1.4
  },
  inputContainer: {
    textAlign: "center",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "15px"
  },
  input: {
    fontSize: "clamp(14px, 4vw, 16px)",
    padding: "10px 15px",
    flex: 1,
    minWidth: "180px",
    borderRadius: "10px",
    border: "2px solid #ccc",
    outline: "none"
  },
  answerButton: {
    fontSize: "clamp(14px, 4vw, 16px)",
    padding: "10px 20px",
    cursor: "pointer",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold"
  },
  message: {
    marginBottom: "15px",
    padding: "12px",
    borderRadius: "10px",
    textAlign: "center",
    fontSize: "clamp(13px, 4vw, 15px)",
    fontWeight: "bold"
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "clamp(10px, 4vw, 20px)",
    fontSize: "clamp(9px, 3vw, 11px)",
    flexWrap: "wrap",
    borderTop: "1px solid #ddd",
    paddingTop: "15px",
    marginTop: "5px"
  },
  legendDotGrey: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    backgroundColor: "#e0e0e0",
    borderRadius: "50%",
    marginRight: "4px"
  },
  legendDotGreen: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    backgroundColor: "#4CAF50",
    borderRadius: "50%",
    marginRight: "4px"
  },
  legendDotRed: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    backgroundColor: "#f44336",
    borderRadius: "50%",
    marginRight: "4px"
  },
  legendDotOrange: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    backgroundColor: "#e0e0e0",
    borderRadius: "50%",
    marginRight: "4px",
    border: "2px solid #FF9800"
  },
  summaryContainer: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "20px",
    maxWidth: "700px",
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center"
  },
  summaryTitle: {
    fontSize: "clamp(24px, 6vw, 36px)",
    textAlign: "center",
    marginBottom: "10px"
  },
  winnerText: {
    fontSize: "clamp(20px, 5vw, 28px)",
    textAlign: "center",
    marginBottom: "30px"
  },
  summaryTable: {
    overflowX: "auto",
    marginBottom: "30px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  th: {
    padding: "12px",
    backgroundColor: "#2196F3",
    color: "white",
    fontWeight: "bold",
    border: "1px solid #ddd"
  },
  td: {
    padding: "12px",
    textAlign: "center",
    border: "1px solid #ddd"
  },
  winnerRow: {
    backgroundColor: "#FFF9C4"
  },
  summaryDetails: {
    backgroundColor: "#f5f5f5",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "30px"
  },
  playAgainButton: {
    padding: "15px 30px",
    fontSize: "18px",
    cursor: "pointer",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    marginBottom: "20px"
  }
};