import express, { type RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import { setAnimDelays, getAnimConfig, resetAnimDelays } from '@poker/shared';
import type { Database } from './db/index.js';

export function createApp(db: Database) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  // Operator credentials stay server-side; never bake them into VITE_* variables.
  const requireOperator: RequestHandler = (req, res, next) => {
    const token = process.env.EDITOR_API_TOKEN;
    if (!token) {
      res.status(503).json({ error: 'Operator API is not configured' });
      return;
    }
    const expected = Buffer.from(`Bearer ${token}`);
    const supplied = Buffer.from(req.get('authorization') || '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      res.status(401).json({ error: 'Operator authorization required' });
      return;
    }
    next();
  };
  app.get('/api/animation-config', (_req, res) => res.json(getAnimConfig()));
  app.post('/api/animation-config', requireOperator, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)
      || Object.entries(req.body).some(([key, val]) => !Object.prototype.hasOwnProperty.call(getAnimConfig(), key)
        || typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 60000)) {
      res.status(400).json({ error: 'Delays must be known keys with values from 0 to 60000 ms' });
      return;
    }
    setAnimDelays(req.body);
    res.json(getAnimConfig());
  });
  app.post('/api/animation-config/reset', requireOperator, (_req, res) => {
    resetAnimDelays();
    res.json(getAnimConfig());
  });

  // Layout positions — stored in DB, synced to source code via CLI skill
  app.get('/api/layout-positions', (_req, res) => {
    const data = db.layout.getPositions();
    res.json(data ?? { error: 'no positions saved yet' });
  });
  app.post('/api/layout-positions', requireOperator, (req, res) => {
    db.layout.savePositions(req.body);
    res.json({ ok: true });
  });

  app.get('/api/bugs', requireOperator, (_req, res) => res.json(db.bugs.getAll()));
  app.post('/api/bugs/archive', requireOperator, (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => Number.isSafeInteger(id) && (id as number) > 0)) {
      res.status(400).json({ error: 'ids must be an array of numbers' });
      return;
    }
    const archived = db.bugs.archive(ids);
    res.json({ archived });
  });
  return app;
}
