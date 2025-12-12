function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function circleIntersectsRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function brickColorForHp(hp) {
  if (hp >= 3) return '#a78bfa';
  if (hp >= 2) return '#60a5fa';
  return '#34d399';
}

export function createBlocksManager() {
  let viewWidth = 0;
  let viewHeight = 0;

  let bricks = [];

  let respawnElapsedMs = 0;
  let respawnRequiredHits = 1;

  const BRICK_ROWS = 4;
  const BRICK_COLS = 8;
  const BRICK_GAP = 10;
  const BRICK_HEIGHT = 20;
  const palette = ['#f87171', '#fb923c', '#facc15', '#34d399', '#38bdf8'];

  function setViewport({ width, height }) {
    viewWidth = width;
    viewHeight = height;
  }

  function createInitialBricks() {
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
          hp: 1,
          color: palette[row % palette.length],
        });
      }
    }
    return list;
  }

  function reset() {
    bricks = createInitialBricks();
    respawnElapsedMs = 0;
    respawnRequiredHits = 1;
  }

  function hasRemaining() {
    return bricks.some((brick) => brick.hp > 0);
  }

  function spawnRespawnBrick() {
    const width = pickRandom([52, 60, 68]);
    const height = BRICK_HEIGHT;
    const x = Math.random() * (viewWidth - width - 24) + 12;
    const y = Math.random() * Math.max(90, viewHeight * 0.45 - height) + 40;

    bricks.push({
      x,
      y,
      width,
      height,
      hp: respawnRequiredHits,
      color: brickColorForHp(respawnRequiredHits),
    });

    respawnRequiredHits += 0.25;
  }

  function update(deltaMs) {
    respawnElapsedMs += deltaMs;
    if (respawnElapsedMs >= 30000) {
      respawnElapsedMs = 0;
      if (viewWidth > 0 && viewHeight > 0) {
        spawnRespawnBrick();
      }
    }
  }

  function destroyNearby({ x, y, radius }) {
    if (!radius || radius <= 0) return 0;
    const radiusSq = radius * radius;
    let destroyed = 0;
    for (const brick of bricks) {
      if (brick.hp <= 0) continue;
      const cx = brick.x + brick.width / 2;
      const cy = brick.y + brick.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      if (dx * dx + dy * dy <= radiusSq) {
        brick.hp = 0;
        destroyed += 1;
      }
    }
    return destroyed;
  }

  function handleBallCollision(ball, { blastRadius = 0 } = {}) {
    for (const brick of bricks) {
      if (brick.hp <= 0) continue;
      if (!circleIntersectsRect(ball, brick)) continue;

      brick.hp -= 1;
      const destroyed = brick.hp <= 0 ? 1 : 0;
      const destroyedNearby = destroyed
        ? destroyNearby({ x: ball.x, y: ball.y, radius: blastRadius })
        : 0;

      ball.vy *= -1;

      return {
        hit: true,
        destroyedCount: destroyed + destroyedNearby,
        scoreDelta: 15 + destroyedNearby * 10,
      };
    }
    return { hit: false, destroyedCount: 0, scoreDelta: 0 };
  }

  function draw(ctx) {
    for (const brick of bricks) {
      if (brick.hp <= 0) continue;
      const tint = brick.hp > 1 ? brickColorForHp(brick.hp) : brick.color;
      ctx.fillStyle = tint;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

      if (brick.hp > 1) {
        ctx.save();
        ctx.fillStyle = '#020617';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.ceil(brick.hp)), brick.x + brick.width / 2, brick.y + brick.height / 2 + 1);
        ctx.restore();
      }
    }
  }

  return {
    setViewport,
    reset,
    update,
    draw,
    hasRemaining,
    handleBallCollision,
  };
}
