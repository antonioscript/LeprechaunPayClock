import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import express from 'express';
import cors from 'cors';
import { initDatabase, getInitError } from '../lib/database.js';
import companiesHandler from './companies.js';
import earningsHandler from './earnings.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar database
let databaseInitialized = false;

console.log('🔄 Iniciando aplicação...');
initDatabase()
  .then(() => {
    databaseInitialized = true;
    console.log('✅ Database initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error.message);
    console.error('Stack:', error.stack);
  });

// Middleware para garantir que db está pronta
app.use((req, res, next) => {
  const initError = getInitError();
  if (initError) {
    console.log('❌ Request blocked - database init error:', initError.message);
    return res.status(503).json({ 
      error: 'Database initialization failed',
      details: initError.message 
    });
  }
  if (!databaseInitialized) {
    console.log('⏳ Request blocked - database still initializing');
    return res.status(503).json({ error: 'Database initializing...' });
  }
  next();
});

// Servir arquivos estáticos
app.use(express.static('public'));

// Rotas de API
app.get('/api/companies', (req, res) => companiesHandler(req, res));
app.get('/api/earnings', (req, res) => earningsHandler(req, res));
app.post('/api/earnings', (req, res) => earningsHandler(req, res));

// Health check
app.get('/api/health', (req, res) => {
  const initError = getInitError();
  res.json({ 
    status: 'ok', 
    database: databaseInitialized,
    error: initError ? initError.message : null,
    timestamp: new Date().toISOString()
  });
});

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

const server = app.listen(PORT, () => {
  console.log(`🎯 Leprechaun PayClock rodando em http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
