import { getDatabaseAsync } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('📥 GET /api/companies - waiting for database');
    const db = await getDatabaseAsync();
    console.log('✅ Database ready, executing query');
    
    const result = await db.execute('SELECT * FROM companies WHERE active = 1 ORDER BY id');
    console.log(`✅ Found ${result.rows.length} companies`);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('❌ Error in GET /api/companies:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to fetch companies' });
  }
}
