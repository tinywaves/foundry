// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { DatabaseSync } from 'node:sqlite';
import { getDatabasePath } from './storage-root';

const sqliteBusyTimeoutMs = 5000;

export type SqliteStorage = {
  database: DatabaseSync;
  databasePath: string;
  assertIntegrity: () => void;
  transaction: <T>(operation: () => T) => T;
  close: () => void;
};

function assertDatabaseIntegrity(database: DatabaseSync): void {
  const rows = database.prepare('PRAGMA integrity_check').all();
  const results = rows.flatMap((row) => Object.values(row));

  if (results.length !== 1 || results[0] !== 'ok') {
    throw new Error('SQLite database integrity check failed');
  }
}

function runTransaction<T>(
  database: DatabaseSync,
  operation: () => T,
): T {
  if (!database.isOpen) {
    throw new Error('Cannot start a transaction on a closed database');
  }

  if (database.isTransaction) {
    throw new Error('Nested SQLite transactions are not supported');
  }

  database.exec('BEGIN');

  try {
    const result = operation();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function createSqliteStorage(): SqliteStorage {
  const databasePath = getDatabasePath();
  const database = new DatabaseSync(databasePath, {
    enableForeignKeyConstraints: true,
    timeout: sqliteBusyTimeoutMs,
  });

  database.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = FULL;
  `);

  let isClosed = false;

  return {
    database,
    databasePath,
    assertIntegrity: () => assertDatabaseIntegrity(database),
    transaction: <T>(operation: () => T) => runTransaction(database, operation),
    close: () => {
      if (isClosed) {
        return;
      }

      database.close();
      isClosed = true;
    },
  };
}
