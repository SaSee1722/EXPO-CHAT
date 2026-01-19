import * as SQLite from 'expo-sqlite';
import { Message } from '@/types';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the SQLite database
 * Creates the messages table if it doesn't exist
 */
export const initDatabase = async (): Promise<void> => {
    try {
        db = await SQLite.openDatabaseAsync('gossip.db');

        // Create messages table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        media_url TEXT,
        metadata TEXT,
        reply_to TEXT,
        reply_to_message TEXT,
        reactions TEXT,
        status TEXT NOT NULL,
        deleted_by TEXT,
        deleted_for_everyone INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        INDEX idx_match_id (match_id),
        INDEX idx_created_at (created_at)
      );
      
      CREATE TABLE IF NOT EXISTS pending_messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        media_url TEXT,
        metadata TEXT,
        reply_to TEXT,
        reply_to_message TEXT,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
    `);

        console.log('[SQLite] Database initialized successfully');
    } catch (error) {
        console.error('[SQLite] Failed to initialize database:', error);
        throw error;
    }
};

/**
 * Get database instance
 */
export const getDatabase = (): SQLite.SQLiteDatabase => {
    if (!db) {
        throw new Error('[SQLite] Database not initialized. Call initDatabase() first.');
    }
    return db;
};

/**
 * Save a message to local database
 */
export const saveMessage = async (message: Message): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO messages 
       (id, match_id, sender_id, content, type, media_url, metadata, reply_to, reply_to_message, reactions, status, deleted_by, deleted_for_everyone, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                message.id,
                message.match_id,
                message.sender_id,
                message.content,
                message.type,
                message.media_url || null,
                message.metadata ? JSON.stringify(message.metadata) : null,
                message.reply_to || null,
                message.reply_to_message ? JSON.stringify(message.reply_to_message) : null,
                message.reactions ? JSON.stringify(message.reactions) : null,
                message.status,
                message.deleted_by ? JSON.stringify(message.deleted_by) : null,
                message.deleted_for_everyone ? 1 : 0,
                message.created_at,
                1 // Mark as synced since it came from server
            ]
        );
    } catch (error) {
        console.error('[SQLite] Failed to save message:', error);
        throw error;
    }
};

/**
 * Save multiple messages in a transaction (faster)
 */
export const saveMessages = async (messages: Message[]): Promise<void> => {
    const database = getDatabase();

    try {
        await database.withTransactionAsync(async () => {
            for (const message of messages) {
                await database.runAsync(
                    `INSERT OR REPLACE INTO messages 
           (id, match_id, sender_id, content, type, media_url, metadata, reply_to, reply_to_message, reactions, status, deleted_by, deleted_for_everyone, created_at, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        message.id,
                        message.match_id,
                        message.sender_id,
                        message.content,
                        message.type,
                        message.media_url || null,
                        message.metadata ? JSON.stringify(message.metadata) : null,
                        message.reply_to || null,
                        message.reply_to_message ? JSON.stringify(message.reply_to_message) : null,
                        message.reactions ? JSON.stringify(message.reactions) : null,
                        message.status,
                        message.deleted_by ? JSON.stringify(message.deleted_by) : null,
                        message.deleted_for_everyone ? 1 : 0,
                        message.created_at,
                        1
                    ]
                );
            }
        });
    } catch (error) {
        console.error('[SQLite] Failed to save messages batch:', error);
        throw error;
    }
};

/**
 * Get messages for a specific match from local database
 */
export const getMessages = async (matchId: string, userId?: string): Promise<Message[]> => {
    const database = getDatabase();

    try {
        let query = `
      SELECT * FROM messages 
      WHERE match_id = ?
    `;
        const params: any[] = [matchId];

        // Filter out messages deleted by this user
        if (userId) {
            query += ` AND (deleted_by IS NULL OR deleted_by NOT LIKE ?)`;
            params.push(`%"${userId}"%`);
        }

        query += ` ORDER BY created_at DESC`;

        const rows = await database.getAllAsync<any>(query, params);

        // Parse JSON fields
        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            reply_to_message: row.reply_to_message ? JSON.parse(row.reply_to_message) : undefined,
            reactions: row.reactions ? JSON.parse(row.reactions) : undefined,
            deleted_by: row.deleted_by ? JSON.parse(row.deleted_by) : undefined,
            deleted_for_everyone: row.deleted_for_everyone === 1,
        })) as Message[];
    } catch (error) {
        console.error('[SQLite] Failed to get messages:', error);
        return [];
    }
};

