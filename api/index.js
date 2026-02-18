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

// Inicializar banco de dados
await initDatabase();

// Servir arquivos estáticos
app.use(express.static('public'));

// Rotas de API
app.get('/api/companies', (req, res) => companiesHandler(req, res));
app.get('/api/earnings', (req, res) => earningsHandler(req, res));
app.post('/api/earnings', (req, res) => earningsHandler(req, res));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

app.listen(PORT, () => {
  console.log(`🎯 Leprechaun PayClock rodando em http://localhost:${PORT}`);
});
