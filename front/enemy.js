function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1]?.value;
}

export function createEnemyManager() {
  let viewWidth = 0;
  let viewHeight = 0;

  const enemies = [];
  let spawnElapsedMs = 0;

  function setViewport({ width, height }) {
    viewWidth = width;
    viewHeight = height;
  }

  function reset() {
    enemies.length = 0;
    spawnElapsedMs = 0;
  }

  function spawnEnemy() {
    const radius = 14;
    const x = randomBetween(radius + 8, viewWidth - radius - 8);
    const y = randomBetween(90, Math.max(110, viewHeight * 0.45));
    const speed = randomBetween(90, 140);
    const angle = randomBetween(0, Math.PI * 2);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const dropType = pickWeighted([
      { value: 'candy', weight: 0.25 },
      { value: 'red', weight: 0.25 },
      { value: 'blue', weight: 0.25 },
      { value: 'green', weight: 0.25 },
    ]);

    enemies.push({
      x,
      y,
      vx,
      vy,
      radius,
      bounces: 0,
      alpha: 1,
      fading: false,
      dropType,
    });
  }

  function update(deltaMs) {
    spawnElapsedMs += deltaMs;
    if (spawnElapsedMs >= 10000) {
      spawnElapsedMs = 0;
      if (viewWidth > 0 && viewHeight > 0) {
        spawnEnemy();
      }
    }

    const dt = deltaMs / 1000;
    for (const enemy of enemies) {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      if (enemy.x - enemy.radius <= 0) {
        enemy.x = enemy.radius;
        enemy.vx = Math.abs(enemy.vx);
        enemy.bounces += 1;
      }
      if (enemy.x + enemy.radius >= viewWidth) {
        enemy.x = viewWidth - enemy.radius;
        enemy.vx = -Math.abs(enemy.vx);
        enemy.bounces += 1;
      }
      if (enemy.y - enemy.radius <= 0) {
        enemy.y = enemy.radius;
        enemy.vy = Math.abs(enemy.vy);
        enemy.bounces += 1;
      }
      if (enemy.y + enemy.radius >= viewHeight) {
        enemy.y = viewHeight - enemy.radius;
        enemy.vy = -Math.abs(enemy.vy);
        enemy.bounces += 1;
      }

      if (!enemy.fading && enemy.bounces >= 10) {
        enemy.fading = true;
      }

      if (enemy.fading) {
        enemy.alpha -= deltaMs / 900;
      }
    }

    for (let idx = enemies.length - 1; idx >= 0; idx -= 1) {
      if (enemies[idx].alpha <= 0) {
        enemies.splice(idx, 1);
      }
    }
  }

  function handleBallCollisions(balls) {
    const drops = [];
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      for (const ball of balls) {
        const dx = ball.x - enemy.x;
        const dy = ball.y - enemy.y;
        const r = ball.radius + enemy.radius;
        if (dx * dx + dy * dy <= r * r) {
          ball.vy *= -1;
          enemies.splice(i, 1);
          drops.push({ x: enemy.x, y: enemy.y, type: enemy.dropType });
          break;
        }
      }
    }
    return drops;
  }

  function draw(ctx) {
    for (const enemy of enemies) {
      ctx.save();
      ctx.globalAlpha = clamp(enemy.alpha, 0, 1);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fb7185';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', enemy.x, enemy.y + 1);
      ctx.restore();
    }
  }

  return {
    setViewport,
    reset,
    update,
    draw,
    handleBallCollisions,
  };
}
