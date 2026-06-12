import React, { useState, useEffect, useCallback, useRef } from "react";

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
// Cada letra define o estado de cada dedo: "up" (esticado), "down" (fechado/dobrado),
// "bent" (curvado a meio), "curve", "hook", etc. A mão base (palma + dedos) é desenhada
// de forma estilizada e cada letra ajusta a pose dos dedos e do polegar.
const FINGER_POSES = {
  A: { thumb: "side", index: "down", middle: "down", ring: "down", pinky: "down" },
  B: { thumb: "across", index: "up", middle: "up", ring: "up", pinky: "up" },
  C: { thumb: "curve", index: "curve", middle: "curve", ring: "curve", pinky: "curve" },
  D: { thumb: "touch", index: "up", middle: "down", ring: "down", pinky: "down" },
  E: { thumb: "across-low", index: "bent", middle: "bent", ring: "bent", pinky: "bent" },
  F: { thumb: "touch", index: "down", middle: "up", ring: "up", pinky: "up" },
  G: { thumb: "side", index: "side", middle: "down", ring: "down", pinky: "down" },
  H: { thumb: "down", index: "side", middle: "side", ring: "down", pinky: "down" },
  I: { thumb: "down", index: "down", middle: "down", ring: "down", pinky: "up" },
  J: { thumb: "down", index: "down", middle: "down", ring: "down", pinky: "hook" },
  K: { thumb: "between", index: "up", middle: "up-spread", ring: "down", pinky: "down" },
  L: { thumb: "side", index: "up", middle: "down", ring: "down", pinky: "down" },
  M: { thumb: "across-low", index: "bent", middle: "bent", ring: "bent", pinky: "down" },
  N: { thumb: "across-low", index: "bent", middle: "bent", ring: "down", pinky: "down" },
  O: { thumb: "touch", index: "curve", middle: "curve", ring: "curve", pinky: "curve" },
  P: { thumb: "between", index: "down", middle: "up-spread", ring: "down", pinky: "down" },
  Q: { thumb: "down", index: "down", middle: "down", ring: "down", pinky: "down" },
  R: { thumb: "down", index: "cross", middle: "cross", ring: "down", pinky: "down" },
  S: { thumb: "across-fist", index: "down", middle: "down", ring: "down", pinky: "down" },
  T: { thumb: "between-fist", index: "down", middle: "down", ring: "down", pinky: "down" },
  U: { thumb: "down", index: "up", middle: "up", ring: "down", pinky: "down" },
  V: { thumb: "down", index: "up-spread", middle: "up-spread", ring: "down", pinky: "down" },
  W: { thumb: "down", index: "up", middle: "up", ring: "up-spread2", pinky: "down" },
  X: { thumb: "down", index: "hook", middle: "down", ring: "down", pinky: "down" },
  Y: { thumb: "side", index: "down", middle: "down", ring: "down", pinky: "up" },
  Z: { thumb: "down", index: "zigzag", middle: "down", ring: "down", pinky: "down" },
};

// Desenha um dedo individual: x = posição horizontal na palma, pose = estado
// baseY = topo da palma (onde o dedo nasce)
function drawFinger(x, pose, key) {
  const baseY = 78;
  let path;
  switch (pose) {
    case "up":
    case "side":
      path = `M${x} ${baseY} L${x} ${baseY - 58}`;
      break;
    case "up-spread":
      path = `M${x} ${baseY} L${x - 8} ${baseY - 56}`;
      break;
    case "up-spread2":
      path = `M${x} ${baseY} L${x + 8} ${baseY - 54}`;
      break;
    case "down":
      // dedo dobrado sobre a palma: pequeno arco visível, não esticado
      path = `M${x} ${baseY} Q${x + 6} ${baseY - 4} ${x} ${baseY - 8}`;
      break;
    case "bent":
      // dedo dobrado a meio, ponta a apontar para a palma
      path = `M${x} ${baseY} L${x} ${baseY - 24} Q${x} ${baseY - 34} ${x - 10} ${baseY - 30}`;
      break;
    case "curve":
      path = `M${x} ${baseY} Q${x + 16} ${baseY - 38} ${x - 2} ${baseY - 50}`;
      break;
    case "hook":
      path = `M${x} ${baseY} L${x} ${baseY - 40} Q${x} ${baseY - 56} ${x - 14} ${baseY - 52}`;
      break;
    case "cross":
      path = `M${x} ${baseY} L${x + 12} ${baseY - 54}`;
      break;
    case "zigzag":
      path = `M${x} ${baseY} L${x} ${baseY - 56}`;
      break;
    default:
      path = `M${x} ${baseY} Q${x + 6} ${baseY - 4} ${x} ${baseY - 8}`;
  }
  return <path key={key} d={path} />;
}

