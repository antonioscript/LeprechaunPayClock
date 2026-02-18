import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('[START] Iniciando aplicação...');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('[CONFIG] Loading .env from:', path.join(__dirname, '..', '.env.local'));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('[CONFIG] Variáveis de ambiente:');
console.log('[CONFIG] - TURSO_CONNECTION_URL:', process.env.TURSO_CONNECTION_URL ? 'SET' : 'NOT SET');
console.log('[CONFIG] - TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('[CONFIG] - NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import cors from 'cors';
import { initDatabase, getInitStatus, getInitError } from '../lib/database.js';
import companiesHandler from './companies.js';
import earningsHandler from './earnings.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let databaseInitialized = false;

console.log('[INIT] Chamando initDatabase()...');
initDatabase()
  .then(() => {
    databaseInitialized = true;
    console.log('[INIT] ✅ Promise resolvida com sucesso');
  })
  .catch((error) => {
    console.error('[INIT] ❌ Promise rejeitada:', error.message);
    console.error('[INIT] Stack:', error.stack);
  });

app.use((req, res, next) => {
  const status = getInitStatus();
  console.log(`[REQUEST] ${req.method} ${req.path} - DB Status:`, status);
  
  const initError = getInitError();
  if (initError) {
    console.log('[REQUEST] ❌ Bloqueando - erro de inicialização');
    return res.status(503).json({ 
      error: 'Database initialization failed',
      details: initError.message 
    });
  }
  if (!databaseInitialized) {
    console.log('[REQUEST] ⏳ Bloqueando - ainda inicializando');
    return res.status(503).json({ error: 'Database still initializing' });
  }
  next();
});

app.use(express.static('public'));

app.get('/api/companies', (req, res) => companiesHandler(req, res));
app.get('/api/earnings', (req, res) => earningsHandler(req, res));
app.post('/api/earnings', (req, res) => earningsHandler(req, res));

app.get('/api/health', (req, res) => {
  const status = getInitStatus();
  res.json({ 
    status: 'ok', 
    database: databaseInitialized,
    initStatus: status,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug', (req, res) => {
  const status = getInitStatus();
  res.json({
    env: {
      hasURL: !!process.env.TURSO_CONNECTION_URL,
      hasToken: !!process.env.TURSO_AUTH_TOKEN,
      NODE_ENV: process.env.NODE_ENV
    },
    status
  });
});

app.get('*', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

const server = app.listen(PORT, () => {
  console.log(`[LISTEN] 🎯 Servidor rodando em http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM recebido');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor fechado');
    process.exit(0);
  });
});
