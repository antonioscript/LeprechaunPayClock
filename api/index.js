import express from 'express';
import cors from 'cors';
import { initDatabase, getInitStatus, getInitError } from '../lib/database.js';
import companiesHandler from './companies.js';
import earningsHandler from './earnings.js';

// Log de inicialização - PRIMEIRO SEMPRE
console.log('[START] Iniciando aplicação...');
console.log('[CONFIG] NODE_ENV:', process.env.NODE_ENV);
console.log('[CONFIG] - TURSO_CONNECTION_URL:', process.env.TURSO_CONNECTION_URL ? '✅ SET' : '❌ NOT SET');
console.log('[CONFIG] - TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ SET' : '❌ NOT SET');

// Tentar carregar .env.local apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  try {
    import('dotenv').then(dotenv => {
      import('path').then(path => {
        import('url').then(url => {
          const { fileURLToPath } = url.default;
          const __dirname = path.default.dirname(fileURLToPath(import.meta.url));
          dotenv.default.config({ path: path.default.join(__dirname, '..', '.env.local') });
          console.log('[CONFIG] .env.local carregado (desenvolvimento)');
        });
      });
    }).catch(err => {
      console.log('[CONFIG] dotenv não disponível (ok em produção)');
    });
  } catch (err) {
    console.log('[CONFIG] dotenv não disponível (ok em produção)');
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let databaseInitialized = false;

console.log('[INIT] Chamando initDatabase()...');
initDatabase()
  .then(() => {
    databaseInitialized = true;
    console.log('[INIT] ✅ Database Promise resolvida com sucesso');
  })
  .catch((error) => {
    console.error('[INIT] ❌ Database Promise rejeitada:', error.message);
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
