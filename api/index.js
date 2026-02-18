import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import express from 'express';
import cors from 'cors';
import { initDatabase } from '../lib/database.js';
import companiesHandler from './companies.js';
import earningsHandler from './earnings.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Flag para rastrear inicialização
let databaseReady = false;

// Inicializar banco de dados
try {
  await initDatabase();
  databaseReady = true;
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

// Middleware para garantir que db está pronta
app.use((req, res, next) => {
  if (!databaseReady) {
    return res.status(503).json({ error: 'Database not ready' });
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
  res.json({ status: 'ok', database: databaseReady });
});

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

app.listen(PORT, () => {
  console.log(`🎯 Leprechaun PayClock rodando em http://localhost:${PORT}`);
});
