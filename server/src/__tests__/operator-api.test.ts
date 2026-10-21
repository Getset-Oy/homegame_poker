import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../app.js';
import type { Database } from '../db/index.js';

let server: Server;
let base: string;
const archive = vi.fn(() => 1);
const savePositions = vi.fn();
const db = { bugs: { getAll: () => [{ description: 'private report' }], archive }, layout: { savePositions } } as unknown as Database;

beforeEach(async () => {
  vi.stubEnv('EDITOR_API_TOKEN', 'test-operator-token');
  vi.clearAllMocks();
  server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  vi.unstubAllEnvs();
});

const post = (path: string, body: unknown, token?: string) => fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

describe('Operator HTTP access', () => {
  it('prevents anonymous configuration changes and report archival', async () => {
    for (const [path, body] of [
      ['/api/animation-config', { DELAY_POT_AWARD_MS: 1 }],
      ['/api/animation-config/reset', {}],
      ['/api/layout-positions', {}],
      ['/api/bugs/archive', { ids: [1] }],
    ] as const) expect((await post(path, body)).status).toBe(401);
    expect((await fetch(base + '/api/bugs')).status).toBe(401);
    expect(archive).not.toHaveBeenCalled();
    expect(savePositions).not.toHaveBeenCalled();
  });

  it('fails closed with no configured token, even with a supplied credential', async () => {
    vi.stubEnv('EDITOR_API_TOKEN', '');
    expect((await post('/api/bugs/archive', { ids: [1] }, 'anything')).status).toBe(503);
    expect(archive).not.toHaveBeenCalled();
  });

  it('allows operator actions and keeps public game configuration readable', async () => {
    expect((await post('/api/bugs/archive', { ids: [1] }, 'wrong')).status).toBe(401);
    expect((await post('/api/bugs/archive', { ids: [1] }, 'test-operator-token')).status).toBe(200);
    expect(archive).toHaveBeenCalledWith([1]);
    expect((await fetch(base + '/api/animation-config')).status).toBe(200);
    expect((await post('/api/animation-config', { DELAY_POT_AWARD_MS: -1 }, 'test-operator-token')).status).toBe(400);
  });
});
