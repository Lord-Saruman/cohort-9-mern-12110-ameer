import { Writable } from 'node:stream';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pino from 'pino';
import request from 'supertest';

import { createApp } from '../src/app';
import type { UserRecord } from '../src/modules/auth/auth.schemas';
import type { NoteRecord } from '../src/modules/notes/notes.schemas';

const createFakePool = (): Pool => {
  const users: UserRecord[] = [];
  const notes: NoteRecord[] = [];

  const executeOrQuery = async (
    sql: string,
    params: unknown[] = [],
  ): Promise<[RowDataPacket[] | ResultSetHeader, unknown]> => {
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

    if (normalizedSql.includes('select') && normalizedSql.includes('from users')) {
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
    }

    if (normalizedSql.includes('insert into notes')) {
      const [id, userId, title, contentJsonStr, contentText] = params as [
        string,
        string,
        string,
        string,
        string,
      ];
      const now = new Date();
      const note: NoteRecord = {
        id,
        user_id: userId,
        title,
        content_json: JSON.parse(contentJsonStr),
        content_text: contentText,
        created_at: now,
        updated_at: now,
      };
      notes.push(note);
      return [[] as unknown as RowDataPacket[], undefined];
    }

    if (normalizedSql.includes('count(*) as total from notes')) {
      const [userId, searchTitle, searchContent] = params as [string, string?, string?];
      let filtered = notes.filter((n) => n.user_id === userId);
      if (searchTitle && searchContent) {
        const rawPattern = searchTitle
          .slice(1, -1)
          .replace(/\\([%_\\])/g, '$1')
          .toLowerCase();
        filtered = filtered.filter(
          (n) =>
            n.title.toLowerCase().includes(rawPattern) ||
            n.content_text.toLowerCase().includes(rawPattern),
        );
      }
      const countRow = [{ total: filtered.length }] as unknown as RowDataPacket[];
      return [countRow, undefined];
    }

    if (normalizedSql.includes('select') && normalizedSql.includes('from notes')) {
      if (normalizedSql.includes('where id = ? and user_id = ?')) {
        const [id, userId] = params as [string, string];
        const found = notes.find((n) => n.id === id && n.user_id === userId);
        const rows = (found ? [found] : []) as unknown as RowDataPacket[];
        return [rows, undefined];
      }

      if (normalizedSql.includes('where user_id = ?')) {
        const userNotes = notes.filter((n) => n.user_id === (params[0] as string));
        const limit = (params[params.length - 2] as number) || 20;
        const offset = (params[params.length - 1] as number) || 0;
        userNotes.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
        const paginated = userNotes.slice(offset, offset + limit);
        return [paginated as unknown as RowDataPacket[], undefined];
      }
    }

    if (normalizedSql.includes('update notes set')) {
      const id = params[params.length - 2] as string;
      const userId = params[params.length - 1] as string;
      const index = notes.findIndex((n) => n.id === id && n.user_id === userId);
      if (index !== -1) {
        let paramIdx = 0;
        if (normalizedSql.includes('title = ?')) {
          notes[index].title = params[paramIdx++] as string;
        }
        if (normalizedSql.includes('content_json = ?')) {
          notes[index].content_json = JSON.parse(params[paramIdx++] as string);
        }
        if (normalizedSql.includes('content_text = ?')) {
          notes[index].content_text = params[paramIdx++] as string;
        }
        notes[index].updated_at = new Date();
      }
      return [[] as unknown as RowDataPacket[], undefined];
    }

    if (normalizedSql.includes('delete from notes where id = ? and user_id = ?')) {
      const [id, userId] = params as [string, string];
      const initialLen = notes.length;
      const remaining = notes.filter((n) => !(n.id === id && n.user_id === userId));
      notes.length = 0;
      notes.push(...remaining);
      const header: ResultSetHeader = {
        fieldCount: 0,
        affectedRows: initialLen - remaining.length,
        insertId: 0,
        info: '',
        serverStatus: 0,
        warningStatus: 0,
      };
      return [header, undefined];
    }

    return [[] as unknown as RowDataPacket[], undefined];
  };

  return {
    execute: executeOrQuery,
    query: executeOrQuery,
  } as unknown as Pool;
};

