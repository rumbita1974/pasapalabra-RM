import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import levenshtein from "fast-levenshtein";
import { ROSCO_DB } from "../data/rosco-db";

/* =========================
   CONFIG
========================= */

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const QUESTION_TIME = 30; // 30 seconds per question
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

function findNextPendingLetter(rosco, startIndex) {
  for (let i = startIndex + 1; i < rosco.length; i++) {
    if (rosco[i].status === "pending") return i;
  }
  for (let i = 0; i < startIndex; i++) {
    if (rosco[i].status === "pending") return i;
  }
  return -1;
}

function findFirstPendingLetter(rosco) {
  for (let i = 0; i < rosco.length; i++) {
    if (rosco[i].status === "pending") return i;
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
  const [waitingForSwitch, setWaitingForSwitch] = useState(false);
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
  }, []);

  // Timer effect - resets when current player or current letter changes
  useEffect(() => {
    if (setup || !game || waitingForSwitch) return;

    // Clear existing interval
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Start new timer
    timerInterval.current = setInterval(() => {
      setTime(prevTime => {
        if (prevTime <= 1) {
          // Time's up for current question
          clearInterval(timerInterval.current);
          handleWrongAnswer("⏰ ¡Tiempo agotado para esta pregunta!");
          return QUESTION_TIME;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [setup, game, game?.currentPlayer, game?.players[game?.currentPlayer]?.currentIndex, waitingForSwitch]);

  const startGame = () => {
    welcomeSound.current?.play();

    const p1Rosco = buildRosco(difficulty, Math.random() * 1000);
    const p2Rosco = playersCount === 2 ? buildRosco(difficulty, Math.random() * 2000) : null;

    const initialRoscoStatus = (rosco) => rosco.map(item => ({ ...item, status: "pending" }));

    setGame({
      currentPlayer: 1,
      players: {
        1: { 
          rosco: initialRoscoStatus(p1Rosco), 
          currentIndex: 0,
          score: 0,
          completed: false
        },
        2: p2Rosco ? { 
          rosco: initialRoscoStatus(p2Rosco), 
          currentIndex: 0,
          score: 0,
          completed: false
        } : null
      }
    });

    setSetup(false);
    setTime(QUESTION_TIME); // Reset timer to 30 seconds
    setInput("");
    setMessage({ text: "¡Comienza el Jugador 1! Letra A - 30 segundos", type: "info" });
    setShowAnswer(false);
    setWaitingForSwitch(false);
    
    setTimeout(() => setMessage({ text: "", type: "" }), 2000);
  };

  const handleWrongAnswer = (errorMessage = null) => {
    if (!game || waitingForSwitch) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
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
    
    setGame(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [currentPlayer]: {
          ...player,
          rosco: updatedRosco,
        }
      }
    }));
    
    setWaitingForSwitch(true);
    wrongSound.current?.play();
    
    setTimeout(() => {
      switchPlayer();
      setShowAnswer(false);
      setWaitingForSwitch(false);
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  const handleCorrectAnswer = () => {
    if (!game || waitingForSwitch) return;
    
    const currentPlayer = game.currentPlayer;
    const player = game.players[currentPlayer];
    const currentItem = player.rosco[player.currentIndex];
    
    const updatedRosco = [...player.rosco];
    updatedRosco[player.currentIndex] = {
      ...currentItem,
      status: "correct"
    };
    
    const nextIndex = findNextPendingLetter(updatedRosco, player.currentIndex);
    
    if (nextIndex === -1) {
      // Player completed the entire rosco
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
      
      setMessage({ text: `🎉 ¡Jugador ${currentPlayer} ha completado el ROSCO! 🎉`, type: "success" });
      
      const otherPlayer = currentPlayer === 1 ? 2 : 1;
      if (playersCount === 1 || game.players[otherPlayer]?.completed) {
        setTimeout(() => endGame(), 2000);
      } else {
        setTimeout(() => {
          switchPlayer();
        }, 2000);
      }
    } else {
      // Move to next question - RESET TIMER
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
      
      // Reset timer for next question
      setTime(QUESTION_TIME);
      
      setMessage({ text: `✅ ¡Correcto! Siguiente letra: ${updatedRosco[nextIndex].letter} - 30 segundos`, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
    }
    
    setInput("");
    correctSound.current?.play();
  };

  const switchPlayer = () => {
    if (!game) return;
    
    const currentPlayer = game.currentPlayer;
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    
    if (nextPlayer === 2 && !game.players[2]) {
      endGame();
      return;
    }
    
    const nextPlayerData = game.players[nextPlayer];
    const firstPendingIndex = findFirstPendingLetter(nextPlayerData.rosco);
    
    if (firstPendingIndex === -1) {
      endGame();
      return;
    }
    
    setGame(prev => ({
      ...prev,
      currentPlayer: nextPlayer,
      players: {
        ...prev.players,
        [nextPlayer]: {
          ...nextPlayerData,
          currentIndex: firstPendingIndex
        }
      }
    }));
    
    // Reset timer for new player's first question
    setTime(QUESTION_TIME);
    setInput("");
    setMessage({ text: `🔄 Turno del Jugador ${nextPlayer} - Letra ${nextPlayerData.rosco[firstPendingIndex].letter} - 30 segundos`, type: "info" });
    setTimeout(() => setMessage({ text: "", type: "" }), 2000);
  };

  const answer = () => {
    if (!game || waitingForSwitch || showAnswer) return;
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
    if (!game || waitingForSwitch || showAnswer) return;
    
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
      // Reset timer when jumping to a different letter
      setTime(QUESTION_TIME);
      setInput("");
      setMessage({ text: `Saltaste a la letra ${letter} - 30 segundos`, type: "info" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1000);
    } else if (letterIndex !== -1 && player.rosco[letterIndex].status !== "pending") {
      setMessage({ text: `La letra ${letter} ya fue ${player.rosco[letterIndex].status === "correct" ? "acertada" : "fallada"}`, type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 1500);
    }
  };

  const endGame = () => {
    if (!game) return;
    
    const p1Score = game.players[1].score;
    const p2Score = game.players[2]?.score || 0;
    const p1Completed = game.players[1].completed;
    const p2Completed = game.players[2]?.completed || false;
    
    let winnerText = "";
    
    if (p1Completed && !p2Completed) {
      winnerText = "¡Jugador 1 completó el rosco y GANA! 🏆";
    } else if (p2Completed && !p1Completed) {
      winnerText = "¡Jugador 2 completó el rosco y GANA! 🏆";
    } else if (p1Completed && p2Completed) {
      if (p1Score > p2Score) {
        winnerText = "¡Ambos completaron! Gana Jugador 1 por más aciertos 🏆";
      } else if (p2Score > p1Score) {
        winnerText = "¡Ambos completaron! Gana Jugador 2 por más aciertos 🏆";
      } else {
        winnerText = "¡Ambos completaron el rosco! EMPATE 🤝";
      }
    } else {
      if (p1Score > p2Score) {
        winnerText = `¡Jugador 1 GANA! (${p1Score} - ${p2Score}) 🏆`;
      } else if (p2Score > p1Score) {
        winnerText = `¡Jugador 2 GANA! (${p2Score} - ${p1Score}) 🏆`;
      } else {
        winnerText = `EMPATE (${p1Score} - ${p2Score}) 🤝`;
      }
    }
    
    setMessage({ text: `🎮 JUEGO TERMINADO - ${winnerText}`, type: "gameover" });
    
    setTimeout(() => {
      setSetup(true);
      setGame(null);
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && !setup && game && !waitingForSwitch && !showAnswer) {
        answer();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Setup Screen
  if (setup || !game) {
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
              <li>✅ Si acierta, continúa con la siguiente letra</li>
              <li>❌ Si falla, se muestra la respuesta correcta y pasa el turno</li>
              <li>🔄 El siguiente jugador empieza desde la letra A</li>
              <li>🏆 Gana quien complete el rosco o tenga más aciertos</li>
              <li>🇻🇪 Cada rosco incluye 2-3 palabras venezolanas</li>
              <li>⏱️ <strong>30 segundos por pregunta</strong> - El tiempo se reinicia en cada letra</li>
            </ul>
          </div>

          {/* Copyright Disclaimer */}
          <div style={styles.copyright}>
            <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              Designed by Armando Guillen - Copyright 2026
            </p>
            <p style={{ fontSize: "12px", marginTop: "0" }}>
              (No association with Pasapalabra by ITV Studios Iberia or The Alphabet Game) 
              - All rights remain with their corresponding owners.
            </p>
          </div>
        </div>
      </>
    );
  }

  const player = game.players[game.currentPlayer];
  const currentItem = player.rosco[player.currentIndex];
  const allPending = player.rosco.filter(r => r.status === "pending").length;

  return (
    <>
      <Head>
        <title>Pasapalabra - Jugador {game.currentPlayer}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
      </Head>
      <div style={styles.gameContainer}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.playerCard}>
            <div style={{ fontWeight: "bold" }}>Jugador 1</div>
            <div style={styles.playerScore}>{game.players[1].score}</div>
            <div style={styles.playerProgress}>{game.players[1].completed ? "✅" : `${27 - game.players[1].rosco.filter(r => r.status !== "pending").length} left`}</div>
          </div>
          
          <div style={styles.timerContainer}>
            <div style={{ ...styles.timer, color: time <= 10 ? "#f44336" : "#333" }}>
              ⏱️ {time}s
            </div>
            <div style={styles.turnLabel}>Turno {game.currentPlayer}</div>
          </div>
          
          {game.players[2] && (
            <div style={styles.playerCard}>
              <div style={{ fontWeight: "bold" }}>Jugador 2</div>
              <div style={{ ...styles.playerScore, color: "#FF9800" }}>{game.players[2].score}</div>
              <div style={styles.playerProgress}>{game.players[2].completed ? "✅" : `${27 - game.players[2].rosco.filter(r => r.status !== "pending").length} left`}</div>
            </div>
          )}
        </div>

        {/* Circular Rosco - Centered */}
        <div style={styles.roscoWrapper}>
          <CircularRosco 
            letters={player.rosco}
            currentLetter={currentItem.letter}
            onLetterClick={jumpToLetter}
            isMobile={isMobile}
          />
        </div>

        {/* Question Card - Closer to Rosco */}
        <div style={{
          ...styles.questionCard,
          backgroundColor: currentItem.isSlang ? "#FFF3E0" : "#f5f5f5",
          border: currentItem.isSlang ? "2px solid #FF9800" : "1px solid #ddd"
        }}>
          {currentItem.isSlang && (
            <div style={styles.slangBadge}>🇻🇪 Palabra Venezolana 🇻🇪</div>
          )}
          <div style={styles.letterBadge}>Letra {currentItem.letter}</div>
          <div style={styles.questionText}>{currentItem.question}</div>
          {allPending > 0 && allPending < 5 && (
            <div style={styles.warningBadge}>⚡ ¡Quedan {allPending} letras!</div>
          )}
        </div>

        {/* Answer Input - Closer to Question Card */}
        {!showAnswer && (
          <div style={styles.inputContainer}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta... (30 segundos)"
              autoFocus
            />
            <button onClick={answer} style={styles.answerButton}>
              📝 Responder
            </button>
          </div>
        )}

        {/* Message Display */}
        {message.text && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === "success" ? "#C8E6C9" : 
                            message.type === "error" ? "#FFCDD2" : 
                            message.type === "gameover" ? "#E1BEE7" : "#BBDEFB"
          }}>
            {message.text}
          </div>
        )}

        {/* Legend */}
        <div style={styles.legend}>
          <div><span style={styles.legendDotGrey}></span> Sin responder</div>
          <div><span style={styles.legendDotGreen}></span> Correcto ✓</div>
          <div><span style={styles.legendDotRed}></span> Incorrecto ✗</div>
          <div><span style={styles.legendDotOrange}></span> Actual</div>
        </div>

        {/* Copyright Disclaimer in Game */}
        <div style={styles.copyrightGame}>
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

const styles = {
  // Setup screen styles
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
  rulesTitle: {
    marginTop: 0,
    marginBottom: "10px"
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
  
  // Game screen styles
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
    backgroundColor: "#f5f5f5",
    padding: "8px 12px",
    borderRadius: "10px",
    textAlign: "center",
    flex: 1,
    minWidth: "70px"
  },
  playerScore: {
    fontSize: "clamp(20px, 6vw, 28px)",
    fontWeight: "bold",
    color: "#2196F3"
  },
  playerProgress: {
    fontSize: "9px",
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
    fontSize: "11px",
    color: "#666"
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
  warningBadge: {
    marginTop: "8px",
    fontSize: "11px",
    color: "#FF9800"
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
  copyrightGame: {
    marginTop: "20px",
    padding: "15px",
    textAlign: "center",
    borderTop: "1px solid #eee",
    backgroundColor: "#fafafa",
    borderRadius: "8px"
  }
};