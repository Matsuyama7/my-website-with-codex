import { createBlocksManager } from './blocks.js';
import { createEnemyManager } from './enemy.js';
import { createItemManager } from './items.js';

export function createBreakoutGame({
  ctx,
  scoreEl,
  livesEl,
  messageEl,
  onClear,
} = {}) {
  let viewWidth = 0;
  let viewHeight = 0;
  let paddleX = 0;
  let paddleY = 0;
  let balls = [];
  let score = 0;
  let lives = 3;
  let ballLaunched = false;
  let gameOver = false;
  let didClearCallback = false;
  let lastTimestamp = 0;
  let elapsedMs = 0;

  let paddleSpeedMultiplier = 1;
  let paddleWidthMultiplier = 1;
  let blastRadius = 0;
  let multiBallUntilMs = 0;

  const particles = [];

  const blocks = createBlocksManager();
  const enemies = createEnemyManager();
  const items = createItemManager();


  let leftPressed = false;
  let rightPressed = false;

  const PADDLE_SPEED = 360;
  const PADDLE_WIDTH = 120;
  const PADDLE_HEIGHT = 14;
  const PADDLE_Y_OFFSET = 34;
  const BALL_RADIUS = 6;
  const BALL_SPEED = 280;
  const MAX_BALLS = 3;

  function effectivePaddleSpeed() {
    return PADDLE_SPEED * paddleSpeedMultiplier;
  }

  function effectivePaddleWidth() {
    return Math.min(viewWidth - 24, PADDLE_WIDTH * paddleWidthMultiplier);
  }

  function setMessage(text) {
    if (!messageEl) return;
    messageEl.textContent = text;
  }

  function updateGameInfo() {
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = lives;
  }

  function setViewport({ width, height }) {
    viewWidth = width;
    viewHeight = height;
    paddleY = viewHeight - PADDLE_Y_OFFSET;
    blocks?.setViewport({ width, height });
    enemies?.setViewport({ width, height });
    items?.setViewport({ width, height });
  }

  function resetBallPosition() {
    balls = [
      {
        x: paddleX,
        y: paddleY - BALL_RADIUS - 2,
        vx: 0,
        vy: -BALL_SPEED,
        radius: BALL_RADIUS,
      },
    ];
    ballLaunched = false;
  }

  function resetGame() {
    paddleX = viewWidth / 2;
    blocks?.reset();
    enemies?.reset();
    items?.reset();
    particles.length = 0;
    score = 0;
    lives = 3;
    gameOver = false;
    didClearCallback = false;
    lastTimestamp = 0;
    elapsedMs = 0;
    paddleSpeedMultiplier = 1;
    paddleWidthMultiplier = 1;
    blastRadius = 0;
    multiBallUntilMs = 0;
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
    const dir = Math.random() < 0.5 ? -1 : 1;
    const base = balls[0];
    base.vx = BALL_SPEED * Math.cos(angle) * dir;
    base.vy = -BALL_SPEED * Math.sin(angle);
    setMessage('ブロックを全部壊そう！');
  }

  function handleBallReset() {
    resetBallPosition();
    if (lives > 0 && !gameOver) {
      setMessage('Spaceで次のボールを発射');
    }
  }

  function spawnSparkles({ x, y, count = 18, color = '#fef08a' }) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeMs: 500 + Math.random() * 600,
        color,
      });
    }
  }

  function applyItem(type) {
    if (!items) return;
    if (type === 'candy') {
      multiBallUntilMs = Math.max(multiBallUntilMs, elapsedMs + 10000);
      if (ballLaunched && balls.length === 1) {
        const base = balls[0];
        for (let i = 0; i < 2 && balls.length < MAX_BALLS; i += 1) {
          const spread = (i === 0 ? -1 : 1) * (0.25 + Math.random() * 0.25);
          balls.push({
            x: base.x,
            y: base.y,
            vx: base.vx * Math.cos(spread) - base.vy * Math.sin(spread),
            vy: base.vx * Math.sin(spread) + base.vy * Math.cos(spread),
            radius: base.radius,
          });
        }
      }
    } else if (type === 'red') {
      blastRadius += 18;
    } else if (type === 'blue') {
      paddleSpeedMultiplier = Math.min(2.2, paddleSpeedMultiplier + 0.15);
    } else if (type === 'green') {
      paddleWidthMultiplier = Math.min(2.2, paddleWidthMultiplier * 1.2);
    }
  }

  function update(deltaMs) {
    if (gameOver) {
      return;
    }
    elapsedMs += deltaMs;
    const dt = deltaMs / 1000;
    if (leftPressed) {
      paddleX -= effectivePaddleSpeed() * dt;
    }
    if (rightPressed) {
      paddleX += effectivePaddleSpeed() * dt;
    }
    const paddleWidth = effectivePaddleWidth();
    paddleX = Math.max(paddleWidth / 2, Math.min(viewWidth - paddleWidth / 2, paddleX));

    if (!ballLaunched) {
      balls[0].x = paddleX;
      balls[0].y = paddleY - BALL_RADIUS - 2;
      return;
    }

    blocks?.update(deltaMs);
    enemies?.update(deltaMs);
    items?.update(deltaMs);

    for (const particle of particles) {
      particle.lifeMs -= deltaMs;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    for (let idx = particles.length - 1; idx >= 0; idx -= 1) {
      if (particles[idx].lifeMs <= 0) {
        particles.splice(idx, 1);
      }
    }

    if (multiBallUntilMs && elapsedMs > multiBallUntilMs) {
      multiBallUntilMs = 0;
      if (balls.length > 1) {
        balls.splice(1);
      }
    }

    for (const ball of balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.radius >= viewWidth) {
        ball.x = viewWidth - ball.radius;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
      }

      if (
        ball.y + ball.radius >= paddleY &&
        ball.x > paddleX - paddleWidth / 2 &&
        ball.x < paddleX + paddleWidth / 2 &&
        ball.vy > 0
      ) {
        const hitPos = (ball.x - paddleX) / (paddleWidth / 2);
        const bounceAngle = hitPos * (Math.PI / 3);
        ball.vx = BALL_SPEED * Math.sin(bounceAngle);
        ball.vy = -BALL_SPEED * Math.cos(bounceAngle);
      }

      const blockResult = blocks?.handleBallCollision(ball, { blastRadius }) ?? { hit: false, scoreDelta: 0 };
      if (blockResult.hit) {
        score += blockResult.scoreDelta;
        updateGameInfo();
      }
    }

    const drops = enemies?.handleBallCollisions(balls) ?? [];
    for (const drop of drops) {
      items?.spawnItem(drop);
      score += 25;
      updateGameInfo();
    }

    const picked = items?.collectByPaddle({
      paddleX,
      paddleY,
      paddleWidth,
      paddleHeight: PADDLE_HEIGHT,
    }) ?? [];
    for (const type of picked) {
      applyItem(type);
      setMessage(items?.describe(type) ?? '');
      spawnSparkles({ x: paddleX, y: paddleY, count: 24, color: '#a7f3d0' });
    }

    const remaining = blocks?.hasRemaining?.() ?? true;
    if (!remaining) {
      gameOver = true;
      ballLaunched = false;
      setMessage('ゲームクリア！Rでコンティニュー');
      if (!didClearCallback) {
        didClearCallback = true;
        if (onClear) onClear();
      }
      return;
    }

    for (let idx = balls.length - 1; idx >= 0; idx -= 1) {
      if (balls[idx].y - balls[idx].radius > viewHeight) {
        balls.splice(idx, 1);
      }
    }

    if (balls.length === 0) {
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
    if (!ctx) return;
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, paddleY - 4, viewWidth, 6);

    blocks?.draw(ctx);
    enemies?.draw(ctx);
    items?.draw(ctx);

    for (const particle of particles) {
      const alpha = Math.max(0, Math.min(1, particle.lifeMs / 700));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const paddleWidth = effectivePaddleWidth();
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(paddleX - paddleWidth / 2, paddleY, paddleWidth, PADDLE_HEIGHT);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(paddleX - paddleWidth / 2 + 6, paddleY + 3, paddleWidth - 12, PADDLE_HEIGHT - 6);

    for (const ball of balls) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fcd34d';
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function tick(timestamp) {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    update(delta);
    draw();
  }

  function setMoveState({ left, right }) {
    leftPressed = Boolean(left);
    rightPressed = Boolean(right);
  }

  function isCleared() {
    return gameOver && !(blocks?.hasRemaining?.() ?? true) && lives > 0;
  }

  function isGameOver() {
    return gameOver && lives <= 0;
  }

  return {
    setViewport,
    resetGame,
    launchBall,
    tick,
    setMoveState,
    isCleared,
    isGameOver,
  };
}
