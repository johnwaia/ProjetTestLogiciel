const User = require('../models/user'); // adapte le chemin si besoin

describe('User model', () => {
  test('crée un utilisateur valide', async () => {
    const u = await User.create({ username: 'testuser', passwordHash: 'hash' });
    expect(u.username).toBe('testuser');
    expect(u.passwordHash).toBe('hash');
  });

  test('username requis', async () => {
    const u = new User({ passwordHash: 'hash' });
    await expect(u.validate()).rejects.toBeTruthy();
  });

  test('passwordHash requis', async () => {
    const u = new User({ username: 'abc' });
    await expect(u.validate()).rejects.toBeTruthy();
  });

  test('username minLength >= 3', async () => {
    const u = new User({ username: 'ab', passwordHash: 'hash' });
    await expect(u.validate()).rejects.toBeTruthy();
  });

  test('username unique', async () => {
    await User.create({ username: 'uniqueUser', passwordHash: 'hash1' });
    await expect(User.create({ username: 'uniqueUser', passwordHash: 'hash2' })).rejects.toBeTruthy();
  });
});
