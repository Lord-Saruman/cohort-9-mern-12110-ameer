import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import request from 'supertest';

import { createApp } from '../src/app';
import type { UserRecord } from '../src/modules/auth/auth.schemas';

const VALID_PASSWORD = 'SecurePassword123';

const createFakePool = (options: { simulateDuplicateOnInsert?: boolean } = {}): Pool => {
  const users: UserRecord[] = [];

  const fakePool = {
    execute: async (sql: string, params: unknown[] = []): Promise<[RowDataPacket[], unknown]> => {
      const normalizedSql = sql.toLowerCase();

      if (normalizedSql.includes('insert into users')) {
        if (options.simulateDuplicateOnInsert) {
          const duplicateError = new Error(
            "Duplicate entry 'jane@example.com' for key 'users.email'",
          ) as Error & {
            code: string;
            errno: number;
          };
          duplicateError.code = 'ER_DUP_ENTRY';
          duplicateError.errno = 1062;
          throw duplicateError;
        }

        const [id, name, email, passwordHash] = params as [string, string, string, string];
        const now = new Date();
        const user: UserRecord = {
          id,
          name,
          email,
          password_hash: passwordHash,
          created_at: now,
          updated_at: now,
        };
        users.push(user);
        return [[] as unknown as RowDataPacket[], undefined];
      }

      if (normalizedSql.includes('where email = ?')) {
        const [email] = params as [string];
        const found = users.find((u) => u.email === email);
        const rows = (found ? [found] : []) as unknown as RowDataPacket[];
        return [rows, undefined];
      }

      if (normalizedSql.includes('where id = ?')) {
        const [id] = params as [string];
        const found = users.find((u) => u.id === id);
        const rows = (found ? [found] : []) as unknown as RowDataPacket[];
        return [rows, undefined];
      }

      return [[] as unknown as RowDataPacket[], undefined];
    },
  } as unknown as Pool;

  return fakePool;
};

