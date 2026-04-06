// ============================================================
// FICHIER : src/index.js
// Application Express pour le TP2 Blue/Green
//
// Cette application expose les endpoints attendus par :
//   - les smoke tests (smoke-tests.sh)
//   - le guide du TP2 (curl http://localhost/health, etc.)
// ============================================================

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Identifiant de l'environnement (blue ou green)
// Injecte par docker-compose via la variable APP_ENV
const APP_ENV = process.env.APP_ENV || 'unknown';
const APP_VERSION = process.env.APP_VERSION || '0.0.0';

// Timestamp de demarrage (pour calculer l'uptime)
const START_TIME = Date.now();

// Liste des utilisateurs en memoire (jeu de donnees fictif)
// Dans un vrai projet, ces donnees viendraient d'une base de donnees
const users = [
  { id: 1, fullName: 'Jean DUPONT', age: 30 },
  { id: 2, fullName: 'Marie MARTIN', age: 25 },
  { id: 3, fullName: 'Pierre DURAND', age: 35 }
];

// ------------------------------------------------------------
// ROUTE : GET /health
// Verifie que l'application est en vie
// Utilise par :
//   - Docker (healthcheck dans docker-compose)
//   - Les smoke tests (smoke-tests.sh)
//   - Traefik (monitoring)
// ------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    environment: APP_ENV,
    version: APP_VERSION
  });
});

// ------------------------------------------------------------
// ROUTE : GET /api/users
// Retourne la liste complete des utilisateurs
// ------------------------------------------------------------
app.get('/api/users', (req, res) => {
  res.json(users);
});

// ------------------------------------------------------------
// ROUTE : GET /api/users/:id
// Retourne un utilisateur specifique par son ID
// Retourne 404 si l'utilisateur n'existe pas
// ------------------------------------------------------------
app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouve' });
  }

  res.json(user);
});

// ------------------------------------------------------------
// ROUTE : GET /
// Page d'accueil : indique quel environnement repond (Blue/Green)
// Utile pour verifier visuellement la bascule
// ------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    message: 'TP2 Blue/Green Demo',
    environment: APP_ENV,
    version: APP_VERSION
  });
});

// ------------------------------------------------------------
// DEMARRAGE DU SERVEUR
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`  Serveur demarre sur le port ${PORT}`);
  console.log(`  Environnement : ${APP_ENV}`);
  console.log(`  Version       : ${APP_VERSION}`);
  console.log('===========================================');
});
