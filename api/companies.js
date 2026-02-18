import { getDatabase } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM companies WHERE active = 1 ORDER BY id');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
