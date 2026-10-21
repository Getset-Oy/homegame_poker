import { describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io';
import { C2S, C2S_LOBBY } from '@poker/shared';
import { validatePayload } from '../socket/validate-payload.js';

describe('Socket payload boundary', () => {
  it('rejects malformed unauthenticated packets before handlers can touch them', () => {
    let middleware: (packet: [string, unknown], next: (error?: Error) => void) => void = () => {};
    validatePayload({ use: (fn: typeof middleware) => { middleware = fn; } } as unknown as Socket);
    for (const packet of [
      [C2S_LOBBY.CREATE_TABLE, null], [C2S_LOBBY.LOGIN, { name: [], password: true }],
      [C2S_LOBBY.DEPOSIT, { amount: '100' }], [C2S_LOBBY.DEPOSIT, { amount: Infinity }],
      [C2S.ACTION, { action: 'raise', amount: NaN }], [C2S.CHAT, { message: {} }],
      [C2S.RECONNECT, { playerId: 'victim', tableId: 'table' }],
    ] as [string, unknown][]) {
      const next = vi.fn();
      middleware(packet, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    }
    const next = vi.fn();
    middleware([C2S.ACTION, { action: 'fold' }], next);
    expect(next).toHaveBeenCalledWith();
  });
});
