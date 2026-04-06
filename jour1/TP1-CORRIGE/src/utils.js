// ============================================================
// FICHIER : src/utils.js
// Fonctions utilitaires pures pour les tests unitaires
// Pas de dependances externes, pas d'effets de bord
// ============================================================

// Additionne deux nombres
function add(a, b) {
  return a + b;
}

// Multiplie deux nombres
function multiply(a, b) {
  return a * b;
}

// Verifie si un nombre est pair
function isEven(n) {
  return n % 2 === 0;
}

// Export des fonctions pour utilisation dans les tests
module.exports = { add, multiply, isEven };
