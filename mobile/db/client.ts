import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import { sessions, metrics } from './schema';

const expoDb = openDatabaseSync('app.db', { enableChangeListener: true });

/**
 * Global database client
 */
export const db = drizzle(expoDb, { schema: { sessions, metrics } });
