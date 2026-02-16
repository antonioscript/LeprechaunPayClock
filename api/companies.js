import { getDatabase } from '../lib/database.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const db = getDatabase();
  const companies = db.prepare('SELECT * FROM companies WHERE active = 1 ORDER BY id').all();

  res.json({ data: companies });
}