// Desenha o polegar segundo a pose
function drawThumb(pose) {
  switch (pose) {
    case "side":
      return <path d="M38 88 Q12 80 10 60 Q9 48 22 50 Q34 52 38 70" />;
    case "across":
    case "across-low":
    case "across-fist":
      return <path d="M38 92 Q14 100 14 118 Q14 132 36 128" />;
    case "between":
    case "between-fist":
      return <path d="M42 88 Q24 76 22 58 Q21 46 34 48" />;
    case "touch":
      return <path d="M38 84 Q14 74 14 54 Q14 42 30 46 Q40 52 40 68" />;
    case "down":
      return <path d="M38 94 Q14 100 12 120" />;
    default:
      return <path d="M38 88 Q12 84 10 62 Q9 48 24 50 Q36 54 40 72" />;
  }
}

const drawHand = (letter) => {
  const pose = FINGER_POSES[letter] || FINGER_POSES.A;
  const fingerX = { index: 52, middle: 66, ring: 80, pinky: 94 };
  return (
    <svg viewBox="0 0 140 160" className="hand-svg" aria-label={`Mão da letra ${letter}`}>
      {/* Palma + pulso */}
      <path
        d="M40 78 L40 120 Q40 145 70 145 Q100 145 100 120 L100 78 Z"
        fill="var(--skin)"
        stroke="var(--ink)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Dedos - preenchimento (forma principal) */}
      <g
        fill="none"
        stroke="var(--skin)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawFinger(fingerX.index, pose.index, "i-fill")}
        {drawFinger(fingerX.middle, pose.middle, "m-fill")}
        {drawFinger(fingerX.ring, pose.ring, "r-fill")}
        {drawFinger(fingerX.pinky, pose.pinky, "p-fill")}
      </g>
      {/* Dedos - contorno por cima */}
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawFinger(fingerX.index, pose.index, "i-line")}
        {drawFinger(fingerX.middle, pose.middle, "m-line")}
        {drawFinger(fingerX.ring, pose.ring, "r-line")}
        {drawFinger(fingerX.pinky, pose.pinky, "p-line")}
      </g>
      {/* Polegar - preenchimento */}
      <g
        fill="none"
        stroke="var(--skin)"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawThumb(pose.thumb)}
      </g>
      {/* Polegar - contorno */}
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawThumb(pose.thumb)}
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

// ---------- Deteção simples de gestos via landmarks da mão (MediaPipe) ----------
// Recebe os 21 pontos da mão (x,y,z normalizados) e devolve um array de
// booleans [polegar, indicador, médio, anelar, mindinho] indicando se está esticado.
function getExtendedFingers(landmarks) {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const wrist = landmarks[0];

  // Para cada dedo, comparar distância da ponta ao pulso vs distância da junta média ao pulso
  const fingers = [
    { tip: 4, mid: 2 },   // polegar
    { tip: 8, mid: 6 },   // indicador
    { tip: 12, mid: 10 }, // médio
    { tip: 16, mid: 14 }, // anelar
    { tip: 20, mid: 18 }, // mindinho
  ];

  return fingers.map(({ tip, mid }) => {
    const tipDist = dist(landmarks[tip], wrist);
    const midDist = dist(landmarks[mid], wrist);
    return tipDist > midDist * 1.15;
  });
}

// Mapa simples: contagem de dedos esticados (excluindo polegar) -> letras possíveis
// Isto é uma aproximação educativa, não um reconhecimento oficial de LGP.
const COUNT_TO_LETTERS = {
  0: ["A", "S", "E", "M", "N", "O", "T"],
  1: ["D", "I", "L", "X", "Y", "Z", "G"],
  2: ["U", "V", "H", "K", "R", "N"],
  3: ["W"],
  4: ["B"],
};

