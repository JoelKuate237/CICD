// ============================================================
// FICHIER : src/index.js
// API Express de demonstration pour le TP1 CI/CD
// ============================================================

const express = require('express');

const app = express();
app.use(express.json());

// Route racine : message de bienvenue
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API TP1 CI/CD' });
});

// Route sante : verifie que l'API est en ligne
// Utile pour les health checks en production
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route addition : additionne deux nombres passes dans l'URL
// Exemple : GET /add/2/3 retourne { result: 5 }
app.get('/add/:a/:b', (req, res) => {
  const a = parseFloat(req.params.a);
  const b = parseFloat(req.params.b);
  if (isNaN(a) || isNaN(b)) {
    return res.status(400).json({ error: 'Parametres invalides' });
  }
  res.json({ result: a + b });
});

// On exporte l'app pour que les tests puissent l'importer via supertest
module.exports = app;

// On demarre le serveur SEULEMENT si le fichier est execute directement
// (pas quand il est importe par les tests)
// C'est un pattern tres important pour pouvoir tester une API Express
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur demarre sur le port ${PORT}`);
  });
}
