import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for Anichess
  app.get('/api/proxy/match-history', async (req, res) => {
    const { wallet, offset, limit } = req.query;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
      const url = `https://apiv2.pvp.anichess.com/player/match-history-pagination/${wallet}?offset=${offset || 0}&limit=${limit || 50}`;
      const response = await axios.get(url);
      res.json(response.data);
    } catch (error: any) {
      console.error('Proxy error:', error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch data from Anichess API',
        details: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
