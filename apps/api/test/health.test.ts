import { expect } from 'chai';
import request from 'supertest';

import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  it('returns service health without a database dependency', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });

    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body.data.status).to.equal('ok');
    expect(response.body.data.timestamp).to.be.a('string');
    expect(response.headers).to.have.property('x-request-id');
  });
});
