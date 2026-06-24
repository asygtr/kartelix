const { verifyUserPassword } = require('../modules/auth/authService');

describe('verifyUserPassword', () => {
  it('accepts legacy default password for admin and migrates it to the entered password', async () => {
    const updates = [];
    const db = {
      get: jest.fn((query, params, callback) => {
        callback(null, {
          id: 1,
          username: 'yonetici',
          password: 'hash-for-123456',
          yetki: 'admin'
        });
      }),
      run: jest.fn((query, params, callback) => {
        updates.push({ query, params });
        callback(null);
      })
    };

    const bcrypt = {
      compare: jest.fn(async (candidate, hash) => {
        if (hash === 'hash-for-123456') {
          return candidate === '123456';
        }
        return false;
      }),
      hash: jest.fn(async () => 'hash-for-1234')
    };

    const row = await verifyUserPassword({
      db,
      username: 'yonetici',
      password: '1234',
      bcrypt,
      bcryptRounds: 12
    });

    expect(row).toMatchObject({ username: 'yonetici', yetki: 'admin' });
    expect(db.run).toHaveBeenCalled();
    expect(updates[0].params[0]).toBe('hash-for-1234');
  });
});
