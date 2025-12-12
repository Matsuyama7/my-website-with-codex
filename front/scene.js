import { createBreakoutGame } from './game.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');
const livesEl = document.getElementById('game-lives');
const messageEl = document.getElementById('game-message');

const pxRatio = window.devicePixelRatio || 1;

let viewWidth = 0;
let viewHeight = 0;

let scene = 'start'; // start | playing | clear
let lastTimestamp = 0;

let quoteText = '';
let quoteStatus = 'idle'; // idle | loading | loaded | error

const moveState = {
  left: false,
  right: false,
};

async function fetchQuote() {
  quoteStatus = 'loading';
  quoteText = '';
  messageEl.textContent = '名言を取得中...';
  try {
    const res = await fetch('/api/quote', { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    quoteText = (data && (data.quote || data.text || data.message)) ?? '';
    if (!quoteText) {
      quoteText = '今日のあなたは、昨日のあなたの続きです。';
    }
    quoteStatus = 'loaded';
  } catch {
    quoteStatus = 'error';
    quoteText = '名言の取得に失敗しました（バックエンド未実装でもOK）。';
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * pxRatio;
  canvas.height = rect.height * pxRatio;
  ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
  viewWidth = rect.width;
  viewHeight = rect.height;
}

function drawCenteredText(lines, { yStart, lineHeight, font, color }) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = font;
  lines.forEach((line, idx) => {
    ctx.fillText(line, viewWidth / 2, yStart + idx * lineHeight);
  });
  ctx.restore();
}

function drawStart() {
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  drawCenteredText(['BREAKOUT', 'Press Enter to Start'], {
    yStart: viewHeight / 2 - 40,
    lineHeight: 44,
    font: '28px "Press Start 2P", monospace',
    color: '#fcd34d',
  });

  drawCenteredText(['← → : Move', 'Space : Launch', 'R : Reset'], {
    yStart: viewHeight / 2 + 70,
    lineHeight: 28,
    font: '14px "Press Start 2P", monospace',
    color: '#93c5fd',
  });
}

function drawClear() {
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  drawCenteredText(['CLEAR!', 'R to Continue'], {
    yStart: viewHeight / 2 - 70,
    lineHeight: 44,
    font: '28px "Press Start 2P", monospace',
    color: '#34d399',
  });

  const quoteLines = quoteStatus === 'loading' ? ['Fetching quote...'] : [quoteText].filter(Boolean);
  drawCenteredText(quoteLines, {
    yStart: viewHeight / 2 + 40,
    lineHeight: 22,
    font: '14px "Space Grotesk", system-ui, sans-serif',
    color: '#e0f2fe',
  });
}

const game = createBreakoutGame({
  ctx,
  scoreEl,
  livesEl,
  messageEl,
  onClear: () => {
    scene = 'clear';
    quoteStatus = 'idle';
    fetchQuote();
  },
});

function enterStart() {
  scene = 'start';
  moveState.left = false;
  moveState.right = false;
  game.setMoveState(moveState);
  messageEl.textContent = 'Enterで開始';
}

function enterPlaying() {
  scene = 'playing';
  quoteStatus = 'idle';
  quoteText = '';
  lastTimestamp = 0;
  game.resetGame();
  messageEl.textContent = '← →でパドル移動 · Spaceでボール発射';
}

function continueFromClear() {
  enterPlaying();
}

function loop(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }
  lastTimestamp = timestamp;

  if (scene === 'start') {
    drawStart();
  } else if (scene === 'playing') {
    game.setMoveState(moveState);
    game.tick(timestamp);
  } else {
    drawClear();
  }

  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (scene === 'start') {
    if (event.key === 'Enter') {
      enterPlaying();
    }
    return;
  }

  if (scene === 'clear') {
    if (key === 'r') {
      continueFromClear();
    }
    return;
  }

  if (key === 'arrowleft') moveState.left = true;
  if (key === 'arrowright') moveState.right = true;

  if (event.code === 'Space') {
    event.preventDefault();
    game.launchBall();
  }
  if (key === 'r') {
    enterPlaying();
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (scene !== 'playing') return;
  if (key === 'arrowleft') moveState.left = false;
  if (key === 'arrowright') moveState.right = false;
});

window.addEventListener('resize', () => {
  resizeCanvas();
  game.setViewport({ width: viewWidth, height: viewHeight });
  if (scene === 'playing') {
    game.resetGame();
  }
});

resizeCanvas();
game.setViewport({ width: viewWidth, height: viewHeight });
enterStart();
requestAnimationFrame(loop);
