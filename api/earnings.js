import { getDatabase } from '../lib/database.js';

export default function handler(req, res) {
  const db = getDatabase();

  if (req.method === 'GET') {
    // Buscar ganho de janeiro (mês 1)
    const earnings = db.prepare(
      'SELECT * FROM earnings_history WHERE month = 1 AND year = 2026'
    ).get();

    if (!earnings) {
      return res.json({ month: 1, year: 2026, total_earned: 0 });
    }

    res.json(earnings);
  } else if (req.method === 'POST') {
    // Atualizar ganho de janeiro
    const { total_earned } = req.body;

    if (!total_earned || typeof total_earned !== 'number') {
      return res.status(400).json({ error: 'total_earned is required and must be a number' });
    }

    db.prepare(
      'INSERT OR REPLACE INTO earnings_history (month, year, total_earned) VALUES (?, ?, ?)'
    ).run(1, 2026, total_earned);

    res.json({ success: true, month: 1, year: 2026, total_earned });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
