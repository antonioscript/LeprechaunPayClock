import { initDatabase, getDatabaseAsync } from '../lib/database.js';

export default async function handler(req, res) {
  console.log('[COMPANIES-HANDLER] Iniciando handler para GET /api/companies');
  
  // Garantir que DB está inicializado
  try {
    await initDatabase();
  } catch (error) {
    console.error('[COMPANIES-HANDLER] Erro ao chamar initDatabase:', error.message);
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('[COMPANIES-HANDLER] Pedindo database async...');
    const db = await getDatabaseAsync();
    console.log('[COMPANIES-HANDLER] ✅ Database obtido, executando query');
    
    const result = await db.execute('SELECT * FROM companies WHERE active = 1 ORDER BY id');
    console.log(`[COMPANIES-HANDLER] ✅ Retornando ${result.rows.length} empresas`);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('[COMPANIES-HANDLER] ❌ Erro:', error.message);
    console.error('[COMPANIES-HANDLER] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to fetch companies' });
  }
}
