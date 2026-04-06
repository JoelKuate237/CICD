// ============================================================
// FICHIER : src/utils.js
// Fonctions utilitaires pour les tests unitaires
// ============================================================

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function isValidEmail(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function paginate(items, page, perPage) {
  page = Math.max(1, page || 1);
  perPage = Math.max(1, perPage || 10);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    data: items.slice(start, end),
    total: items.length,
    page,
    perPage,
    totalPages: Math.ceil(items.length / perPage)
  };
}

module.exports = { capitalize, isValidEmail, slugify, paginate };
