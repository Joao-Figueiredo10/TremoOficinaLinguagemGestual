import React, { useState, useEffect, useCallback } from "react";

/* ============================================================
   TREMU NA OFICINA
   Jogo estilo Termo (Wordle) com Língua Gestual Portuguesa (LGP)
   Palavras de 4 letras — cada tentativa mostra a "mão" da LGP
   correspondente à letra que o jogador escolhe.
   ============================================================ */

// ---------- Banco de palavras (4 letras, sem acentos) ----------
const WORDS = [
  "PORC", "MESA", "RODA", "FACA", "BOLA", "CASA", "LIVRO".slice(0,4) === "LIVR" ? "LIVR" : "MOTA",
  "PATO", "GATO", "VELA", "SAPO", "RAMO", "TUBO", "CALO", "MAPA",
  "PORT", "FIOS", "CABO", "TINT", "FORM", "MOLA"
].filter(w => w.length === 4);

// ---------- Desenhos das mãos LGP (alfabeto manual) ----------
// SVGs simplificados, estilo "ícone de oficina" — traço grosso, mão estilizada
// Cada letra tem uma forma de mão característica (alfabeto dactilológico LGP/LIBRAS aproximado)
const HAND_SHAPES = {
  A: <g><path d="M50 90 Q50 40 50 30 Q50 20 60 20 Q70 20 70 30 L70 60" /><path d="M50 60 Q35 60 35 75 Q35 95 55 95 L75 95 Q90 95 90 78 L90 50" /><circle cx="60" cy="25" r="3" fill="var(--ink)"/></g>,
  B: <g><path d="M40 95 L40 30 Q40 15 55 15 Q70 15 70 30 L70 40 Q85 40 85 55 Q85 70 70 70 L55 70 L55 95" /></g>,
  C: <path d="M75 25 Q35 25 35 55 Q35 85 75 85" />,
  D: <g><path d="M45 95 L45 35 Q45 15 60 15 Q75 15 75 35 L75 95" /><path d="M45 60 L75 60" /></g>,
  E: <g><path d="M40 25 L75 25 M40 55 L70 55 M40 85 L75 85 M40 25 L40 85" /></g>,
  F: <g><circle cx="60" cy="40" r="14"/><path d="M40 70 Q60 110 80 70" /></g>,
  G: <path d="M60 90 L60 30 M45 45 L75 45" />,
  H: <path d="M50 90 L50 30 M70 90 L70 30 M50 60 L70 60" />,
  I: <path d="M65 90 Q65 50 65 30 Q65 20 75 20" />,
  J: <path d="M65 90 Q65 50 65 30 Q65 20 75 20 M75 20 Q85 20 85 35" />,
  K: <g><path d="M50 90 L50 25" /><path d="M65 90 L65 35 L85 20" /></g>,
  L: <path d="M55 90 L55 25 L85 25" />,
  M: <path d="M40 90 L40 30 M55 90 L55 40 M70 90 L70 30 M40 55 Q47 65 55 55 M55 55 Q62 65 70 55" />,
  N: <path d="M45 90 L45 30 M65 90 L65 40 M45 55 Q55 65 65 55" />,
  O: <circle cx="60" cy="55" r="32" />,
  P: <g><circle cx="60" cy="35" r="13"/><path d="M60 48 L60 100 M40 75 L80 75" /></g>,
  Q: <g><circle cx="55" cy="35" r="13"/><path d="M55 48 L55 100 L75 100" /></g>,
  R: <path d="M50 90 L50 25 M70 90 L70 30 M50 50 Q60 60 70 50" />,
  S: <circle cx="60" cy="60" r="28" />,
  T: <g><circle cx="60" cy="55" r="28"/><path d="M45 55 L75 55" /></g>,
  U: <path d="M50 90 L50 25 M70 90 L70 25" />,
  V: <path d="M50 90 L50 25 M70 90 L70 25 M50 25 Q60 15 70 25" />,
  W: <path d="M40 90 L40 25 M60 90 L60 30 M80 90 L80 25" />,
  X: <path d="M65 90 Q65 60 65 40 Q65 25 75 25 Q85 25 80 35" />,
  Y: <path d="M40 90 L80 30 M80 90 L40 30" />,
  Z: <path d="M40 25 L80 25 L40 85 L80 85" />,
};

const drawHand = (letter) => {
  const inner = HAND_SHAPES[letter] || <circle cx="60" cy="55" r="30" />;
  return (
    <svg viewBox="0 0 120 120" className="hand-svg" aria-label={`Mão da letra ${letter}`}>
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {inner}
      </g>
    </svg>
  );
};

