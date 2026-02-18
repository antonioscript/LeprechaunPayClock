import { createClient } from '@libsql/client';

let db;
let initPromise = null;
let initError = null;
let initAttempted = false;

export async function initDatabase() {
  // Prevenir múltiplas inicializações
  if (initPromise) {
    console.log('ℹ️  Database initialization already in progress');
    return initPromise;
  }

  // Criar nova promise
  initPromise = (async () => {
    initAttempted = true;
    console.log('[INIT START] Iniciando inicialização do banco de dados...');
    
    try {
      // Validar variáveis de ambiente
      console.log('[ENV CHECK] Verificando variáveis de ambiente...');
      console.log('[ENV CHECK] TURSO_CONNECTION_URL:', process.env.TURSO_CONNECTION_URL ? '✅ PRESENTE' : '❌ AUSENTE');
      console.log('[ENV CHECK] TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ PRESENTE' : '❌ AUSENTE');
      
      if (!process.env.TURSO_CONNECTION_URL) {
        throw new Error('TURSO_CONNECTION_URL não configurada');
      }
      if (!process.env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_AUTH_TOKEN não configurada');
      }

      console.log('[CLIENT] Criando cliente Turso...');
      db = createClient({
        url: process.env.TURSO_CONNECTION_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      console.log('[CLIENT] ✅ Cliente criado');

      // Teste de conexão
      console.log('[TEST] Testando conexão com Turso...');
      const testResult = await db.execute('SELECT 1 as test');
      console.log('[TEST] ✅ Conexão bem-sucedida');

      // Criar tabelas
      console.log('[TABLES] Criando tabelas...');
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
      console.log('[TABLES] ✅ Tabelas criadas');

      // Checar dados
      console.log('[DATA] Verificando dados iniciais...');
      const result = await db.execute('SELECT COUNT(*) as count FROM companies');
      const count = result.rows[0].count;

      if (count === 0) {
        console.log('[DATA] Inserindo dados iniciais...');
        await seedDatabase();
        console.log('[DATA] ✅ Dados inseridos');
      } else {
        console.log(`[DATA] ✅ Database já tem ${count} empresas`);
      }
      
      console.log('[INIT SUCCESS] ✅ Banco de dados inicializado com sucesso!');
      return db;
      
    } catch (error) {
      console.error('[INIT ERROR] ❌ Erro durante inicialização:', error.message);
      console.error('[INIT ERROR] Stack:', error.stack);
      initError = error;
      throw error;
    }
  })();

  return initPromise;
}

async function seedDatabase() {
  const companies = [
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
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        company.name,
        company.type,
        company.salary_monthly || null,
        company.hourly_rate || null,
        company.start_date
      ]
    });
  }

  await db.execute({
    sql: `INSERT INTO earnings_history (month, year, total_earned)
          VALUES (?, ?, ?)`,
    args: [1, 2026, 35023.81]
  });
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function getDatabaseAsync() {
  console.log('[GET DB] Solicitando acesso ao banco...');
  
  if (initError) {
    console.error('[GET DB] Erro anterior detectado:', initError.message);
    throw initError;
  }
  
  if (initPromise) {
    console.log('[GET DB] Aguardando inicialização...');
    try {
      await initPromise;
      console.log('[GET DB] ✅ Inicialização completada');
    } catch (error) {
      console.error('[GET DB] Erro na promise:', error.message);
      throw error;
    }
  } else {
    console.warn('[GET DB] ⚠️  initPromise é null!');
  }
  
  if (!db) {
    console.error('[GET DB] ❌ db é null após inicialização!');
    throw new Error('db é null - inicialização falhou');
  }
  
  console.log('[GET DB] ✅ Retornando instância do banco');
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

export async function closeDatabase() {
  if (db) {
    await db.close();
  }
  db = null;
  initPromise = null;
  initError = null;
}
