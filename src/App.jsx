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

// ---------- Imagens das mãos LGP (alfabeto manual) ----------
// Carrega automaticamente todas as imagens da pasta assets/letras (A.png ... Z.png)
const HAND_IMAGES = import.meta.glob("./assets/letras/*.png", { eager: true, import: "default" });

// ---------- Descrições de como formar cada letra (alfabeto manual) ----------
// Texto curto e didático para ajudar a reproduzir o gesto com a mão,
// com base nas fotos de referência do alfabeto LGP.
const LETTER_DESCRIPTIONS = {
  A: "Mão semi-fechada com o indicador apontado para cima e para o lado; os outros dedos ficam dobrados.",
  B: "Punho fechado com o polegar levantado para cima, encostado à lateral da mão.",
  C: "Curva os dedos e o polegar para formar a forma de um \"C\", como a segurar um copo.",
  D: "Mão inclinada com os dedos esticados e ligeiramente afastados, formando uma diagonal.",
  E: "Dobra os 4 dedos sobre a palma com as pontas viradas para dentro; o polegar fica por baixo deles.",
  F: "Estica o indicador para cima; os outros dedos e o polegar ficam dobrados, com a mão na vertical.",
  G: "Fecha a mão em punho, com o polegar visível ao lado, mão na horizontal.",
  H: "Dobra os dedos a formar um gancho, com o indicador e o médio à frente, mão na vertical.",
  I: "Fecha a mão em punho e dobra o indicador para a frente, formando um pequeno gancho.",
  J: "Estica o indicador para cima na vertical, com os outros dedos fechados e o polegar ao lado.",
  K: "Estica o indicador e o médio para cima, afastados em V, com o polegar entre eles.",
  L: "Estica o indicador para cima e o polegar para o lado, formando um \"L\".",
  M: "Mão pendurada com os dedos juntos a apontar para baixo.",
  N: "Mão com o indicador e o médio dobrados a apontar para baixo, os outros dedos fechados.",
  O: "Curva todos os dedos para tocar a ponta do polegar, formando a forma redonda de um \"O\".",
  P: "Mão pendurada com os dedos abertos e curvados a apontar para baixo.",
  Q: "Punho fechado com o polegar a apontar para baixo.",
  R: "Estica o indicador e o médio para cima, afastados, formando uma garra/gancho.",
  S: "Fecha a mão num punho com o polegar dobrado para a frente, sobre os outros dedos.",
  T: "Estica o indicador para o lado, na horizontal, com os outros dedos fechados.",
  U: "Estica o indicador e o médio juntos (sem espaço entre eles) para cima.",
  V: "Estica o indicador e o médio para cima, afastados, formando um \"V\".",
  W: "Estica o indicador, o médio e o anelar para cima, afastados entre si.",
  X: "Estica o indicador para a frente, na horizontal, apontando para fora; os outros dedos ficam fechados.",
  Y: "Estica o polegar e o mindinho para os lados opostos; indicador, médio e anelar ficam fechados.",
  Z: "Curva os dedos como no \"C\", mas com a mão ligeiramente inclinada e o polegar mais próximo dos dedos.",
};

