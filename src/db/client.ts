import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

const DATABASE_NAME = 'before.db';

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

let sqliteClient: SQLiteDatabase | undefined;
let database: AppDatabase | undefined;

export function getSQLiteClient(): SQLiteDatabase {
  sqliteClient ??= openDatabaseSync(DATABASE_NAME);
  return sqliteClient;
}

export function getDatabase(): AppDatabase {
  database ??= drizzle(getSQLiteClient(), { schema });
  return database;
}
