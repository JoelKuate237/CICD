// ============================================================
// FICHIER : tests/api.test.js
// Tests d'integration de l'API Express
// Utilise supertest pour simuler des requetes HTTP
// ============================================================

const request = require('supertest');
const app = require('../src/index');

describe('Tests d\'integration de l\'API', () => {
  test('GET / doit retourner un message de bienvenue', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
  });

  test('GET /health doit retourner status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('GET /add/2/3 doit retourner 5', async () => {
    const response = await request(app).get('/add/2/3');
    expect(response.status).toBe(200);
    expect(response.body.result).toBe(5);
  });

  test('GET /add/10/15 doit retourner 25', async () => {
    const response = await request(app).get('/add/10/15');
    expect(response.status).toBe(200);
    expect(response.body.result).toBe(25);
  });

  test('GET /add/abc/3 doit retourner une erreur 400', async () => {
    const response = await request(app).get('/add/abc/3');
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