// Devolve a imagem da mão correspondente à letra
const drawHand = (letter) => {
  const src = HAND_IMAGES[`./assets/letras/${letter}.png`];
  return (
    <img
      src={src}
      alt={`Mão da letra ${letter} em LGP`}
      className="hand-svg"
    />
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

// ---------- Deteção de gestos LGP via landmarks do MediaPipe ----------
// Cada landmark é {x, y, z} normalizado (0-1). 21 pontos no total.
// Índices: 0=pulso, 1-4=polegar, 5-8=indicador, 9-12=médio, 13-16=anelar, 17-20=mindinho

function getExtendedFingers(landmarks) {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const wrist = landmarks[0];

  const fingers = [
    { tip: 4,  mid: 2  },  // polegar
    { tip: 8,  mid: 6  },  // indicador
    { tip: 12, mid: 10 },  // médio
    { tip: 16, mid: 14 },  // anelar
    { tip: 20, mid: 18 },  // mindinho
  ];

  return fingers.map(({ tip, mid }) => {
    const tipDist = dist(landmarks[tip], wrist);
    const midDist = dist(landmarks[mid], wrist);
    return tipDist > midDist * 1.15;
  });
}

// Verifica se um dedo está dobrado (ponta mais baixa que a base)
function isCurled(landmarks, tip, pip) {
  return landmarks[tip].y > landmarks[pip].y;
}

// Verifica se dois dedos estão cruzados (X do indicador)
function fingersCrossed(landmarks, a, b) {
  return Math.abs(landmarks[a].x - landmarks[b].x) < 0.03;
}

function inferLetterFromLandmarks(landmarks) {
  const ext = getExtendedFingers(landmarks);
  const [thumb, index, middle, ring, pinky] = ext;

  const L = landmarks;
  const fingerCount = ext.slice(1).filter(Boolean).length;

  // Helpers
  const thumbTip  = L[4];
  const thumbBase = L[2];
  const indexTip  = L[8];
  const indexPip  = L[6];
  const midTip    = L[12];
  const midPip    = L[10];
  const ringTip   = L[16];
  const ringPip   = L[14];
  const pinkyTip  = L[20];
  const pinkyPip  = L[18];
  const wrist     = L[0];

  // Mão apontada para baixo: pulso mais alto que a ponta do médio
  const handDown = wrist.y < midPip.y;
  // Polegar para cima: ponta do polegar mais alta que a base
  const thumbUp = thumbTip.y < thumbBase.y - 0.05;
  // Polegar para o lado: ponta do polegar muito à esquerda ou direita da base
  const thumbSide = Math.abs(thumbTip.x - thumbBase.x) > 0.06;
  // Polegar tocando indicador
  const thumbTouchIndex = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) < 0.06;
  // Polegar tocando médio
  const thumbTouchMid = Math.hypot(thumbTip.x - midTip.x, thumbTip.y - midTip.y) < 0.06;
  // Indicador apontado para frente/horizontal
  const indexHoriz = Math.abs(indexTip.y - indexPip.y) < 0.04 && Math.abs(indexTip.x - indexPip.x) > 0.03;
  // Indicador e médio juntos (U)
  const indexMidTogether = Math.abs(indexTip.x - midTip.x) < 0.04;
  // Indicador e médio afastados (V)
  const indexMidSpread = Math.abs(indexTip.x - midTip.x) > 0.06;
  // Três dedos esticados afastados (W)
  const threeSpread = index && middle && ring && Math.abs(indexTip.x - ringTip.x) > 0.10;
  // Dedo em gancho (ponta curvada)
  const indexHooked = index && indexTip.y > indexPip.y - 0.01;
  // O: dedos curvados a tocar polegar
  const oShape = thumbTouchIndex && !index && !middle;

  // --- Regras por letra ---
  // A: polegar para o lado, nenhum dedo esticado
  if (!index && !middle && !ring && !pinky && thumbSide && !thumbUp)
    return { letter: "A", confidence: "alta" };

  // B: polegar para cima, nenhum outro dedo esticado
  if (!index && !middle && !ring && !pinky && thumbUp)
    return { letter: "B", confidence: "alta" };

  // C: todos os dedos curvados (pontas a meio caminho, nem fechados nem esticados)
  // A ponta do indicador fica abaixo da PIP (curvado) mas acima do pulso
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const indexCurved  = indexTip.y > indexPip.y && dist(indexTip, wrist) > 0.12;
  const middleCurved = midTip.y   > midPip.y   && dist(midTip, wrist)   > 0.12;
  const ringCurved   = ringTip.y  > ringPip.y  && dist(ringTip, wrist)  > 0.10;
  const pinkyCurved  = pinkyTip.y > pinkyPip.y && dist(pinkyTip, wrist) > 0.08;
  const thumbApart   = thumbTip.x < indexTip.x - 0.04; // polegar afastado para o lado
  const cShape = (indexCurved || index) && (middleCurved || middle) && thumbApart
                 && !threeSpread && !indexMidSpread;
  if (cShape)
    return { letter: "C", confidence: "alta" };

  // Y: polegar para o lado + mindinho esticado, resto fechado
  if (!index && !middle && !ring && pinky && (thumbSide || thumbUp))
    return { letter: "Y", confidence: "alta" };

  // I: só mindinho esticado, polegar fechado
  if (!index && !middle && !ring && pinky && !thumb)
    return { letter: "I", confidence: "alta" };

  // L: indicador para cima + polegar para o lado
  if (index && !middle && !ring && !pinky && thumbSide)
    return { letter: "L", confidence: "alta" };

  // D: indicador para cima, médio/anelar/mindinho fechados, polegar toca médio
  if (index && !middle && !ring && !pinky && thumbTouchMid)
    return { letter: "D", confidence: "média" };

  // T: indicador para cima/lado, resto fechado, polegar encostado
  if (index && !middle && !ring && !pinky && !thumbSide && !thumbTouchMid)
    return { letter: "T", confidence: "média" };

  // G: indicador horizontal, polegar para o lado
  if (indexHoriz && !middle && !ring && !pinky && thumbSide)
    return { letter: "G", confidence: "alta" };

  // X: indicador horizontal, resto fechado
  if (indexHoriz && !middle && !ring && !pinky && !thumbSide)
    return { letter: "X", confidence: "alta" };

  // W: três dedos esticados afastados
  if (threeSpread)
    return { letter: "W", confidence: "alta" };

  // V: indicador e médio esticados e afastados
  if (index && middle && !ring && !pinky && indexMidSpread)
    return { letter: "V", confidence: "alta" };

  // U: indicador e médio esticados e juntos
  if (index && middle && !ring && !pinky && indexMidTogether)
    return { letter: "U", confidence: "alta" };

  // R: indicador e médio cruzados
  if (index && middle && !ring && !pinky && fingersCrossed(landmarks, 8, 12))
    return { letter: "R", confidence: "alta" };

  // H: indicador e médio na horizontal (juntos)
  if (index && middle && !ring && !pinky && indexHoriz)
    return { letter: "H", confidence: "alta" };

  // K: indicador e médio esticados, polegar entre eles
  if (index && middle && !ring && !pinky && thumb)
    return { letter: "K", confidence: "média" };

  // B (4 dedos): 4 dedos esticados, polegar dobrado
  if (index && middle && ring && pinky && !thumb)
    return { letter: "B", confidence: "alta" };

  // O: polegar toca indicador, forma de O
  if (thumbTouchIndex && fingerCount === 0)
    return { letter: "O", confidence: "alta" };

  // F: indicador + polegar fecham círculo, outros esticados
  if (thumbTouchIndex && middle && ring && pinky)
    return { letter: "F", confidence: "alta" };

  // E: todos os dedos dobrados
  if (!index && !middle && !ring && !pinky && !thumbSide && !thumbUp)
    return { letter: "E", confidence: "média" };

  // S: punho fechado, polegar por cima
  if (!index && !middle && !ring && !pinky && thumb && !thumbUp && !thumbSide)
    return { letter: "S", confidence: "média" };

  // M: 3 dedos dobrados, polegar por baixo
  if (!index && !middle && !ring && !pinky && handDown)
    return { letter: "M", confidence: "baixa" };

  // N: 2 dedos dobrados
  if (!index && !middle && !ring && !pinky)
    return { letter: "N", confidence: "baixa" };

  // P/Q: mão para baixo
  if (handDown && index && !middle)
    return { letter: "P", confidence: "média" };

  if (handDown && !index)
    return { letter: "Q", confidence: "média" };

  // Z: indicador, mão em movimento (não detetável estaticamente)
  if (index && !middle && !ring && !pinky)
    return { letter: "Z", confidence: "baixa" };

  return { letter: null, confidence: "baixa" };
}


export default function TremuNaOficina() {
  const [answer, setAnswer] = useState(pickWord);
  const [guesses, setGuesses] = useState([]); // array de {letters:[...], result:[...]}
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [activeHandLetter, setActiveHandLetter] = useState(null);
  const [imagesHidden, setImagesHidden] = useState(false);
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
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js");
      } catch (loadErr) {
        console.error(loadErr);
        throw new Error(
          "Não foi possível carregar as bibliotecas de deteção de mãos (MediaPipe). Verifica a tua ligação à internet e tenta novamente."
        );
      }

      if (!window.Hands || !window.Camera) {
        throw new Error(
          "As bibliotecas de deteção de mãos (MediaPipe) não ficaram disponíveis. Tenta recarregar a página."
        );
      }

      // 2. Pedir acesso à câmara
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (mediaErr) {
        console.error(mediaErr);
        if (mediaErr.name === "NotAllowedError") {
          throw new Error(
            "Permissão da câmara recusada. Vai às definições do site no navegador e permite o acesso à câmara."
          );
        } else if (mediaErr.name === "NotFoundError") {
          throw new Error("Não foi encontrada nenhuma câmara neste dispositivo.");
        } else {
          throw new Error("Não foi possível aceder à câmara: " + mediaErr.message);
        }
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 3. Configurar modelo de deteção de mãos
      const hands = new window.Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
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
        width: 640,
        height: 480,
      });
      camera.start();
      cameraRef.current = camera;

      setMpReady(true);
      setCameraOn(true);
    } catch (err) {
      console.error(err);
      setCameraError(
        err && err.message
          ? err.message
          : "Não foi possível aceder à câmara. Verifica as permissões do browser."
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
          --skin-light: #f6d2a8;
          --skin-dark: #b87f4f;
          --hand-outline: #8a5a35;
          --nail: #f8e8d8;

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
          object-fit: contain;
          border-radius: 4px;
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
        .hand-placeholder.hidden-icon {
          font-size: 40px;
        }

        .toggle-images-btn {
          width: 100%;
          max-width: 460px;
          background: var(--panel);
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 16px;
          color: var(--ink);
          font-family: inherit;
          font-size: 13px;
          font-weight: bold;
          letter-spacing: 1px;
          cursor: pointer;
        }
        .toggle-images-btn:active {
          transform: scale(0.98);
          border-color: var(--accent);
        }

        .alpha-hand-hidden {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-size: 20px;
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
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }
        .camera-frame {
          position: relative;
          width: 100%;
          max-width: 436px;
          aspect-ratio: 4/3;
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
          font-size: 14px;
          color: var(--muted);
          text-align: center;
          padding: 8px;
        }
        .camera-info {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
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

      {!imagesHidden && (
        <div className="hand-panel">
          <div className="hand-display">
            {activeHandLetter ? drawHand(activeHandLetter) : <span className="hand-placeholder">?</span>}
          </div>
          <div className="hand-info">
            <strong>{activeHandLetter ? `Letra "${activeHandLetter}"` : "Escolhe uma letra"}</strong>
            {activeHandLetter
              ? LETTER_DESCRIPTIONS[activeHandLetter]
              : "Identifica a letra pela mão e usa o teclado para a colocar na palavra. Cada gesto representa uma letra do alfabeto em Língua Gestual."}
          </div>
        </div>
      )}

      <button
        className="toggle-images-btn"
        onClick={() => setImagesHidden((v) => !v)}
      >
        {imagesHidden ? "Mostrar alfabeto" : "Ocultar alfabeto"}
      </button>

      {!imagesHidden && (
        <div className="alphabet-panel">
          <div className="alphabet-title">Alfabeto em Língua Gestual</div>
          <div className="alphabet-grid">
            {ALPHABET.map((ltr) => (
              <button
                key={ltr}
                className={`alpha-cell ${activeHandLetter === ltr ? "active" : ""}`}
                onClick={() => setActiveHandLetter(ltr)}
              >
                <div className="alpha-hand">
                  {drawHand(ltr)}
                </div>
                <span className="alpha-label">{ltr}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="camera-panel">
        <div className="alphabet-title">Reconhecimento por câmara</div>
        <div className="camera-area">
          <div className="camera-frame">
            <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
            <canvas ref={canvasRef} width="640" height="480" className="camera-canvas" />
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
                      {detectedLetter.letter ? (
                        <div className="camera-candidates">
                          Letra detetada:{" "}
                          <button
                            className="candidate-chip"
                            onClick={() => addLetter(detectedLetter.letter)}
                          >
                            {detectedLetter.letter}
                          </button>
                          <span style={{fontSize:"11px", opacity:0.6, marginLeft:"6px"}}>
                            confiança: {detectedLetter.confidence}
                          </span>
                        </div>
                      ) : (
                        <div>Gesto não reconhecido — tenta ajustar a mão…</div>
                      )}
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