describe('Auth routes', () => {
  const jwtSecret = 'test-secret-key-12345-long-enough-32-chars';

  it('registers a new user and sets a session cookie', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(201);

    expect(response.body.data.user.name).to.equal('Jane Doe');
    expect(response.body.data.user.email).to.equal('jane@example.com');
    expect(response.body.data.user).to.have.property('id');
    expect(response.body.data.user).to.have.property('createdAt');
    expect(response.body.data.user).to.not.have.property('password_hash');
    expect(response.headers['set-cookie']).to.be.an('array');
    expect(response.headers['set-cookie']![0]).to.include('token=');
    expect(response.headers['set-cookie']![0]).to.include('HttpOnly');
  });

  it('rejects duplicate email registration with 409 conflict', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(201);

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Clone',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(409);

    expect(response.body.error.code).to.equal('CONFLICT');
    expect(response.body.error.message).to.equal(
      'An account with this email address already exists.',
    );
  });

  it('handles concurrent ER_DUP_ENTRY during user creation with 409 conflict', async () => {
    const pool = createFakePool({ simulateDuplicateOnInsert: true });
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(409);

    expect(response.body.error.code).to.equal('CONFLICT');
    expect(response.body.error.message).to.equal(
      'An account with this email address already exists.',
    );
  });

  it('validates registration input fields with 400 error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'J',
        email: 'invalid-email',
        password: '123',
      })
      .expect(400);

    expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    expect(response.body.error.details).to.be.an('array');
  });

  it('rejects passwords under 12 characters with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Short123',
      })
      .expect(400);

    expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    expect(response.body.error.details[0].message).to.include('at least 12 characters');
  });

  it('rejects passwords missing mixed character classes with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const resNoUpper = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane1@example.com',
        password: 'alllowercase123',
      })
      .expect(400);
    expect(resNoUpper.body.error.code).to.equal('VALIDATION_ERROR');

    const resNoDigit = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane2@example.com',
        password: 'OnlyLettersNoDigits',
      })
      .expect(400);
    expect(resNoDigit.body.error.code).to.equal('VALIDATION_ERROR');
  });

  it('rejects passwords exceeding 72 bytes with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const longUtf8Password = 'A1' + '🔒'.repeat(20);
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: longUtf8Password,
      })
      .expect(400);

    expect(response.body.error.code).to.equal('VALIDATION_ERROR');
  });

  it('logs in an existing user with valid credentials', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(201);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(200);

    expect(response.body.data.user.email).to.equal('jane@example.com');
    expect(response.headers['set-cookie']).to.be.an('array');
  });

  it('rejects invalid password on login with 401 error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(201);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'WrongPassword123',
      })
      .expect(401);

    expect(response.body.error.code).to.equal('UNAUTHENTICATED');
    expect(response.body.error.message).to.equal('Invalid email or password.');
  });

  it('rejects unauthenticated logout with 401 error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const response = await request(app).post('/api/v1/auth/logout').expect(401);
    expect(response.body.error.code).to.equal('UNAUTHENTICATED');
  });

  it('clears session cookie on authenticated logout with 204 status', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: VALID_PASSWORD,
      })
      .expect(201);

    const cookie = regRes.headers['set-cookie']![0];

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    expect(response.body).to.deep.equal({});
    expect(response.headers['set-cookie']).to.be.an('array');
  });

  describe('GET /auth/me', () => {
    it('returns the current authenticated user profile', async () => {
      const pool = createFakePool();
      const app = createApp({
        clientOrigin: 'http://localhost:5173',
        databasePool: pool,
        jwtSecret,
      });

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: VALID_PASSWORD,
        })
        .expect(201);

      const cookie = regRes.headers['set-cookie']![0];

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(meRes.body.data.user.email).to.equal('jane@example.com');
      expect(meRes.body.data.user.name).to.equal('Jane Doe');
      expect(meRes.body.data.user).to.have.property('id');
      expect(meRes.body.data.user).to.have.property('createdAt');
      expect(meRes.body.data.user).to.not.have.property('password_hash');
    });

    it('rejects unauthenticated GET /auth/me with 401', async () => {
      const pool = createFakePool();
      const app = createApp({
        clientOrigin: 'http://localhost:5173',
        databasePool: pool,
        jwtSecret,
      });

      const res = await request(app).get('/api/v1/auth/me').expect(401);
      expect(res.body.error.code).to.equal('UNAUTHENTICATED');
    });

    it('rejects GET /auth/me with invalid or expired token with 401', async () => {
      const pool = createFakePool();
      const app = createApp({
        clientOrigin: 'http://localhost:5173',
        databasePool: pool,
        jwtSecret,
      });

      const badToken = jwt.sign({ userId: 'fake', email: 'test@example.com' }, 'wrong-secret');
      await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${badToken}`)
        .expect(401);

      const expiredToken = jwt.sign(
        { userId: 'fake', email: 'test@example.com' },
        jwtSecret,
        { expiresIn: '0s' },
      );
      await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${expiredToken}`)
        .expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 RATE_LIMIT_EXCEEDED when request limit is reached', async () => {
      const pool = createFakePool();
      const app = createApp({
        clientOrigin: 'http://localhost:5173',
        databasePool: pool,
        jwtSecret,
        rateLimitMax: 2,
      });

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane 1',
          email: 'jane1@example.com',
          password: VALID_PASSWORD,
        })
        .expect(201);

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane 2',
          email: 'jane2@example.com',
          password: VALID_PASSWORD,
        })
        .expect(201);

      const rateLimitedRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane 3',
          email: 'jane3@example.com',
          password: VALID_PASSWORD,
        })
        .expect(429);

      expect(rateLimitedRes.body.error.code).to.equal('RATE_LIMIT_EXCEEDED');
      expect(rateLimitedRes.body.error.message).to.include('Too many requests');
    });
  });
});