// ---------- Lógica do jogo ----------
function evaluateGuess(guess, answer) {
  const result = Array(4).fill("absent");
  const answerArr = answer.split("");
  const guessArr = guess.split("");
  const used = Array(4).fill(false);

  // exatos
  for (let i = 0; i < 4; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  // presentes noutra posição
  for (let i = 0; i < 4; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < 4; j++) {
      if (!used[j] && guessArr[i] === answerArr[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_TRIES = 6;

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export default function TremuNaOficina() {
  const [answer, setAnswer] = useState(pickWord);
  const [guesses, setGuesses] = useState([]); // array de {letters:[...], result:[...]}
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [activeHandLetter, setActiveHandLetter] = useState(null);
  const [letterStatus, setLetterStatus] = useState({}); // estado por letra do teclado
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("");

  const addLetter = useCallback((ch) => {
    if (status !== "playing") return;
    setCurrent((c) => {
      if (c.length >= 4) return c;
      setActiveHandLetter(ch);
      return c + ch;
    });
  }, [status]);

  const removeLetter = useCallback(() => {
    if (status !== "playing") return;
    setCurrent((c) => {
      const next = c.slice(0, -1);
      setActiveHandLetter(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, [status]);

  const submitGuess = useCallback(() => {
    if (status !== "playing") return;
    if (current.length !== 4) {
      setMessage("Falta letras! Completa a palavra de 4 letras.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setTimeout(() => setMessage(""), 1800);
      return;
    }
    const result = evaluateGuess(current, answer);
    setGuesses((g) => [...g, { letters: current.split(""), result }]);

    // atualizar estado das letras no teclado
    setLetterStatus((prev) => {
      const next = { ...prev };
      current.split("").forEach((ltr, i) => {
        const r = result[i];
        const rank = { absent: 0, present: 1, correct: 2 };
        if (!next[ltr] || rank[r] > rank[next[ltr]]) {
          next[ltr] = r;
        }
      });
      return next;
    });

    if (current === answer) {
      setStatus("won");
      setMessage("BOA! Acertaste a palavra!");
    } else if (guesses.length + 1 >= MAX_TRIES) {
      setStatus("lost");
      setMessage(`Fim de jogo! Era "${answer}".`);
    }
    setCurrent("");
    setActiveHandLetter(null);
  }, [current, answer, status, guesses.length]);

  // teclado físico
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toUpperCase();
      if (key === "ENTER") submitGuess();
      else if (key === "BACKSPACE") removeLetter();
      else if (ALPHABET.includes(key)) addLetter(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addLetter, removeLetter, submitGuess]);

  const restart = () => {
    setAnswer(pickWord());
    setGuesses([]);
    setCurrent("");
    setStatus("playing");
    setActiveHandLetter(null);
    setLetterStatus({});
    setMessage("");
  };

  const rows = [...guesses];
  const totalRows = MAX_TRIES;

  return (
    <div className="tremu-root">
      <style>{`
        .tremu-root {
          --bg: #1c1f22;
          --panel: #26292d;
          --ink: #f4ede2;
          --muted: #8a8f94;
          --accent: #ff7a1a;
          --accent-2: #ffd23f;
          --correct: #5a8f4f;
          --present: #c98a2e;
          --absent: #3a3e42;
          --border: #3a3e42;
          font-family: 'Courier New', ui-monospace, monospace;
          background: var(--bg);
          color: var(--ink);
          min-height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 14px 32px;
          box-sizing: border-box;
        }
        .tremu-root * { box-sizing: border-box; }

        .header {
          width: 100%;
          max-width: 460px;
          text-align: center;
          margin-bottom: 14px;
          position: relative;
        }
        .title {
          font-family: 'Arial Black', Impact, sans-serif;
          font-weight: 900;
          font-size: 28px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--accent-2);
          text-shadow: 3px 3px 0 var(--accent);
          margin: 0;
          line-height: 1.1;
        }
        .subtitle {
          font-size: 11px;
          letter-spacing: 3px;
          color: var(--muted);
          text-transform: uppercase;
          margin-top: 6px;
        }
        .bolt-row {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
        }
        .bolt {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.6;
        }

        .hand-panel {
          width: 100%;
          max-width: 460px;
          background: var(--panel);
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .hand-display {
          width: 92px;
          height: 92px;
          flex-shrink: 0;
          background: #14161a;
          border: 2px dashed var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }
        .hand-svg {
          width: 100%;
          height: 100%;
        }
        .hand-info {
          flex: 1;
          font-size: 13px;
          line-height: 1.5;
          color: var(--muted);
        }
        .hand-info strong {
          color: var(--accent-2);
          font-size: 15px;
          display: block;
          margin-bottom: 4px;
        }
        .hand-placeholder {
          font-size: 28px;
          color: var(--muted);
          font-weight: 900;
        }

        .board {
          display: grid;
          grid-template-rows: repeat(${totalRows}, 1fr);
          gap: 8px;
          margin-bottom: 18px;
          width: 100%;
          max-width: 320px;
        }
        .row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .cell {
          aspect-ratio: 1;
          border: 2px solid var(--border);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 900;
          background: var(--panel);
          color: var(--ink);
          text-transform: uppercase;
          transition: transform 0.15s, background 0.3s, border-color 0.3s;
        }
        .cell.filled {
          border-color: var(--accent-2);
          animation: pop 0.12s ease-out;
        }
        .cell.correct { background: var(--correct); border-color: var(--correct); }
        .cell.present { background: var(--present); border-color: var(--present); }
        .cell.absent { background: var(--absent); border-color: var(--absent); color: var(--muted); }

        @keyframes pop {
          0% { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        .row.shake { animation: shake 0.4s; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .message {
          min-height: 22px;
          font-size: 13px;
          color: var(--accent-2);
          text-align: center;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .keyboard {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }
        .kb-row {
          display: flex;
          gap: 4px;
          justify-content: center;
          width: 100%;
        }
        .key {
          flex: 1;
          max-width: 38px;
          height: 46px;
          border-radius: 5px;
          border: none;
          background: var(--panel);
          color: var(--ink);
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          border: 2px solid var(--border);
          transition: transform 0.06s, background 0.2s;
          text-transform: uppercase;
        }
        .key:active { transform: scale(0.93); }
        .key.correct { background: var(--correct); border-color: var(--correct); }
        .key.present { background: var(--present); border-color: var(--present); }
        .key.absent { background: var(--absent); border-color: var(--absent); color: var(--muted); }
        .key.wide {
          max-width: 70px;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .footer-actions {
          margin-top: 18px;
          text-align: center;
        }
        .restart-btn {
          background: var(--accent);
          color: #1c1f22;
          border: none;
          padding: 10px 22px;
          border-radius: 6px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          font-size: 13px;
        }
        .restart-btn:active { transform: scale(0.97); }

        .legend {
          font-size: 11px;
          color: var(--muted);
          margin-top: 14px;
          text-align: center;
          max-width: 400px;
          line-height: 1.6;
        }
      `}</style>

      <div className="header">
        <h1 className="title">Tremu na Oficina</h1>
        <div className="subtitle">Adivinha a palavra · Língua Gestual</div>
        <div className="bolt-row">
          <div className="bolt" /><div className="bolt" /><div className="bolt" />
        </div>
      </div>

      <div className="hand-panel">
        <div className="hand-display">
          {activeHandLetter ? drawHand(activeHandLetter) : <span className="hand-placeholder">?</span>}
        </div>
        <div className="hand-info">
          <strong>{activeHandLetter ? `Letra "${activeHandLetter}"` : "Escolhe uma letra"}</strong>
          Identifica a letra pela mão e usa o teclado para a colocar na palavra. Cada gesto representa uma letra do alfabeto em Língua Gestual.
        </div>
      </div>

      <div className="board">
        {Array.from({ length: totalRows }).map((_, rowIdx) => {
          const guess = rows[rowIdx];
          const isCurrentRow = rowIdx === rows.length && status === "playing";
          const letters = guess
            ? guess.letters
            : isCurrentRow
            ? current.split("").concat(Array(4 - current.length).fill(""))
            : Array(4).fill("");
          const results = guess ? guess.result : Array(4).fill(null);

          return (
            <div className={`row ${isCurrentRow && shake ? "shake" : ""}`} key={rowIdx}>
              {letters.map((ltr, i) => (
                <div
                  key={i}
                  className={`cell ${ltr ? "filled" : ""} ${results[i] || ""}`}
                >
                  {ltr}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="message">{message}</div>

      <div className="keyboard">
        <div className="kb-row">
          {"QWERTYUIOP".split("").map((k) => (
            <button
              key={k}
              className={`key ${letterStatus[k] || ""}`}
              onClick={() => addLetter(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="kb-row">
          {"ASDFGHJKL".split("").map((k) => (
            <button
              key={k}
              className={`key ${letterStatus[k] || ""}`}
              onClick={() => addLetter(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="kb-row">
          <button className="key wide" onClick={removeLetter}>APAGAR</button>
          {"ZXCVBNM".split("").map((k) => (
            <button
              key={k}
              className={`key ${letterStatus[k] || ""}`}
              onClick={() => addLetter(k)}
            >
              {k}
            </button>
          ))}
          <button className="key wide" onClick={submitGuess}>ENTRAR</button>
        </div>
      </div>

      {status !== "playing" && (
        <div className="footer-actions">
          <button className="restart-btn" onClick={restart}>Jogar de novo</button>
        </div>
      )}

      <div className="legend">
        🔧 Verde = letra certa no sítio certo · Laranja = letra existe noutra posição · Cinzento = letra não está na palavra.
        <br />Toca numa letra do teclado para ver a sua mão em Língua Gestual.
      </div>
    </div>
  );
}
