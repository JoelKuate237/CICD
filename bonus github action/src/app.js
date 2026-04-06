// ============================================================
// FICHIER : src/app.js
// Application Express - Bonus GitHub Actions
// Meme application que les TPs GitLab, adaptee pour GitHub
// ============================================================

const express = require('express');
const app = express();
app.use(express.json());

// --- Donnees en memoire (simule une base de donnees) ---
const users = [
  { id: 1, name: 'Alice Dupont', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob Martin', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Charlie Durand', email: 'charlie@example.com', role: 'user' }
];

// --- ROUTE : GET / ---
app.get('/', (req, res) => {
  res.json({
    message: 'API Bonus - GitHub Actions CI/CD',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- ROUTE : GET /health ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- ROUTE : GET /api/users ---
app.get('/api/users', (req, res) => {
  res.json(users);
});

// --- ROUTE : GET /api/users/:id ---
app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouve' });
  }
  res.json(user);
});

// --- ROUTE : POST /api/users ---
app.post('/api/users', (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name et email sont requis' });
  }
  const newUser = {
    id: users.length + 1,
    name,
    email,
    role: role || 'user'
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Export pour les tests (supertest)
module.exports = app;

// Demarrage du serveur uniquement si execute directement
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur demarre sur le port ${PORT}`);
  });
}
