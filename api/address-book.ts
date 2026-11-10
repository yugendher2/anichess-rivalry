import fs from 'fs';
import path from 'path';

// Note: On Vercel, the file system is read-only in production.
// This will work in local dev but will not persist globally on Vercel without a database.
const ADDRESS_BOOK_PATH = path.join(process.cwd(), 'address-book.json');

export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(ADDRESS_BOOK_PATH)) {
        fs.writeFileSync(ADDRESS_BOOK_PATH, JSON.stringify({}));
      }
      const data = fs.readFileSync(ADDRESS_BOOK_PATH, 'utf-8');
      res.status(200).json(JSON.parse(data));
    } catch (error) {
      res.status(200).json({});
    }
  } else if (req.method === 'POST') {
    try {
      // This will likely fail on Vercel production due to read-only filesystem
      fs.writeFileSync(ADDRESS_BOOK_PATH, JSON.stringify(req.body, null, 2));
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Vercel Save Error:', error.message);
      res.status(500).json({ error: 'Failed to save address book', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
