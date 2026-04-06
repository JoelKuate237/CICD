const request = require('supertest');
const app = require('../src/app');

describe('API endpoints', () => {
  test('GET / retourne un message de bienvenue', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  test('GET /health retourne status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/users retourne une liste', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/users/1 retourne un utilisateur', async () => {
    const res = await request(app).get('/api/users/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBeDefined();
    expect(res.body.email).toBeDefined();
  });

  test('GET /api/users/999 retourne 404', async () => {
    const res = await request(app).get('/api/users/999');
    expect(res.status).toBe(404);
  });

  test('POST /api/users cree un utilisateur', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test User');
  });

  test('POST /api/users sans email retourne 400', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });
});
