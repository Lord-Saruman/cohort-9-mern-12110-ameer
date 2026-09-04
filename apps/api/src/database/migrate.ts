import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RowDataPacket } from 'mysql2';

import { environment } from '../config/env';
import { createDatabasePool } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';

type MigrationRow = RowDataPacket & { name: string };

const run = async (): Promise<void> => {
  const database = createDatabasePool(environment);
  try {
    const defaultDir = join(process.cwd(), 'database', 'migrations');
    const candidateDirs = [
      defaultDir,
      join(process.cwd(), 'apps', 'api', 'database', 'migrations'),
      join(__dirname, '..', '..', 'database', 'migrations'),
    ];
    const migrationsDirectory = candidateDirs.find((dir) => existsSync(dir)) ?? defaultDir;
    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    await database.execute(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    for (const file of files) {
      const [rows] = await database.execute<MigrationRow[]>(
        'SELECT name FROM schema_migrations WHERE name = ?',
        [file],
      );
      if (rows.length > 0) continue;

      const sql = await readFile(join(migrationsDirectory, file), 'utf8');
      const connection = await database.getConnection();
      try {
        for (const statement of sql
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)) {
          await connection.query(statement);
        }
        await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
        logger.info({ migration: file }, 'migration applied');
      } finally {
        connection.release();
      }
    }
  } finally {
    await database.end();
  }
};

void run().catch((error: unknown) => {
  logger.fatal({ err: error }, 'migration failed');
  process.exitCode = 1;
});