describe('End-to-End Hardening & Security Verification', () => {
  const jwtSecret = 'test-secret-key-12345-long-enough-32-chars';
  const clientOrigin = 'http://localhost:5173';

  const registerUser = async (
    app: ReturnType<typeof createApp>,
    name: string,
    email: string,
  ): Promise<{ cookie: string; user: { id: string; email: string } }> => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name, email, password: 'SecurePassword123' })
      .expect(201);

    const cookieHeader = res.headers['set-cookie']?.[0];
    const cookie = cookieHeader?.split(';')[0] ?? '';
    return { cookie, user: res.body.data.user };
  };

  it('redacts sensitive fields in pino log output', async () => {
    let logOutput = '';
    const stream = new Writable({
      write(chunk, _enc, callback) {
        logOutput += chunk.toString();
        callback();
      },
    });

    const testLogger = pino(
      {
        level: 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'passwordHash',
            'password_hash',
            'token',
            'content',
            'contentJson',
            'content_json',
            'contentText',
            'content_text',
            '*.password',
            '*.passwordHash',
            '*.password_hash',
            '*.token',
            '*.content',
            '*.contentJson',
            '*.content_json',
            '*.contentText',
            '*.content_text',
          ],
          censor: '[REDACTED]',
        },
      },
      stream,
    );

    testLogger.info(
      {
        password: 'super-secret-password-123',
        token: 'sensitive-bearer-jwt-token',
        content: 'confidential private note body',
        safeMetadata: 'public-event-identifier',
      },
      'redaction test event',
    );

    expect(logOutput).to.include('[REDACTED]');
    expect(logOutput).to.include('public-event-identifier');
    expect(logOutput).not.to.include('super-secret-password-123');
    expect(logOutput).not.to.include('sensitive-bearer-jwt-token');
    expect(logOutput).not.to.include('confidential private note body');
  });

  it('configures CORS headers and handles preflight OPTIONS requests', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin,
      databasePool: pool,
      jwtSecret,
    });

    const getRes = await request(app).get('/api/v1/health').set('Origin', clientOrigin).expect(200);

    expect(getRes.headers['access-control-allow-origin']).to.equal(clientOrigin);
    expect(getRes.headers['access-control-allow-credentials']).to.equal('true');

    const optionsRes = await request(app)
      .options('/api/v1/notes')
      .set('Origin', clientOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(optionsRes.headers['access-control-allow-origin']).to.equal(clientOrigin);
    expect(optionsRes.headers['access-control-allow-credentials']).to.equal('true');
  });

  it('emits Secure cookie flag in production and omits it in development', async () => {
    const pool = createFakePool();
    const appProd = createApp({
      clientOrigin,
      databasePool: pool,
      jwtSecret,
      isProduction: true,
    });

    const prodRes = await request(appProd)
      .post('/api/v1/auth/register')
      .send({ name: 'Prod User', email: 'prod@example.com', password: 'SecurePassword123' })
      .expect(201);

    const prodCookie = prodRes.headers['set-cookie']?.[0] ?? '';
    expect(prodCookie.toLowerCase()).to.include('secure');
    expect(prodCookie.toLowerCase()).to.include('httponly');
    expect(prodCookie.toLowerCase()).to.include('samesite=lax');

    const appDev = createApp({
      clientOrigin,
      databasePool: pool,
      jwtSecret,
      isProduction: false,
    });

    const devRes = await request(appDev)
      .post('/api/v1/auth/register')
      .send({ name: 'Dev User', email: 'dev@example.com', password: 'SecurePassword123' })
      .expect(201);

    const devCookie = devRes.headers['set-cookie']?.[0] ?? '';
    expect(devCookie.toLowerCase()).not.to.include('secure');
    expect(devCookie.toLowerCase()).to.include('httponly');
    expect(devCookie.toLowerCase()).to.include('samesite=lax');
  });

  it('strictly enforces two-user multi-session ownership isolation across all note endpoints', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin,
      databasePool: pool,
      jwtSecret,
    });

    const userA = await registerUser(app, 'Alice', 'alice.isolation@example.com');
    const userB = await registerUser(app, 'Bob', 'bob.isolation@example.com');

    const noteRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', userA.cookie)
      .send({
        title: 'Alice Confidential Strategy',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Proprietary trade secrets.' }],
            },
          ],
        },
      })
      .expect(201);

    const noteAId = noteRes.body.data.id;

    const readRes = await request(app)
      .get(`/api/v1/notes/${noteAId}`)
      .set('Cookie', userB.cookie)
      .expect(404);

    expect(readRes.body.error.code).to.equal('NOT_FOUND');

    const patchRes = await request(app)
      .patch(`/api/v1/notes/${noteAId}`)
      .set('Cookie', userB.cookie)
      .send({ title: 'Hacked Title' })
      .expect(404);

    expect(patchRes.body.error.code).to.equal('NOT_FOUND');

    const deleteRes = await request(app)
      .delete(`/api/v1/notes/${noteAId}`)
      .set('Cookie', userB.cookie)
      .expect(404);

    expect(deleteRes.body.error.code).to.equal('NOT_FOUND');

    const listRes = await request(app).get('/api/v1/notes').set('Cookie', userB.cookie).expect(200);

    expect(listRes.body.data).to.have.lengthOf(0);
    expect(listRes.body.meta.total).to.equal(0);

    const searchRes = await request(app)
      .get('/api/v1/notes?q=Confidential')
      .set('Cookie', userB.cookie)
      .expect(200);

    expect(searchRes.body.data).to.have.lengthOf(0);
    expect(searchRes.body.meta.total).to.equal(0);

    const verifyA = await request(app)
      .get(`/api/v1/notes/${noteAId}`)
      .set('Cookie', userA.cookie)
      .expect(200);

    expect(verifyA.body.data.title).to.equal('Alice Confidential Strategy');
  });

  it('rejects expired and tampered JWT tokens on notes routes with 401 UNAUTHENTICATED', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin,
      databasePool: pool,
      jwtSecret,
    });

    const expiredToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000001', email: 'test@example.com' },
      jwtSecret,
      { expiresIn: '-10s' },
    );

    const expiredRes = await request(app)
      .get('/api/v1/notes')
      .set('Cookie', `token=${expiredToken}`)
      .expect(401);

    expect(expiredRes.body.error.code).to.equal('UNAUTHENTICATED');

    const tamperedToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000001', email: 'test@example.com' },
      'wrong-secret-key-1234567890123456',
    );

    const tamperedRes = await request(app)
      .get('/api/v1/notes')
      .set('Cookie', `token=${tamperedToken}`)
      .expect(401);

    expect(tamperedRes.body.error.code).to.equal('UNAUTHENTICATED');

    const malformedRes = await request(app)
      .get('/api/v1/notes')
      .set('Authorization', 'Bearer invalid-token-value')
      .expect(401);

    expect(malformedRes.body.error.code).to.equal('UNAUTHENTICATED');
  });

  it('returns 500 INTERNAL_ERROR envelope without leaking sensitive internals on unexpected database error', async () => {
    const failingPool = {
      execute: async () => {
        throw new Error('MySQL connection dropped: tcp://notes_db:3306 password=secret');
      },
      query: async () => {
        throw new Error('MySQL connection dropped: tcp://notes_db:3306 password=secret');
      },
    } as unknown as Pool;

    const app = createApp({
      clientOrigin,
      databasePool: failingPool,
      jwtSecret,
    });

    const validToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000001', email: 'test@example.com' },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/v1/notes')
      .set('Cookie', `token=${validToken}`)
      .expect(500);

    expect(res.body.error.code).to.equal('INTERNAL_ERROR');
    expect(res.body.error.message).to.equal('An unexpected error occurred.');
    expect(res.body.error).to.have.property('requestId');
    expect(JSON.stringify(res.body)).not.to.include('password=secret');
    expect(JSON.stringify(res.body)).not.to.include('tcp://notes_db:3306');
    expect(res.body.error).not.to.have.property('stack');
  });

  it('returns 404 NOT_FOUND envelope for unmapped routes', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin,
      databasePool: pool,
      jwtSecret,
    });

    const res = await request(app).get('/api/v1/nonexistent-route').expect(404);

    expect(res.body.error.code).to.equal('NOT_FOUND');
    expect(res.body.error.message).to.include('/api/v1/nonexistent-route');
    expect(res.body.error).to.have.property('requestId');
  });
});
