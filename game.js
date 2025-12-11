(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('game-score');
  const messageEl = document.getElementById('game-message');
  const pxRatio = window.devicePixelRatio || 1;

  let viewWidth = 0;
  let viewHeight = 0;
  let playerX = 0;
  let playerY = 0;
  let bullets = [];
  let enemies = [];
  let enemyDir = 1;
  let score = 0;
  let lastShotTime = 0;
  let gameOver = false;
  let shooting = false;
  let lastTimestamp = 0;

  const keys = {};
  const enemySprites = collectPageEmojis();

  const PLAYER_SPEED = 220;
  const BULLET_SPEED = 360;
  const ENEMY_SPEED = 40;
  const ENEMY_DROP = 32;
  const SHOT_COOLDOWN = 400;

  function collectPageEmojis() {
    const text = document.querySelector('main').innerText;
    const matches = [...text.matchAll(/\p{Extended_Pictographic}/gu)].map((m) => m[0]);
    const unique = [...new Set(matches)];
    return unique.length ? unique : ['👾', '🚀', '💥', '💣'];
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * pxRatio;
    canvas.height = rect.height * pxRatio;
    ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
    viewWidth = rect.width;
    viewHeight = rect.height;
    playerY = viewHeight - 34;
  }

  function createEnemies() {
    const rows = 4;
    const cols = 8;
    const spacingX = 70;
    const spacingY = 56;
    const totalWidth = (cols - 1) * spacingX;
    const startX = Math.max(40, viewWidth / 2 - totalWidth / 2);
    const startY = 70;
    const list = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = (row * cols + col) % enemySprites.length;
        list.push({
          x: startX + col * spacingX,
          y: startY + row * spacingY,
          emoji: enemySprites[index],
          alive: true,
        });
      }
    }
    return list;
  }

  function resetGame() {
    playerX = viewWidth / 2;
    bullets = [];
    enemies = createEnemies();
    enemyDir = 1;
    score = 0;
    gameOver = false;
    shooting = false;
    lastShotTime = 0;
    scoreEl.textContent = score;
    messageEl.textContent = 'WASDで移動・スペースで発射';
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function spawnBullet() {
    bullets.push({
      x: playerX,
      y: playerY - 10,
    });
  }

  function update(delta) {
    if (gameOver) {
      return;
    }

    const dt = delta / 1000;
    if (keys.a || keys.arrowleft) {
      playerX -= PLAYER_SPEED * dt;
    }
    if (keys.d || keys.arrowright) {
      playerX += PLAYER_SPEED * dt;
    }
    if (keys.w || keys.arrowup) {
      playerY -= PLAYER_SPEED * dt;
    }
    if (keys.s || keys.arrowdown) {
      playerY += PLAYER_SPEED * dt;
    }

    playerX = clamp(playerX, 16, viewWidth - 16);
    playerY = clamp(playerY, viewHeight / 2, viewHeight - 16);

    const now = performance.now();
    if (shooting && now - lastShotTime > SHOT_COOLDOWN) {
      spawnBullet();
      lastShotTime = now;
    }

    bullets = bullets
      .map((bullet) => ({ x: bullet.x, y: bullet.y - BULLET_SPEED * dt }))
      .filter((bullet) => bullet.y > -10);

    let edgeHit = false;
    enemies = enemies.map((enemy) => {
      if (!enemy.alive) {
        return enemy;
      }

      const nextX = enemy.x + enemyDir * ENEMY_SPEED * dt;
      const exceedsLeft = nextX - 20 < 0;
      const exceedsRight = nextX + 20 > viewWidth;
      if (exceedsLeft || exceedsRight) {
        edgeHit = true;
      }

      return { ...enemy, x: nextX };
    });

    if (edgeHit) {
      enemyDir *= -1;
      enemies = enemies.map((enemy) => {
        if (!enemy.alive) {
          return enemy;
        }
        return { ...enemy, y: enemy.y + ENEMY_DROP };
      });
    }

    bullets.forEach((bullet) => {
      enemies.forEach((enemy) => {
        if (!enemy.alive) {
          return;
        }
        const collided = Math.abs(bullet.x - enemy.x) < 24 && Math.abs(bullet.y - enemy.y) < 20;
        if (collided) {
          enemy.alive = false;
          bullet.hit = true;
          score += 10;
        }
      });
    });

    bullets = bullets.filter((bullet) => !bullet.hit);

    const aliveEnemies = enemies.filter((enemy) => enemy.alive);
    if (!aliveEnemies.length) {
      gameOver = true;
      messageEl.textContent = '全滅！Rキーでリスタート';
    } else {
      const reachedPlayer = aliveEnemies.some((enemy) => enemy.y >= playerY - 24);
      if (reachedPlayer) {
        gameOver = true;
        messageEl.textContent = 'Game Over... Rキーで再挑戦';
      }
    }

    scoreEl.textContent = score;
  }

  function draw() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '34px "Press Start 2P", monospace';
    enemies.forEach((enemy) => {
      if (!enemy.alive) {
        return;
      }
      ctx.fillStyle = '#f472b6';
      ctx.fillText(enemy.emoji, enemy.x, enemy.y);
    });

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(playerX - 16, playerY - 12, 32, 16);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(playerX - 12, playerY - 8, 24, 12);

    ctx.fillStyle = '#fef3c7';
    bullets.forEach((bullet) => {
      ctx.fillRect(bullet.x - 3, bullet.y - 12, 6, 10);
    });
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
      shooting = true;
      event.preventDefault();
    }
    if (event.key.toLowerCase() === 'r') {
      resetGame();
    }
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    keys[key] = false;
    if (event.code === 'Space') {
      shooting = false;
    }
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    resetGame();
  });

  resizeCanvas();
  resetGame();
  requestAnimationFrame(loop);
})();
