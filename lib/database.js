import { createClient } from '@libsql/client';

// LOG IMEDIATO - ANTES DE QUALQUER COISA
console.log('[DB-MODULE-LOAD] Database module loaded');
console.log('[DB-ENV-CHECK] TURSO_CONNECTION_URL exists?', !!process.env.TURSO_CONNECTION_URL);
console.log('[DB-ENV-CHECK] TURSO_AUTH_TOKEN exists?', !!process.env.TURSO_AUTH_TOKEN);

if (!process.env.TURSO_CONNECTION_URL) {
  console.error('[DB-FATAL] TURSO_CONNECTION_URL is missing!');
}
if (!process.env.TURSO_AUTH_TOKEN) {
  console.error('[DB-FATAL] TURSO_AUTH_TOKEN is missing!');
}

let db;
let initPromise = null;
let initError = null;
let initAttempted = false;

export async function initDatabase() {
  console.log('[DB-INIT] initDatabase() called');
  
  // Prevenir múltiplas inicializações
  if (initPromise) {
    console.log('[DB-INIT] Database initialization already in progress, returning existing promise');
    return initPromise;
  }

  // Criar nova promise
  initPromise = (async () => {
    initAttempted = true;
    console.log('[DB-INIT-START] Iniciando inicialização do banco de dados...');
    
    try {
      // Validar variáveis de ambiente
      console.log('[DB-ENV-CHECK] Verificando variáveis de ambiente...');
      console.log('[DB-ENV-CHECK] TURSO_CONNECTION_URL:', process.env.TURSO_CONNECTION_URL ? '✅ PRESENTE' : '❌ AUSENTE');
      console.log('[DB-ENV-CHECK] TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ PRESENTE' : '❌ AUSENTE');
      
      if (!process.env.TURSO_CONNECTION_URL) {
        throw new Error('TURSO_CONNECTION_URL não configurada');
      }
      if (!process.env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_AUTH_TOKEN não configurada');
      }

      console.log('[DB-CLIENT] Criando cliente Turso...');
      db = createClient({
        url: process.env.TURSO_CONNECTION_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      console.log('[DB-CLIENT] ✅ Cliente criado');

      // Teste de conexão
      console.log('[DB-TEST] Testando conexão com Turso...');
      const testResult = await db.execute('SELECT 1 as test');
      console.log('[DB-TEST] ✅ Conexão bem-sucedida');

      // Criar tabelas
      console.log('[DB-TABLES] Criando tabelas...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL CHECK (type IN ('CLT', 'PJ')),
          salary_monthly REAL,
          hourly_rate REAL,
          start_date DATE NOT NULL,
          active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS earnings_history (
          id INTEGER PRIMARY KEY,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          total_earned REAL NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(month, year)
        );
      `);
      console.log('[DB-TABLES] ✅ Tabelas criadas');

      // Checar dados
      console.log('[DB-DATA] Verificando dados iniciais...');
      const result = await db.execute('SELECT COUNT(*) as count FROM companies');
      const count = result.rows[0].count;

      if (count === 0) {
        console.log('[DB-DATA] Inserindo dados iniciais...');
        await seedDatabase();
        console.log('[DB-DATA] ✅ Dados inseridos');
      } else {
        console.log(`[DB-DATA] ✅ Database já tem ${count} empresas`);
        console.log('[DB-DATA] Verificando empresas obrigatórias ausentes...');
        await seedDatabase();
      }
      
      console.log('[DB-SUCCESS] ✅ Banco de dados inicializado com sucesso!');
      return db;
      
    } catch (error) {
      console.error('[DB-ERROR] ❌ Erro durante inicialização:', error.message);
      console.error('[DB-ERROR] Stack:', error.stack);
      initError = error;
      throw error;
    }
  })();

  return initPromise;
}

async function seedDatabase() {
  const companies = [
    { name: 'Almatar', type: 'CLT', salary_monthly: 14560, start_date: '2026-03-09' },
    { name: 'Safra', type: 'CLT', salary_monthly: 5800, start_date: '2026-01-01' },
    { name: 'Itaú', type: 'CLT', salary_monthly: 5100, start_date: '2026-01-01' },
    { name: 'Genial Investimentos', type: 'PJ', hourly_rate: 59.52, start_date: '2026-01-01' },
    { name: 'Grupo SC', type: 'PJ', hourly_rate: 66.00, start_date: '2026-02-01' },
    { name: 'Motz', type: 'CLT', salary_monthly: 10000, start_date: '2026-02-01' },
    { name: 'Pepsi', type: 'CLT', salary_monthly: 20000, start_date: '2026-01-01' },
    { name: 'Founday', type: 'CLT', salary_monthly: 10000, start_date: '2026-02-23' }
  ];

  for (const company of companies) {
    await db.execute({
      sql: `INSERT INTO companies (name, type, salary_monthly, hourly_rate, start_date)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          type = excluded.type,
          salary_monthly = excluded.salary_monthly,
          hourly_rate = excluded.hourly_rate,
          start_date = excluded.start_date`,
      args: [
        company.name,
        company.type,
        company.salary_monthly || null,
        company.hourly_rate || null,
        company.start_date
      ]
    });
  }

  const earningsHistoryExists = await db.execute({
    sql: `SELECT COUNT(*) as count FROM earnings_history WHERE month = ? AND year = ?`,
    args: [1, 2026]
  });

  if (earningsHistoryExists.rows[0].count === 0) {
    await db.execute({
      sql: `INSERT INTO earnings_history (month, year, total_earned)
            VALUES (?, ?, ?)`,
      args: [1, 2026, 35023.81]
    });
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function getDatabaseAsync() {
  console.log('[DB-GET] Solicitando acesso ao banco...');
  
  if (initError) {
    console.error('[DB-GET] Erro anterior detectado:', initError.message);
    throw initError;
  }
  
  if (initPromise) {
    console.log('[DB-GET] Aguardando inicialização...');
    try {
      await initPromise;
      console.log('[DB-GET] ✅ Inicialização completada');
    } catch (error) {
      console.error('[DB-GET] Erro na promise:', error.message);
      throw error;
    }
  } else {
    console.warn('[DB-GET] ⚠️  initPromise é null!');
  }
  
  if (!db) {
    console.error('[DB-GET] ❌ db é null após inicialização!');
    throw new Error('db é null - inicialização falhou');
  }
  
  console.log('[DB-GET] ✅ Retornando instância do banco');
  return db;
}

export function getInitStatus() {
  return {
    attempted: initAttempted,
    initialized: !!db,
    error: initError ? initError.message : null,
    hasPromise: !!initPromise
  };
}

export function getInitError() {
  return initError;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
  }
  db = null;
  initPromise = null;
  initError = null;
}
