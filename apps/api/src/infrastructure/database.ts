import { createPool, type Pool } from 'mysql2/promise';

import type { Environment } from '../config/env';

export const createDatabasePool = (environment: Environment): Pool =>
  createPool({
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    database: environment.DATABASE_NAME,
    user: environment.DATABASE_USER,
    password: environment.DATABASE_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
  });
