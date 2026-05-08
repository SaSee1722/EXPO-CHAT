/**
 * aliasDB.ts
 * Local-only SQLite storage for user-defined nicknames.
 * The alias is private to this device — the other person never sees it.
 *
 * Table: contact_aliases (profile_id TEXT PK, alias TEXT, updated_at TEXT)
 */

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
    if (db) return db;
    db = await SQLite.openDatabaseAsync('gossip.db'); // same DB file
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS contact_aliases (
      profile_id  TEXT PRIMARY KEY,
      alias       TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);
    return db;
};

/** Save or update a nickname for a profile */
export const setAlias = async (profileId: string, alias: string): Promise<void> => {
    const database = await getDB();
    const trimmed = alias.trim();
    if (!trimmed) {
        // Empty string = delete the alias
        await database.runAsync(`DELETE FROM contact_aliases WHERE profile_id = ?`, [profileId]);
        return;
    }
    await database.runAsync(
        `INSERT INTO contact_aliases (profile_id, alias, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(profile_id) DO UPDATE SET alias = excluded.alias, updated_at = excluded.updated_at`,
        [profileId, trimmed, new Date().toISOString()]
    );
};

/** Get the alias for a single profile (returns null if none set) */
export const getAlias = async (profileId: string): Promise<string | null> => {
    const database = await getDB();
    const row = await database.getFirstAsync<{ alias: string }>(
        `SELECT alias FROM contact_aliases WHERE profile_id = ?`,
        [profileId]
    );
    return row?.alias ?? null;
};

/** Remove a nickname */
export const deleteAlias = async (profileId: string): Promise<void> => {
    const database = await getDB();
    await database.runAsync(`DELETE FROM contact_aliases WHERE profile_id = ?`, [profileId]);
};

/** Load ALL saved aliases as a map { profileId → alias } — used by the context on startup */
export const getAllAliases = async (): Promise<Record<string, string>> => {
    const database = await getDB();
    const rows = await database.getAllAsync<{ profile_id: string; alias: string }>(
        `SELECT profile_id, alias FROM contact_aliases`
    );
    const map: Record<string, string> = {};
    for (const row of rows) {
        map[row.profile_id] = row.alias;
    }
    return map;
};
