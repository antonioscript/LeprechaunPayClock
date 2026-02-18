import { getDatabaseAsync } from '../lib/database.js';

export default async function handler(req, res) {
  try {
    const db = await getDatabaseAsync();

    if (req.method === 'GET') {
      // Buscar ganho de janeiro (mês 1)
      const result = await db.execute({
        sql: 'SELECT * FROM earnings_history WHERE month = 1 AND year = 2026',
        args: []
      });

      if (!result.rows || result.rows.length === 0) {
        return res.json({ month: 1, year: 2026, total_earned: 0 });
      }

      res.json(result.rows[0]);
    } else if (req.method === 'POST') {
      // Atualizar ganho de janeiro
      const { total_earned } = req.body;

      if (!total_earned || typeof total_earned !== 'number') {
        return res.status(400).json({ error: 'total_earned is required and must be a number' });
      }

      await db.execute({
        sql: 'INSERT OR REPLACE INTO earnings_history (month, year, total_earned) VALUES (?, ?, ?)',
        args: [1, 2026, total_earned]
      });

      res.json({ success: true, month: 1, year: 2026, total_earned });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in earnings handler:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
