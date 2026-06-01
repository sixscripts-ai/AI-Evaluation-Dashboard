// Load .env before any module code that reads process.env
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import app from './src/app.js';

const PORT = 3000;

async function startDevServer() {
  // In development, attach Vite middleware
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EvalBench Console] full-stack workspace running on Port ${PORT}`);
  });
}

startDevServer().catch((error) => {
  console.error('[EvalBench Boot Exception]: ', error);
  process.exit(1);
});
