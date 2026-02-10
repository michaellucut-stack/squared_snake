export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const CELL_SIZE = 12;
  const TICK_MS = 100;

  let cameraX = 0;
  let cameraY = 0;

  let prevState = null;
  let currentState = null;
  let stateTime = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function pushState(state) {
    prevState = currentState;
    currentState = state;
    stateTime = performance.now();
  }

  function centerCamera(headX, headY) {
    cameraX = headX * CELL_SIZE - canvas.width / 2;
    cameraY = headY * CELL_SIZE - canvas.height / 2;
  }

  function lerpSegments(prevSegs, currSegs, t) {
    if (!prevSegs || prevSegs.length === 0) return currSegs;
    const result = [];
    for (let i = 0; i < currSegs.length; i++) {
      if (i < prevSegs.length) {
        const lx = prevSegs[i][0] + (currSegs[i][0] - prevSegs[i][0]) * t;
        const ly = prevSegs[i][1] + (currSegs[i][1] - prevSegs[i][1]) * t;
        result.push([lx, ly]);
      } else {
        result.push(currSegs[i]);
      }
    }
    return result;
  }

  function render(gameState, playerId) {
    // If gameState is a new state from server, push it
    if (currentState !== gameState) {
      pushState(gameState);
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!currentState) return;

    const t = Math.min(1, (performance.now() - stateTime) / TICK_MS);
    const snakes = currentState.snakes || [];

    // Build a map from prevState snakes by id for interpolation
    const prevSnakeMap = new Map();
    if (prevState && prevState.snakes) {
      prevState.snakes.forEach(s => prevSnakeMap.set(s.id, s));
    }

    // Interpolate snake positions
    const interpolatedSnakes = snakes.map(snake => {
      const prev = prevSnakeMap.get(snake.id);
      let segments = snake.segments;
      if (prev && prev.segments && prev.segments.length > 0) {
        segments = lerpSegments(prev.segments, snake.segments, t);
      }
      return { ...snake, segments };
    });

    // Find own snake for camera
    const ownSnake = interpolatedSnakes.find(s => s.id === playerId);
    if (ownSnake && ownSnake.segments.length > 0) {
      centerCamera(ownSnake.segments[0][0], ownSnake.segments[0][1]);
    }

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    drawGrid(200, 200);
    drawFood(currentState.food || []);
    drawSnakes(interpolatedSnakes);
    drawArenaBorder(200, 200);

    ctx.restore();
  }

  function drawGrid(arenaW, arenaH) {
    // Draw subtle grid lines
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5;

    // Calculate visible range
    const startX = Math.max(0, Math.floor(cameraX / CELL_SIZE));
    const endX = Math.min(arenaW, Math.ceil((cameraX + canvas.width) / CELL_SIZE) + 1);
    const startY = Math.max(0, Math.floor(cameraY / CELL_SIZE));
    const endY = Math.min(arenaH, Math.ceil((cameraY + canvas.height) / CELL_SIZE) + 1);

    for (let x = startX; x <= endX; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, startY * CELL_SIZE);
      ctx.lineTo(x * CELL_SIZE, endY * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y++) {
      ctx.beginPath();
      ctx.moveTo(startX * CELL_SIZE, y * CELL_SIZE);
      ctx.lineTo(endX * CELL_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }
  }

  function drawArenaBorder(arenaW, arenaH) {
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, arenaW * CELL_SIZE, arenaH * CELL_SIZE);
  }

  function drawFood(food) {
    food.forEach(([x, y]) => {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawSnakes(snakes) {
    snakes.forEach(snake => {
      if (!snake.segments || snake.segments.length === 0) return;

      const color = snake.color || '#4ecdc4';

      // Draw body segments
      snake.segments.forEach((seg, i) => {
        const [x, y] = seg;
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        // Head is slightly different
        if (i === 0) {
          ctx.fillStyle = color;
          ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          // Draw eyes on head based on direction
          drawEyes(ctx, px, py, snake.direction || 'right', color);
        } else {
          // Body with slight darkening toward tail
          const factor = 1 - (i / snake.segments.length) * 0.3;
          ctx.fillStyle = adjustBrightness(color, factor);
          ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      });

      // Draw name above head
      if (snake.name) {
        const [hx, hy] = snake.segments[0];
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(snake.name, hx * CELL_SIZE + CELL_SIZE / 2, hy * CELL_SIZE - 5);
      }
    });
  }

  function drawEyes(ctx, px, py, direction, color) {
    ctx.fillStyle = '#ffffff';
    const s = CELL_SIZE;
    let e1, e2; // eye positions
    switch (direction) {
      case 'up':    e1 = [px + s*0.3, py + s*0.3]; e2 = [px + s*0.7, py + s*0.3]; break;
      case 'down':  e1 = [px + s*0.3, py + s*0.7]; e2 = [px + s*0.7, py + s*0.7]; break;
      case 'left':  e1 = [px + s*0.3, py + s*0.3]; e2 = [px + s*0.3, py + s*0.7]; break;
      case 'right': e1 = [px + s*0.7, py + s*0.3]; e2 = [px + s*0.7, py + s*0.7]; break;
    }
    const eyeR = CELL_SIZE * 0.15;
    const pupilR = eyeR * 0.5;
    ctx.beginPath(); ctx.arc(e1[0], e1[1], eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2[0], e2[1], eyeR, 0, Math.PI * 2); ctx.fill();
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(e1[0], e1[1], pupilR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2[0], e2[1], pupilR, 0, Math.PI * 2); ctx.fill();
  }

  function adjustBrightness(hex, factor) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${Math.round(r*factor)},${Math.round(g*factor)},${Math.round(b*factor)})`;
  }

  window.addEventListener('resize', resize);
  resize();

  return { render, resize, pushState };
}
