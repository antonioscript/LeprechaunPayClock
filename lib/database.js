import { createClient } from '@libsql/client';

let db;
let initPromise = null;

export async function initDatabase() {
  // Se já está inicializando, espera pela mesma promise
  if (initPromise) {
    return initPromise;
  }

  // Cria promise que será reutilizada
  initPromise = (async () => {
    try {
      console.log('🔄 Iniciando conexão com Turso...');
      
      // Validar variáveis de ambiente
      if (!process.env.TURSO_CONNECTION_URL) {
        throw new Error('Missing TURSO_CONNECTION_URL environment variable');
      }
      if (!process.env.TURSO_AUTH_TOKEN) {
        throw new Error('Missing TURSO_AUTH_TOKEN environment variable');
      }

      // Conectar ao Turso
      db = createClient({
        url: process.env.TURSO_CONNECTION_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });

      console.log('✅ Conectado ao Turso');

      // Criar tabelas se não existirem
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

      console.log('✅ Tabelas criadas/verificadas');

      // Verificar se há dados iniciais
      const result = await db.execute('SELECT COUNT(*) as count FROM companies');
      const count = result.rows[0].count;

      if (count === 0) {
        console.log('📝 Inserindo dados iniciais...');
        await seedDatabase();
        console.log('✅ Dados iniciais inseridos');
      } else {
        console.log(`✅ Database já possui ${count} empresas`);
      }

      return db;
    } catch (error) {
      console.error('❌ Erro ao inicializar database:', error.message);
      console.error(error);
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

  // Inserir ganho de Janeiro
  await db.execute({
    sql: `INSERT INTO earnings_history (month, year, total_earned)
          VALUES (?, ?, ?)`,
    args: [1, 2026, 35023.81]
  });
}

// Função síncrona (para middleware)
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Função assíncrona que espera pela inicialização
export async function getDatabaseAsync() {
  if (initPromise) {
    await initPromise;
  }
  if (!db) {
    throw new Error('Database initialization failed');
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
  }
  db = null;
  initPromise = null;
}
