import { expect } from 'chai';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
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
        let userNotes: NoteRecord[] = [];
        let limit = 20;
        let offset = 0;

        if (normalizedSql.includes('title like ? or content_text like ?')) {
          const [userId, searchTitle, , pageSize, skip] = params as [
            string,
            string,
            string,
            number,
            number,
          ];
          const rawPattern = searchTitle
            .slice(1, -1)
            .replace(/\\([%_\\])/g, '$1')
            .toLowerCase();
          userNotes = notes.filter(
            (n) =>
              n.user_id === userId &&
              (n.title.toLowerCase().includes(rawPattern) ||
                n.content_text.toLowerCase().includes(rawPattern)),
          );
          limit = pageSize;
          offset = skip;
        } else {
          const [userId, pageSize, skip] = params as [string, number, number];
          userNotes = notes.filter((n) => n.user_id === userId);
          limit = pageSize;
          offset = skip;
        }

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

  const fakePool = {
    execute: executeOrQuery,
    query: executeOrQuery,
  } as unknown as Pool;

  return fakePool;
};

describe('Notes routes and ownership isolation', () => {
  const jwtSecret = 'test-secret-key-12345-long-enough-32-chars';

  const registerUserHelper = async (
    app: ReturnType<typeof createApp>,
    name: string,
    email: string,
  ): Promise<string> => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name, email, password: 'SecurePassword123' })
      .expect(201);

    const cookieHeader = res.headers['set-cookie']?.[0];
    return cookieHeader?.split(';')[0] ?? '';
  };

  it('creates a new note for the authenticated user', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const response = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Sprint Planning',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Define deliverables for sprint.' }],
            },
          ],
        },
      })
      .expect(201);

    expect(response.body.data.title).to.equal('Sprint Planning');
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('content');
    expect(response.body.data).to.have.property('createdAt');
    expect(response.body.data).to.have.property('updatedAt');
    expect(response.body.data).to.not.have.property('userId');
    expect(response.body.data).to.not.have.property('user_id');
  });

  it('rejects note creation when content is not a doc structure with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');

    const resEmpty = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({ title: 'Invalid Doc', content: {} })
      .expect(400);
    expect(resEmpty.body.error.code).to.equal('VALIDATION_ERROR');

    const resWrongType = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({ title: 'Invalid Doc', content: { type: 'paragraph' } })
      .expect(400);
    expect(resWrongType.body.error.code).to.equal('VALIDATION_ERROR');
  });

  it('rejects note creation when serialized content exceeds 100 KB with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const oversizedContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x'.repeat(101 * 1024) }],
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({ title: 'Huge Note', content: oversizedContent });

    expect([400, 413]).to.include(res.status);
  });

  it('ignores client-supplied contentText and derives it exclusively on server', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Derived Text Note',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Real text from doc' }],
            },
          ],
        },
        contentText: 'Injected fake summary',
      })
      .expect(201);

    const listRes = await request(app).get('/api/v1/notes').set('Cookie', cookie).expect(200);
    expect(listRes.body.data[0].preview).to.equal('Real text from doc');
    expect(listRes.body.data[0].preview).to.not.include('Injected fake summary');
  });

  it('retrieves an existing note by id for the owner', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Design Review',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const noteId = createRes.body.data.id;
    const getRes = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(getRes.body.data.id).to.equal(noteId);
    expect(getRes.body.data.title).to.equal('Design Review');
  });

  it('rejects invalid UUID noteId with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const res = await request(app)
      .get('/api/v1/notes/not-a-valid-uuid')
      .set('Cookie', cookie)
      .expect(400);

    expect(res.body.error.code).to.equal('VALIDATION_ERROR');
  });

  it('returns 404 when retrieving a note belonging to another user', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const aliceCookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const bobCookie = await registerUserHelper(app, 'Bob', 'bob@example.com');

    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', aliceCookie)
      .send({
        title: 'Alice Private Notes',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const noteId = createRes.body.data.id;

    const getRes = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set('Cookie', bobCookie)
      .expect(404);

    expect(getRes.body.error.code).to.equal('NOT_FOUND');
    expect(getRes.body.error.message).to.equal('Note not found.');
  });

  it('updates a note for the owner', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Draft Note',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const noteId = createRes.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set('Cookie', cookie)
      .send({ title: 'Finalized Note' })
      .expect(200);

    expect(updateRes.body.data.title).to.equal('Finalized Note');
  });

  it('returns 404 when updating a note belonging to another user', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const aliceCookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const bobCookie = await registerUserHelper(app, 'Bob', 'bob@example.com');

    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', aliceCookie)
      .send({
        title: 'Alice Secret',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const noteId = createRes.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set('Cookie', bobCookie)
      .send({ title: 'Tampered' })
      .expect(404);

    expect(updateRes.body.error.code).to.equal('NOT_FOUND');
  });

  it('deletes a note for the owner', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Temporary Note',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const noteId = createRes.body.data.id;

    await request(app).delete(`/api/v1/notes/${noteId}`).set('Cookie', cookie).expect(204);

    await request(app).get(`/api/v1/notes/${noteId}`).set('Cookie', cookie).expect(404);
  });

  it('returns 404 when deleting a note belonging to another user', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const aliceCookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const bobCookie = await registerUserHelper(app, 'Bob', 'bob@example.com');

    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', aliceCookie)
      .send({
        title: 'Alice Untouchable Note',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const noteId = createRes.body.data.id;

    await request(app).delete(`/api/v1/notes/${noteId}`).set('Cookie', bobCookie).expect(404);

    await request(app).get(`/api/v1/notes/${noteId}`).set('Cookie', aliceCookie).expect(200);
  });

  it('rejects unauthenticated requests to notes endpoints with 401', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const response = await request(app).get('/api/v1/notes').expect(401);
    expect(response.body.error.code).to.equal('UNAUTHENTICATED');
  });

  it('validates note creation input with 400 validation error', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const response = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({ title: '', content: { type: 'doc' } })
      .expect(400);

    expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    expect(response.body.error.details).to.be.an('array');
  });

  it('validates note update input with 400 validation error when empty payload sent', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const createRes = await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Valid Note',
        content: { type: 'doc' },
      })
      .expect(201);

    const noteId = createRes.body.data.id;
    const response = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set('Cookie', cookie)
      .send({})
      .expect(400);

    expect(response.body.error.code).to.equal('VALIDATION_ERROR');
  });

  it('lists only the authenticated user notes with pagination metadata', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const aliceCookie = await registerUserHelper(app, 'Alice', 'alice@example.com');
    const bobCookie = await registerUserHelper(app, 'Bob', 'bob@example.com');

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', aliceCookie)
      .send({ title: 'Alice Note 1', content: { type: 'doc' } })
      .expect(201);

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', aliceCookie)
      .send({ title: 'Alice Note 2', content: { type: 'doc' } })
      .expect(201);

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', aliceCookie)
      .send({ title: 'Alice Note 3', content: { type: 'doc' } })
      .expect(201);

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', bobCookie)
      .send({ title: 'Bob Note 1', content: { type: 'doc' } })
      .expect(201);

    const listRes = await request(app)
      .get('/api/v1/notes?page=1&pageSize=2')
      .set('Cookie', aliceCookie)
      .expect(200);

    expect(listRes.body.data).to.have.lengthOf(2);
    expect(listRes.body.meta.total).to.equal(3);
    expect(listRes.body.meta.page).to.equal(1);
    expect(listRes.body.meta.pageSize).to.equal(2);
  });

  it('filters notes by search query q across title and content preview', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Project Roadmap',
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Q3 planning details' }] },
          ],
        },
      })
      .expect(201);

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Weekly Grocery List',
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Apples, Milk, Bread' }] },
          ],
        },
      })
      .expect(201);

    const searchRes = await request(app)
      .get('/api/v1/notes?q=Roadmap')
      .set('Cookie', cookie)
      .expect(200);

    expect(searchRes.body.data).to.have.lengthOf(1);
    expect(searchRes.body.data[0].title).to.equal('Project Roadmap');
  });

  it('treats LIKE wildcards literally in search queries', async () => {
    const pool = createFakePool();
    const app = createApp({
      clientOrigin: 'http://localhost:5173',
      databasePool: pool,
      jwtSecret,
    });

    const cookie = await registerUserHelper(app, 'Alice', 'alice@example.com');

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Discount 100% off',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    await request(app)
      .post('/api/v1/notes')
      .set('Cookie', cookie)
      .send({
        title: 'Discount 100 off',
        content: { type: 'doc', content: [] },
      })
      .expect(201);

    const searchRes = await request(app)
      .get('/api/v1/notes?q=100%')
      .set('Cookie', cookie)
      .expect(200);

    expect(searchRes.body.data).to.have.lengthOf(1);
    expect(searchRes.body.data[0].title).to.equal('Discount 100% off');
  });
});
