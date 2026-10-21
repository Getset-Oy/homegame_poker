import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db/index.js';
import type { Namespace } from 'socket.io';
import { C2S, C2S_LOBBY, S2C_LOBBY, S2C_PLAYER } from '@poker/shared';
import { TableManager } from '../game/TableManager.js';
import { setupPlayerNamespace } from '../socket/player-namespace.js';

function setup() {
  const handlers = new Map<string, (...args: any[]) => any>();
  const emit = vi.fn();
  const socket = { id: 'player-socket', use: vi.fn(), emit, join: vi.fn(), leave: vi.fn(),
    on: (event: string, handler: (...args: any[]) => any) => handlers.set(event, handler) };
  const nsp = { on: (_event: string, handler: (socket: unknown) => void) => handler(socket) } as unknown as Namespace;
  const io = { of: () => ({ to: () => ({ emit: vi.fn() }) }) } as any;
  const tables = new TableManager(io);
  const players = { alice: { id: 'alice', name: 'Alice', avatar_id: '1', balance: 1000 },
    bob: { id: 'bob', name: 'Bob', avatar_id: '2', balance: 1000 } };
  const db = {
    sessions: { create: () => 'new-session-token', find: (token: keyof typeof players) => players[token] ? { player_id: token } : undefined },
    players: { findById: (id: keyof typeof players) => players[id], findByName: () => players.bob,
      updateLastLogin: vi.fn(), verifyPassword: vi.fn(async () => true) },
    balance: { get: () => 1000, update: vi.fn(() => true), logTransaction: vi.fn(), getTransactions: () => [] },
  } as unknown as Database;
  setupPlayerNamespace(nsp, tables, db);
  const trigger = (event: string, data?: unknown) => handlers.get(event)!(data);
  trigger(C2S_LOBBY.SESSION_AUTH, { sessionToken: 'alice' });
  return { trigger, tables, db, emit };
}

describe('Seated account ownership', () => {
  it('does not switch the account behind a funded seat', () => {
    const { trigger, tables, emit } = setup();
    const { tableId } = tables.createTable('nlhe-1-2');
    trigger(C2S_LOBBY.JOIN_TABLE, { tableId, name: 'Alice', buyIn: 100 });
    trigger(C2S_LOBBY.SESSION_AUTH, { sessionToken: 'bob' });
    trigger(C2S_LOBBY.GET_PROFILE);
    expect(emit).toHaveBeenLastCalledWith(S2C_LOBBY.PROFILE_DATA, expect.objectContaining({ name: 'Alice' }));
    expect(emit).toHaveBeenCalledWith(S2C_LOBBY.AUTH_ERROR, expect.any(Object));
  });

  it('requires leaving the first table before joining another with the same socket', () => {
    const { trigger, tables } = setup();
    const first = tables.createTable('nlhe-1-2').tableId!;
    const second = tables.createTable('nlhe-1-2').tableId!;
    trigger(C2S_LOBBY.JOIN_TABLE, { tableId: first, name: 'Alice', buyIn: 100 });
    trigger(C2S_LOBBY.JOIN_TABLE, { tableId: second, name: 'Alice', buyIn: 100 });
    expect(tables.getTable(first)!.getPlayerCount()).toBe(1);
    expect(tables.getTable(second)!.getPlayerCount()).toBe(0);
  });

  it('does not complete an account switch after a seat is taken during password verification', async () => {
    const { trigger, tables, db, emit } = setup();
    let finish!: (valid: boolean) => void;
    vi.mocked(db.players.verifyPassword).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = trigger(C2S_LOBBY.LOGIN, { name: 'Bob', password: 'password' });
    const { tableId } = tables.createTable('nlhe-1-2');
    trigger(C2S_LOBBY.JOIN_TABLE, { tableId, name: 'Alice', buyIn: 100 });
    finish(true);
    await pending;
    trigger(C2S_LOBBY.GET_PROFILE);
    expect(emit).toHaveBeenLastCalledWith(S2C_LOBBY.PROFILE_DATA, expect.objectContaining({ name: 'Alice' }));
  });
});


describe('Reconnect account restoration', () => {
  it('restores a disconnected account from a valid player token on a fresh socket', () => {
    const { trigger, tables, db, emit } = setup();
    const { tableId } = tables.createTable('nlhe-1-2');
    trigger(C2S_LOBBY.JOIN_TABLE, { tableId, name: 'Alice', buyIn: 100 });
    const joined = emit.mock.calls.find(([event]) => event === S2C_PLAYER.JOINED)![1];
    const handlers = new Map<string, (data?: unknown) => void>();
    const newEmit = vi.fn();
    const socket = { id: 'new-socket', use: vi.fn(), emit: newEmit, join: vi.fn(), leave: vi.fn(),
      on: (event: string, handler: (data?: unknown) => void) => handlers.set(event, handler) };
    setupPlayerNamespace({ on: (_event: string, handler: (socket: unknown) => void) => handler(socket) } as unknown as Namespace, tables, db);
    handlers.get(C2S.RECONNECT)!({ ...joined, tableId });
    expect(newEmit).toHaveBeenCalledWith(S2C_PLAYER.RECONNECTED, { playerId: 'alice', tableId });
    handlers.get(C2S_LOBBY.GET_PROFILE)!();
    expect(newEmit).toHaveBeenLastCalledWith(S2C_LOBBY.PROFILE_DATA, expect.objectContaining({ name: 'Alice' }));
  });
});