function inferLetterFromLandmarks(landmarks) {
  const ext = getExtendedFingers(landmarks);
  const fingerCount = ext.slice(1).filter(Boolean).length; // sem polegar
  const candidates = COUNT_TO_LETTERS[fingerCount] || [];
  return { fingerCount, thumbOpen: ext[0], candidates };
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

  // ---- Câmara / deteção de mão ----
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [detectedLetter, setDetectedLetter] = useState(null);
  const [mpReady, setMpReady] = useState(false);

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

  // Carrega os scripts do MediaPipe via CDN (uma vez)
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Falha ao carregar " + src));
      document.body.appendChild(s);
    });

  const startCamera = async () => {
    setCameraError("");
    try {
      // 1. Carregar bibliotecas MediaPipe
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/[email protected]/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/[email protected]/hands.js");

      if (!window.Hands || !window.Camera) {
        throw new Error("Bibliotecas de deteção não carregaram.");
      }

      // 2. Pedir acesso à câmara
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 3. Configurar modelo de deteção de mãos
      const hands = new window.Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/[email protected]/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      hands.onResults((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];

          // desenhar pontos da mão
          ctx.fillStyle = "#ff7a1a";
          landmarks.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fill();
          });

          const info = inferLetterFromLandmarks(landmarks);
          setDetectedLetter(info);
        } else {
          setDetectedLetter(null);
        }
        ctx.restore();
      });
      handsRef.current = hands;

      // 4. Loop de câmara
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 240,
        height: 180,
      });
      camera.start();
      cameraRef.current = camera;

      setMpReady(true);
      setCameraOn(true);
    } catch (err) {
      console.error(err);
      setCameraError(
        "Não foi possível aceder à câmara. Verifica as permissões do browser."
      );
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setDetectedLetter(null);
  };

  // limpar câmara ao desmontar
  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          --skin: #e8b88a;
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
          width: 130px;
          height: 130px;
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

        .alphabet-panel {
          width: 100%;
          max-width: 460px;
          background: var(--panel);
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .alphabet-title {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--accent-2);
          margin-bottom: 10px;
          text-align: center;
          font-weight: bold;
        }
        .alphabet-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .alpha-cell {
          background: #14161a;
          border: 2px solid var(--border);
          border-radius: 6px;
          padding: 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .alpha-cell:active { transform: scale(0.95); }
        .alpha-cell.active {
          border-color: var(--accent);
          background: #20232a;
        }
        .alpha-hand {
          width: 100%;
          height: 50px;
        }
        .alpha-label {
          font-size: 10px;
          font-weight: bold;
          color: var(--muted);
        }
        .alpha-cell.active .alpha-label {
          color: var(--accent-2);
        }

        .camera-panel {
          width: 100%;
          max-width: 460px;
          background: var(--panel);
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .camera-area {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .camera-frame {
          position: relative;
          width: 120px;
          height: 90px;
          flex-shrink: 0;
          background: #000;
          border: 2px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .camera-canvas {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          transform: scaleX(-1);
        }
        .camera-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: var(--muted);
          text-align: center;
          padding: 4px;
        }
        .camera-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: var(--muted);
        }
        .camera-status strong {
          color: var(--accent-2);
        }
        .camera-candidates {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }
        .candidate-chip {
          background: var(--accent);
          color: #1c1f22;
          border: none;
          border-radius: 4px;
          padding: 3px 8px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
        }
        .candidate-chip:active { transform: scale(0.92); }
        .camera-error {
          color: #ff7a7a;
          font-size: 11px;
        }
        .restart-btn.off {
          background: var(--absent);
          color: var(--ink);
        }
        .camera-note {
          margin-top: 10px;
          font-size: 10.5px;
          color: var(--muted);
          line-height: 1.5;
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

      <div className="alphabet-panel">
        <div className="alphabet-title">Alfabeto em Língua Gestual</div>
        <div className="alphabet-grid">
          {ALPHABET.map((ltr) => (
            <button
              key={ltr}
              className={`alpha-cell ${activeHandLetter === ltr ? "active" : ""}`}
              onClick={() => setActiveHandLetter(ltr)}
            >
              <div className="alpha-hand">{drawHand(ltr)}</div>
              <span className="alpha-label">{ltr}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="camera-panel">
        <div className="alphabet-title">Reconhecimento por câmara</div>
        <div className="camera-area">
          <div className="camera-frame">
            <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
            <canvas ref={canvasRef} width="240" height="180" className="camera-canvas" />
            {!cameraOn && (
              <div className="camera-overlay">
                <span>Câmara desligada</span>
              </div>
            )}
          </div>
          <div className="camera-info">
            {!cameraOn ? (
              <button className="restart-btn" onClick={startCamera}>Ligar câmara</button>
            ) : (
              <>
                <button className="restart-btn off" onClick={stopCamera}>Desligar câmara</button>
                <div className="camera-status">
                  {detectedLetter ? (
                    <>
                      <div>Dedos esticados: <strong>{detectedLetter.fingerCount}</strong>{detectedLetter.thumbOpen ? " + polegar" : ""}</div>
                      <div className="camera-candidates">
                        Sugestões:{" "}
                        {detectedLetter.candidates.map((ltr) => (
                          <button
                            key={ltr}
                            className="candidate-chip"
                            onClick={() => addLetter(ltr)}
                          >
                            {ltr}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div>Mostra a mão à câmara…</div>
                  )}
                </div>
              </>
            )}
            {cameraError && <div className="camera-error">{cameraError}</div>}
          </div>
        </div>
        <div className="camera-note">
          Esta deteção é uma aproximação educativa (conta dedos esticados) e não substitui
          o reconhecimento oficial da Língua Gestual Portuguesa. Toca numa sugestão para a
          inserir na palavra.
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
