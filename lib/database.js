import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database.sqlite');

let db;

export function initDatabase() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Criar tabelas se não existirem
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS earnings_history (
      id INTEGER PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_earned REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(month, year)
    );
  `);

  // Verificar se há dados iniciais
  const count = db.prepare('SELECT COUNT(*) as count FROM companies').get();
  if (count.count === 0) {
    seedDatabase();
  }

  return db;
}

function seedDatabase() {
  const companies = [
    { name: 'Safra', type: 'CLT', salary_monthly: 5800, start_date: '2026-01-01' },
    { name: 'Itaú', type: 'CLT', salary_monthly: 5100, start_date: '2026-01-01' },
    { name: 'Genial Investimentos', type: 'PJ', hourly_rate: 59.52, start_date: '2026-01-01' },
    { name: 'Grupo SC', type: 'PJ', hourly_rate: 66.00, start_date: '2026-02-01' },
    { name: 'Motz', type: 'CLT', salary_monthly: 10000, start_date: '2026-02-01' },
    { name: 'Pepsi', type: 'CLT', salary_monthly: 20000, start_date: '2026-01-01' },
    { name: 'Founday', type: 'CLT', salary_monthly: 10000, start_date: '2026-02-23' }
  ];

  const stmt = db.prepare(`
    INSERT INTO companies (name, type, salary_monthly, hourly_rate, start_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const company of companies) {
      stmt.run(
        company.name,
        company.type,
        company.salary_monthly || null,
        company.hourly_rate || null,
        company.start_date
      );
    }
  });

  transaction();

  // Inserir ganho de Janeiro
  db.prepare(`
    INSERT INTO earnings_history (month, year, total_earned)
    VALUES (?, ?, ?)
  `).run(1, 2026, 35023.81);
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
  }
}
