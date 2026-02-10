// Message format: { type: "join", payload: { name: "Player1" } }
export const MSG = {
  JOIN: 'join',
  DIRECTION: 'direction',
  PONG: 'pong',
  JOIN_ACK: 'join_ack',
  STATE: 'state',
  DEATH: 'death',
  RESPAWN: 'respawn',
  PING: 'ping',
  PLAYER_COUNT: 'player_count',
  ERROR: 'error',
};

export function encode(type, payload) {
  return JSON.stringify({ type, payload });
}

export function decode(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.type) {
      return null;
    }
    return {
      type: parsed.type,
      payload: parsed.payload || null,
    };
  } catch (err) {
    return null;
  }
}
