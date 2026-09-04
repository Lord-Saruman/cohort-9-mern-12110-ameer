import { expect } from 'chai';
import request from 'supertest';

import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  it('returns service health without a database dependency', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });

    try {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.body.data.status).to.equal('ok');
      expect(response.body.data.timestamp).to.be.a('string');
      expect(response.headers).to.have.property('x-request-id');
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('handles malformed json payload with 400 validation error', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });

    try {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}')
        .expect(400);

      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      expect(response.body.error.message).to.equal('Invalid JSON payload provided.');
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('handles oversized json payload with 413 error', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });
    const largeString = 'a'.repeat(101 * 1024);

    try {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ large: largeString }))
        .expect(413);

      expect(response.body.error.code).to.equal('PAYLOAD_TOO_LARGE');
      expect(response.body.error.message).to.equal(
        'Request payload exceeds the maximum allowed size.',
      );
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('handles unsupported content encoding with 415 error', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });

    try {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'deflate-unsupported')
        .send('{"test": true}')
        .expect(415);

      expect(response.body.error.code).to.equal('UNSUPPORTED_MEDIA_TYPE');
      expect(response.body.error.message).to.equal(
        'The request encoding or character set is not supported.',
      );
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });

  it('handles unsupported charset with 415 error', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });

    try {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json; charset=invalid-charset')
        .send('{"test": true}')
        .expect(415);

      expect(response.body.error.code).to.equal('UNSUPPORTED_MEDIA_TYPE');
      expect(response.body.error.message).to.equal(
        'The request encoding or character set is not supported.',
      );
    } catch (error: unknown) {
      expect.fail(error instanceof Error ? error.message : String(error));
    }
  });
});
