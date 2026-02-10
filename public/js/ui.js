export function createUI() {
  // Create player count display
  const playerCount = document.createElement('div');
  playerCount.id = 'player-count';
  playerCount.textContent = 'Players: 0';
  document.body.appendChild(playerCount);

  // Create score display
  const scoreDisplay = document.createElement('div');
  scoreDisplay.id = 'score-display';
  scoreDisplay.textContent = 'Score: 0';
  document.body.appendChild(scoreDisplay);

  // Create death overlay
  const deathOverlay = document.createElement('div');
  deathOverlay.id = 'death-overlay';
  deathOverlay.innerHTML = `
    <div class="death-content">
      <h2>You died!</h2>
      <p id="death-score">Score: 0</p>
      <p id="death-countdown">Respawning in 3...</p>
    </div>
  `;
  deathOverlay.style.display = 'none';
  document.body.appendChild(deathOverlay);

  let countdownInterval = null;

  function updatePlayerCount(count) {
    playerCount.textContent = `Players: ${count}`;
  }

  function updateScore(score) {
    scoreDisplay.textContent = `Score: ${score}`;
  }

  function showDeath(score) {
    const deathScore = document.getElementById('death-score');
    const countdown = document.getElementById('death-countdown');
    deathScore.textContent = `Score: ${score}`;
    deathOverlay.style.display = 'flex';

    let remaining = 3;
    countdown.textContent = `Respawning in ${remaining}...`;

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        deathOverlay.style.display = 'none';
      } else {
        countdown.textContent = `Respawning in ${remaining}...`;
      }
    }, 1000);
  }

  function hideDeath() {
    deathOverlay.style.display = 'none';
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // Create minimap canvas
  const minimapContainer = document.createElement('div');
  minimapContainer.id = 'minimap-container';
  const minimapCanvas = document.createElement('canvas');
  minimapCanvas.id = 'minimap';
  minimapCanvas.width = 150;
  minimapCanvas.height = 150;
  minimapContainer.appendChild(minimapCanvas);
  document.body.appendChild(minimapContainer);
  const minimapCtx = minimapCanvas.getContext('2d');

  // Create leaderboard
  const leaderboard = document.createElement('div');
  leaderboard.id = 'leaderboard';
  leaderboard.innerHTML = '<h3>Leaderboard</h3><ol id="leaderboard-list"></ol>';
  document.body.appendChild(leaderboard);

  function drawMinimap(snakes, food, playerId, arenaWidth = 200, arenaHeight = 200) {
    const scale = 150 / arenaWidth;
    minimapCtx.fillStyle = '#0a0a1e';
    minimapCtx.fillRect(0, 0, 150, 150);

    // Draw food dots
    minimapCtx.fillStyle = 'rgba(255, 107, 107, 0.5)';
    (food || []).forEach(([x, y]) => {
      minimapCtx.fillRect(x * scale, y * scale, 1, 1);
    });

    // Draw other snakes
    (snakes || []).forEach(snake => {
      if (snake.segments.length === 0) return;
      const isOwn = snake.id === playerId;
      minimapCtx.fillStyle = isOwn ? '#4ecdc4' : '#ffffff';
      const [hx, hy] = snake.segments[0];
      const dotSize = isOwn ? 4 : 2;
      minimapCtx.fillRect(hx * scale - dotSize/2, hy * scale - dotSize/2, dotSize, dotSize);
    });

    // Draw viewport rectangle for own snake
    const own = (snakes || []).find(s => s.id === playerId);
    if (own && own.segments.length > 0) {
      const [hx, hy] = own.segments[0];
      minimapCtx.strokeStyle = '#4ecdc4';
      minimapCtx.lineWidth = 1;
      minimapCtx.strokeRect((hx - 25) * scale, (hy - 25) * scale, 50 * scale, 50 * scale);
    }
  }

  function updateLeaderboard(entries) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = (entries || []).map((e, i) =>
      `<li>${e.name}: ${e.score}</li>`
    ).join('');
  }

  function showHighScores(scores) {
    // Create or update high scores display in leaderboard area
    let highScoreEl = document.getElementById('high-scores');
    if (!highScoreEl) {
      highScoreEl = document.createElement('div');
      highScoreEl.id = 'high-scores';
      document.body.appendChild(highScoreEl);
    }
    highScoreEl.innerHTML = '<h3>All-Time Best</h3>' +
      (scores || []).map((s, i) => `<div>${i + 1}. ${s.name}: ${s.score}</div>`).join('');
  }

  return { updatePlayerCount, updateScore, showDeath, hideDeath, drawMinimap, updateLeaderboard, showHighScores };
}
