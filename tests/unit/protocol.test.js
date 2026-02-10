import { describe, it, expect } from 'vitest';
import { MSG, encode, decode } from '../../server/protocol.js';

describe('protocol', () => {
  describe('MSG constants', () => {
    it('MSG has all expected type constants', () => {
      expect(MSG).toHaveProperty('JOIN');
      expect(MSG).toHaveProperty('DIRECTION');
      expect(MSG).toHaveProperty('PONG');
      expect(MSG).toHaveProperty('JOIN_ACK');
      expect(MSG).toHaveProperty('STATE');
      expect(MSG).toHaveProperty('DEATH');
      expect(MSG).toHaveProperty('RESPAWN');
      expect(MSG).toHaveProperty('PING');
      expect(MSG).toHaveProperty('PLAYER_COUNT');
      expect(MSG).toHaveProperty('ERROR');
    });
  });

  describe('encode', () => {
    it('encode creates valid JSON with type and payload', () => {
      const result = encode(MSG.JOIN, { name: 'Player1' });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        type: MSG.JOIN,
        payload: { name: 'Player1' }
      });
    });

    it('encode with empty payload', () => {
      const result = encode(MSG.PING);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        type: MSG.PING,
        payload: undefined
      });
    });
  });

  describe('decode', () => {
    it('decode parses valid JSON message', () => {
      const raw = JSON.stringify({ type: MSG.JOIN, payload: { name: 'Player1' } });
      const result = decode(raw);
      expect(result).toEqual({
        type: MSG.JOIN,
        payload: { name: 'Player1' }
      });
    });

    it('decode returns null for invalid JSON', () => {
      const result = decode('not valid json');
      expect(result).toBeNull();
    });

    it('decode returns null for message missing type field', () => {
      const raw = JSON.stringify({ payload: { name: 'Player1' } });
      const result = decode(raw);
      expect(result).toBeNull();
    });

    it('decode returns null for empty string', () => {
      const result = decode('');
      expect(result).toBeNull();
    });
  });

  describe('roundtrip', () => {
    it('encode then decode preserves data', () => {
      const original = { name: 'Player1', score: 100 };
      const encoded = encode(MSG.JOIN, original);
      const decoded = decode(encoded);
      expect(decoded).toEqual({
        type: MSG.JOIN,
        payload: original
      });
    });
  });
});
