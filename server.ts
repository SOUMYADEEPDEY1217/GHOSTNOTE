import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './api/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const distIndex = path.join(distPath, 'index.html');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start';

  if (!isProduction || !fs.existsSync(distIndex)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: `API route not found: ${req.path}` });
        return;
      }
      if (req.method === 'GET') {
        res.sendFile(distIndex);
        return;
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GHOSTNOTE server listening on http://localhost:${PORT}`);
  });
}

startServer();