/**
 * Update message status (read/delivered)
 */
export const updateMessageStatus = async (messageId: string, status: string): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `UPDATE messages SET status = ? WHERE id = ?`,
            [status, messageId]
        );
    } catch (error) {
        console.error('[SQLite] Failed to update message status:', error);
    }
};

/**
 * Update message reactions
 */
export const updateMessageReactions = async (messageId: string, reactions: any): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `UPDATE messages SET reactions = ? WHERE id = ?`,
            [JSON.stringify(reactions), messageId]
        );
    } catch (error) {
        console.error('[SQLite] Failed to update message reactions:', error);
    }
};

/**
 * Delete message for current user
 */
export const deleteMessageForUser = async (messageId: string, userId: string): Promise<void> => {
    const database = getDatabase();

    try {
        // Get current deleted_by array
        const result = await database.getFirstAsync<{ deleted_by: string | null }>(
            `SELECT deleted_by FROM messages WHERE id = ?`,
            [messageId]
        );

        let deletedBy: string[] = [];
        if (result?.deleted_by) {
            deletedBy = JSON.parse(result.deleted_by);
        }

        if (!deletedBy.includes(userId)) {
            deletedBy.push(userId);
        }

        await database.runAsync(
            `UPDATE messages SET deleted_by = ? WHERE id = ?`,
            [JSON.stringify(deletedBy), messageId]
        );
    } catch (error) {
        console.error('[SQLite] Failed to delete message for user:', error);
    }
};

/**
 * Delete message for everyone
 */
export const deleteMessageForEveryone = async (messageId: string): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `UPDATE messages 
       SET content = 'Message removed', 
           type = 'text', 
           media_url = NULL, 
           deleted_for_everyone = 1 
       WHERE id = ?`,
            [messageId]
        );
    } catch (error) {
        console.error('[SQLite] Failed to delete message for everyone:', error);
    }
};

/**
 * Save pending message (to be sent when online)
 */
export const savePendingMessage = async (message: Partial<Message>): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO pending_messages 
       (id, match_id, sender_id, content, type, media_url, metadata, reply_to, reply_to_message, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                message.id!,
                message.match_id!,
                message.sender_id!,
                message.content!,
                message.type!,
                message.media_url || null,
                message.metadata ? JSON.stringify(message.metadata) : null,
                message.reply_to || null,
                message.reply_to_message ? JSON.stringify(message.reply_to_message) : null,
                message.created_at!,
                0
            ]
        );
    } catch (error) {
        console.error('[SQLite] Failed to save pending message:', error);
    }
};

/**
 * Get all pending messages
 */
export const getPendingMessages = async (): Promise<any[]> => {
    const database = getDatabase();

    try {
        const rows = await database.getAllAsync<any>(
            `SELECT * FROM pending_messages ORDER BY created_at ASC`
        );

        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            reply_to_message: row.reply_to_message ? JSON.parse(row.reply_to_message) : undefined,
        }));
    } catch (error) {
        console.error('[SQLite] Failed to get pending messages:', error);
        return [];
    }
};

/**
 * Remove pending message after successful send
 */
export const removePendingMessage = async (messageId: string): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `DELETE FROM pending_messages WHERE id = ?`,
            [messageId]
        );
    } catch (error) {
        console.error('[SQLite] Failed to remove pending message:', error);
    }
};

/**
 * Clear all messages for a match (used when clearing chat)
 */
export const clearMatchMessages = async (matchId: string): Promise<void> => {
    const database = getDatabase();

    try {
        await database.runAsync(
            `DELETE FROM messages WHERE match_id = ?`,
            [matchId]
        );
    } catch (error) {
        console.error('[SQLite] Failed to clear match messages:', error);
    }
};

/**
 * Get message count for a match
 */
export const getMessageCount = async (matchId: string): Promise<number> => {
    const database = getDatabase();

    try {
        const result = await database.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM messages WHERE match_id = ?`,
            [matchId]
        );

        return result?.count || 0;
    } catch (error) {
        console.error('[SQLite] Failed to get message count:', error);
        return 0;
    }
};
