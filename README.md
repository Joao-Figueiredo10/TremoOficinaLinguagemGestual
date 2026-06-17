# Tremu na Oficina 🤟

Jogo de adivinhar palavras (estilo Wordle) com integração de **Língua Gestual Portuguesa (LGP)**. O jogador adivinha uma palavra de 4 letras usando o teclado, e pode consultar o alfabeto manual em LGP para cada letra. Opcionalmente, pode usar a **câmara** para detetar gestos da mão em tempo real e inserir letras automaticamente.

---

## Funcionalidades

- 🎮 **Jogo Tremu** — adivinha uma palavra de 4 letras em 6 tentativas
- 🤟 **Alfabeto LGP** — painel com as 26 letras do alfabeto manual em fotografia real
- 📷 **Reconhecimento por câmara** — usa MediaPipe Hands para detetar gestos da mão em tempo real
- 👁️ **Ocultar/mostrar alfabeto** — botão para esconder o painel de referência (modo desafio)
- 📖 **Descrição de cada letra** — instrução de como formar cada gesto ao clicar numa letra

---

## Estrutura do projeto

```
src/
├── App.jsx              # Componente principal (jogo + deteção + UI)
├── main.jsx             # Ponto de entrada React
├── index.css            # Estilos globais mínimos
└── assets/
    └── letras/          # Fotografias do alfabeto manual LGP (A.png … Z.png)
```

---

## Instalação e execução

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm (incluído com o Node.js)

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar em modo de desenvolvimento
npm run dev

# 3. Build para produção
npm run build

# 4. Pré-visualizar o build de produção
npm run preview
```

A aplicação fica disponível em `http://localhost:5173` por padrão.

---

## Reconhecimento de gestos por câmara

O reconhecimento usa as bibliotecas [MediaPipe Hands](https://mediapipe.dev/) carregadas via CDN:

- `@mediapipe/hands@0.4.1675469240`
- `@mediapipe/camera_utils@0.3.1675466862`

### Como funciona

1. O MediaPipe deteta 21 pontos (landmarks) da mão em cada frame de vídeo
2. A função `inferLetterFromLandmarks` analisa a posição relativa de cada ponto para identificar a letra
3. A letra detetada aparece como botão — clica nela para a inserir na palavra

### Requisitos para a câmara

- O site tem de correr em **HTTPS ou localhost** (exigência do browser para acesso à câmara)
- O browser tem de ter permissão de câmara concedida para o site
- Funciona melhor com boa iluminação e fundo neutro

### Limitações conhecidas

- As letras **J** e **Z** envolvem movimento (traçar a letra no ar) e não são detetáveis com precisão num único frame estático
- Gestos muito semelhantes (ex: A/S/E, U/V) podem confundir-se dependendo do ângulo da mão
- A deteção é uma aproximação educativa, não um sistema de reconhecimento de LGP certificado

---

## Tecnologias utilizadas

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | Interface e estado |
| Vite | 5 | Bundler e servidor de desenvolvimento |
| MediaPipe Hands | 0.4 | Deteção de landmarks da mão |
| MediaPipe Camera Utils | 0.3 | Acesso e processamento da câmara |

---

## Imagens do alfabeto

As fotografias do alfabeto manual LGP em `src/assets/letras/` foram recortadas de uma referência do **Alfabeto Manual LGP**. Os gestos seguem a norma da Língua Gestual Portuguesa.

---

## Notas de desenvolvimento

- Para adicionar ou substituir imagens do alfabeto, coloca os ficheiros em `src/assets/letras/` com o nome `A.png` até `Z.png` (maiúsculas)
- Para afinar a deteção de uma letra específica, edita a função `inferLetterFromLandmarks` em `App.jsx`
- O dicionário de palavras está na constante `WORDS` no topo de `App.jsx`
