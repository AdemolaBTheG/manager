import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../drizzle/migrations';

import { getDatabase, getSQLiteClient, type AppDatabase } from './client';

let initializationPromise: Promise<AppDatabase> | undefined;

export function initializeDatabase(): Promise<AppDatabase> {
  initializationPromise ??= runInitialization().catch((error: unknown) => {
    initializationPromise = undefined;
    throw error;
  });

  return initializationPromise;
}

async function runInitialization(): Promise<AppDatabase> {
  const sqlite = getSQLiteClient();

  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const database = getDatabase();
  await migrate(database, migrations);

  return database;
}
