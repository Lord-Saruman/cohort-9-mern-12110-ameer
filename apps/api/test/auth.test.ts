import { expect } from 'chai';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import request from 'supertest';

import { createApp } from '../src/app';
import type { UserRecord } from '../src/modules/auth/auth.schemas';

const createFakePool = (): Pool => {
  const users: UserRecord[] = [];

  const fakePool = {
    execute: async (sql: string, params: unknown[] = []): Promise<[RowDataPacket[], unknown]> => {
      const normalizedSql = sql.toLowerCase();

      if (normalizedSql.includes('insert into users')) {
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
  const jwtSecret = 'test-secret-key-12345';

  it('registers a new user and sets a session cookie', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    try {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securepassword123',
        })
        .expect(201);

      expect(response.body.data.user.name).to.equal('Jane Doe');
      expect(response.body.data.user.email).to.equal('jane@example.com');
      expect(response.body.data.user).to.have.property('id');
      expect(response.body.data.user).to.have.property('createdAt');
      expect(response.body.data.user).to.not.have.property('password_hash');
      expect(response.headers['set-cookie']).to.be.an('array');
      expect(response.headers['set-cookie']![0]).to.include('token=');
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('rejects duplicate email registration with 409 conflict', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    try {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securepassword123',
        })
        .expect(201);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Clone',
          email: 'jane@example.com',
          password: 'securepassword123',
        })
        .expect(409);

      expect(response.body.error.code).to.equal('CONFLICT');
      expect(response.body.error.message).to.equal(
        'An account with this email address already exists.',
      );
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('validates registration input fields with 400 error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    try {
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
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('logs in an existing user with valid credentials', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    try {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securepassword123',
        })
        .expect(201);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'securepassword123',
        })
        .expect(200);

      expect(response.body.data.user.email).to.equal('jane@example.com');
      expect(response.headers['set-cookie']).to.be.an('array');
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('rejects invalid password on login with 401 error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    try {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securepassword123',
        })
        .expect(201);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error.code).to.equal('UNAUTHENTICATED');
      expect(response.body.error.message).to.equal('Invalid email or password.');
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('clears session cookie on logout with 204 status', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    try {
      const response = await request(app).post('/api/v1/auth/logout').expect(204);

      expect(response.body).to.deep.equal({});
      expect(response.headers['set-cookie']).to.be.an('array');
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });
});
