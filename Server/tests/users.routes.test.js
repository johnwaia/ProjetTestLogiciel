const request = require('supertest');
const bcrypt = require('bcryptjs');
const { makeApp } = require('./app.testkit');
const User = require('../models/user');

describe('Users auth routes', () => {
  const app = makeApp();

  beforeAll(() => {
    // JWT secret nécessaire pour /login (sinon jwt.sign plante)
    process.env.JWT_SECRET = 'test_secret';
  });

  test('POST /api/users/register -> 201 crée un user', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'abcde', password: 'password123' })
      .expect(201);

    expect(res.body.username).toBe('abcde');
    expect(res.body.id).toBeTruthy();
  });

  test('POST /api/users/register -> 400 si username/password manquants', async () => {
    await request(app)
      .post('/api/users/register')
      .send({ username: 'abcde' })
      .expect(400);
  });

  test('POST /api/users/register -> 400 si password < 6', async () => {
    await request(app)
      .post('/api/users/register')
      .send({ username: 'abcde', password: '123' })
      .expect(400);
  });

  test('POST /api/users/register -> 409 si username existe déjà', async () => {
    await request(app)
      .post('/api/users/register')
      .send({ username: 'dupuser', password: 'password123' })
      .expect(201);

    await request(app)
      .post('/api/users/register')
      .send({ username: 'dupuser', password: 'password123' })
      .expect(409);
  });

  test('POST /api/users/login -> 200 + token si identifiants valides', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const u = await User.create({ username: 'loguser', passwordHash });

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'loguser', password: 'password123' })
      .expect(200);

    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.username).toBe('loguser');
    expect(res.body.user.id).toBe(String(u._id));
  });

  test('POST /api/users/login -> 400 si username/password manquants', async () => {
    await request(app)
      .post('/api/users/login')
      .send({ username: 'x' })
      .expect(400);
  });

  test('POST /api/users/login -> 401 si user inexistant', async () => {
    await request(app)
      .post('/api/users/login')
      .send({ username: 'nope', password: 'password123' })
      .expect(401);
  });

  test('POST /api/users/login -> 401 si mauvais mot de passe', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    await User.create({ username: 'badpass', passwordHash });

    await request(app)
      .post('/api/users/login')
      .send({ username: 'badpass', password: 'wrongpass' })
      .expect(401);
  });
});
