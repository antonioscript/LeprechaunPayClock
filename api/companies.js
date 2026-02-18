import { getDatabaseAsync } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = await getDatabaseAsync();
    const result = await db.execute('SELECT * FROM companies WHERE active = 1 ORDER BY id');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
}
