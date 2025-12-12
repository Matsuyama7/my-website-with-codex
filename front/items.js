function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const ITEM_META = {
  candy: { emoji: '🍬', label: 'キャンディー: 10秒間ボールが3つに分裂' },
  red: { emoji: '🔴', label: '赤丸: ブロック破壊範囲アップ(永続)' },
  blue: { emoji: '🔵', label: '青丸: パドル速度アップ(永続)' },
  green: { emoji: '🟢', label: '緑丸: パドル幅アップ(永続)' },
};

export function createItemManager() {
  let viewWidth = 0;
  let viewHeight = 0;

  const items = [];

  function setViewport({ width, height }) {
    viewWidth = width;
    viewHeight = height;
  }

  function reset() {
    items.length = 0;
  }

  function spawnItem({ x, y, type }) {
    const meta = ITEM_META[type];
    if (!meta) return;
    items.push({
      x,
      y,
      type,
      radius: 12,
      vy: 120,
      alpha: 1,
    });
  }

  function update(deltaMs) {
    const dt = deltaMs / 1000;
    for (const item of items) {
      item.y += item.vy * dt;
      if (item.y - item.radius > viewHeight) {
        item.alpha = 0;
      }
    }
    for (let idx = items.length - 1; idx >= 0; idx -= 1) {
      if (items[idx].alpha <= 0) {
        items.splice(idx, 1);
      }
    }
  }

  function collectByPaddle({ paddleX, paddleY, paddleWidth, paddleHeight }) {
    const picked = [];
    const rect = {
      x: paddleX - paddleWidth / 2,
      y: paddleY,
      width: paddleWidth,
      height: paddleHeight,
    };
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      const closestX = clamp(item.x, rect.x, rect.x + rect.width);
      const closestY = clamp(item.y, rect.y, rect.y + rect.height);
      const dx = item.x - closestX;
      const dy = item.y - closestY;
      if (dx * dx + dy * dy <= item.radius * item.radius) {
        items.splice(i, 1);
        picked.push(item.type);
      }
    }
    return picked;
  }

  function draw(ctx) {
    for (const item of items) {
      const meta = ITEM_META[item.type];
      if (!meta) continue;
      ctx.save();
      ctx.globalAlpha = clamp(item.alpha, 0, 1);
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.emoji, item.x, item.y);
      ctx.restore();
    }
  }

  function describe(type) {
    return ITEM_META[type]?.label ?? '';
  }

  return {
    setViewport,
    reset,
    spawnItem,
    update,
    draw,
    collectByPaddle,
    describe,
  };
}
