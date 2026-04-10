import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADDRESS_BOOK_PATH = path.join(process.cwd(), 'address-book.json');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Address Book API
  app.get('/api/address-book', async (req, res) => {
    try {
      const data = await fs.readFile(ADDRESS_BOOK_PATH, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.json({});
    }
  });

  app.post('/api/address-book', async (req, res) => {
    try {
      await fs.writeFile(ADDRESS_BOOK_PATH, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save address book' });
    }
  });

  // API Proxy for Anichess
  app.get('/api/proxy/match-history', async (req, res) => {
    const { wallet, offset, limit } = req.query;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
      const url = `https://apiv2.pvp.anichess.com/player/match-history-pagination/${wallet}?offset=${offset || 0}&limit=${limit || 50}`;
      console.log(`Proxying request to: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://anichess.com',
          'Referer': 'https://anichess.com/'
        },
        timeout: 10000 // 10s timeout
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error('Proxy error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch data from Anichess API',
        message: error.message,
        details: error.response?.data || 'No additional details'
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
