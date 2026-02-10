export function computeViewport(headX, headY, halfSize = 25) {
  return {
    minX: headX - halfSize,
    maxX: headX + halfSize,
    minY: headY - halfSize,
    maxY: headY + halfSize,
  };
}

export function isInViewport(viewport, x, y) {
  return x >= viewport.minX && x <= viewport.maxX && y >= viewport.minY && y <= viewport.maxY;
}

export function cullSnakes(snakes, viewport) {
  // Return snakes that have at least one segment in the viewport
  return snakes.filter(snake => {
    if (!snake.segments || snake.segments.length === 0) return false;
    return snake.segments.some(([x, y]) => isInViewport(viewport, x, y));
  });
}

export function cullFood(food, viewport) {
  return food.filter(([x, y]) => isInViewport(viewport, x, y));
}

export function cullStateForPlayer(state, playerId) {
  const snakesArray = Array.from(state.snakes.values()).map(s => ({
    id: s.id,
    name: s.name,
    segments: s.segments,
    direction: s.direction,
    alive: s.alive,
    score: s.score,
    color: s.color,
  }));

  // Find this player's snake
  const playerSnake = state.snakes.get(playerId);
  if (!playerSnake || !playerSnake.alive || playerSnake.segments.length === 0) {
    // Dead or spectating — send full leaderboard but minimal state
    return {
      tick: state.tick,
      snakes: [],
      food: [],
      leaderboard: buildLeaderboard(state),
    };
  }

  const [headX, headY] = playerSnake.segments[0];
  const viewport = computeViewport(headX, headY);

  return {
    tick: state.tick,
    snakes: cullSnakes(snakesArray, viewport),
    food: cullFood(state.food, viewport),
    leaderboard: buildLeaderboard(state),
  };
}

function buildLeaderboard(state) {
  return Array.from(state.snakes.values())
    .filter(s => s.alive)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => ({ name: s.name, score: s.score }));
}
