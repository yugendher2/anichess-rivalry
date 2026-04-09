import axios from 'axios';

export default async function handler(req: any, res: any) {
  const { wallet, offset, limit } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const url = `https://apiv2.pvp.anichess.com/player/match-history-pagination/${wallet}?offset=${offset || 0}&limit=${limit || 50}`;
    console.log(`Vercel Proxying request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://anichess.com',
        'Referer': 'https://anichess.com/'
      },
      timeout: 10000
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Vercel Proxy error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch data from Anichess API',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}
