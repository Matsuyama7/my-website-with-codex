(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('game-score');
  const livesEl = document.getElementById('game-lives');
  const messageEl = document.getElementById('game-message');
  const pxRatio = window.devicePixelRatio || 1;

  let viewWidth = 0;
  let viewHeight = 0;
  let paddleX = 0;
  let paddleY = 0;
  let bricks = [];
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let score = 0;
  let lives = 3;
  let ballLaunched = false;
  let gameOver = false;
  let lastTimestamp = 0;

  const keys = {};

  const PADDLE_SPEED = 360;
  const PADDLE_WIDTH = 120;
  const PADDLE_HEIGHT = 14;
  const PADDLE_Y_OFFSET = 34;
  const BALL_RADIUS = 6;
  const BALL_SPEED = 280;
  const BRICK_ROWS = 4;
  const BRICK_COLS = 8;
  const BRICK_GAP = 10;
  const BRICK_HEIGHT = 20;
  const brickColors = ['#f87171', '#fb923c', '#facc15', '#34d399', '#38bdf8'];

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * pxRatio;
    canvas.height = rect.height * pxRatio;
    ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
    viewWidth = rect.width;
    viewHeight = rect.height;
    paddleY = viewHeight - PADDLE_Y_OFFSET;
  }

  function createBricks() {
    const maxGap = (BRICK_COLS - 1) * BRICK_GAP;
    const usableWidth = Math.max(viewWidth - 32, 200);
    const rawWidth = Math.max(60, usableWidth - maxGap);
    const brickWidth = Math.min(70, rawWidth / BRICK_COLS);
    const totalWidth = brickWidth * BRICK_COLS + maxGap;
    const offsetX = Math.max(12, (viewWidth - totalWidth) / 2);
    const list = [];
    for (let row = 0; row < BRICK_ROWS; row += 1) {
      for (let col = 0; col < BRICK_COLS; col += 1) {
        list.push({
          x: offsetX + col * (brickWidth + BRICK_GAP),
          y: 50 + row * (BRICK_HEIGHT + 8),
          width: brickWidth,
          height: BRICK_HEIGHT,
          alive: true,
          color: brickColors[row % brickColors.length],
        });
      }
    }
    return list;
  }

  function resetBallPosition() {
    ball.x = paddleX;
    ball.y = paddleY - BALL_RADIUS - 2;
    ball.vx = 0;
    ball.vy = -BALL_SPEED;
    ballLaunched = false;
  }

  function setMessage(text) {
    messageEl.textContent = text;
  }

  function updateGameInfo() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
  }

  function resetGame() {
    paddleX = viewWidth / 2;
    bricks = createBricks();
    score = 0;
    lives = 3;
    gameOver = false;
    lastTimestamp = 0;
    updateGameInfo();
    setMessage('← →でパドル移動 · Spaceでボール発射');
    resetBallPosition();
  }

  function launchBall() {
    if (ballLaunched || gameOver) {
      return;
    }
    ballLaunched = true;
    const angle = (Math.random() * 0.5 + 0.1) * Math.PI;
    ball.vx = BALL_SPEED * Math.cos(angle) * (Math.random() < 0.5 ? -1 : 1);
    ball.vy = -BALL_SPEED * Math.sin(angle);
    setMessage('ブロックを全部壊そう！');
  }

  function handleBallReset() {
    resetBallPosition();
    if (lives > 0 && !gameOver) {
      setMessage('Spaceで次のボールを発射');
    }
  }

  function checkBricksCollision() {
    for (const brick of bricks) {
      if (!brick.alive) {
        continue;
      }
      if (
        ball.x + BALL_RADIUS > brick.x &&
        ball.x - BALL_RADIUS < brick.x + brick.width &&
        ball.y + BALL_RADIUS > brick.y &&
        ball.y - BALL_RADIUS < brick.y + brick.height
      ) {
        brick.alive = false;
        ball.vy *= -1;
        score += 15;
        updateGameInfo();
        return;
      }
    }
  }

  function update(delta) {
    if (gameOver) {
      return;
    }
    const dt = delta / 1000;
    if (keys.a || keys.arrowleft) {
      paddleX -= PADDLE_SPEED * dt;
    }
    if (keys.d || keys.arrowright) {
      paddleX += PADDLE_SPEED * dt;
    }
    paddleX = Math.max(PADDLE_WIDTH / 2, Math.min(viewWidth - PADDLE_WIDTH / 2, paddleX));

    if (!ballLaunched) {
      ball.x = paddleX;
      ball.y = paddleY - BALL_RADIUS - 2;
      return;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - BALL_RADIUS <= 0) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + BALL_RADIUS >= viewWidth) {
      ball.x = viewWidth - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - BALL_RADIUS <= 0) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy);
    }

    if (
      ball.y + BALL_RADIUS >= paddleY &&
      ball.x > paddleX - PADDLE_WIDTH / 2 &&
      ball.x < paddleX + PADDLE_WIDTH / 2 &&
      ball.vy > 0
    ) {
      const hitPos = (ball.x - paddleX) / (PADDLE_WIDTH / 2);
      const bounceAngle = hitPos * (Math.PI / 3);
      ball.vx = BALL_SPEED * Math.sin(bounceAngle);
      ball.vy = -BALL_SPEED * Math.cos(bounceAngle);
    }

    checkBricksCollision();

    const remaining = bricks.some((brick) => brick.alive);
    if (!remaining) {
      gameOver = true;
      ballLaunched = false;
      setMessage('全ブロック制覇！Rで再挑戦');
      return;
    }

    if (ball.y - BALL_RADIUS > viewHeight) {
      lives -= 1;
      updateGameInfo();
      if (lives <= 0) {
        gameOver = true;
        setMessage('ゲームオーバー... Rでリスタート');
      } else {
        handleBallReset();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, paddleY - 4, viewWidth, 6);

    for (const brick of bricks) {
      if (!brick.alive) {
        continue;
      }
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
    }

    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(paddleX - PADDLE_WIDTH / 2, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(paddleX - PADDLE_WIDTH / 2 + 6, paddleY + 3, PADDLE_WIDTH - 12, PADDLE_HEIGHT - 6);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fcd34d';
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function loop(timestamp) {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    update(delta);
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys[key] = true;
    if (event.code === 'Space') {
      event.preventDefault();
      launchBall();
    }
    if (key === 'r') {
      resetGame();
    }
  });

  document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    resetGame();
  });

  resizeCanvas();
  resetGame();
  requestAnimationFrame(loop);
})();
