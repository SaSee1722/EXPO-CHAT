import { matchService } from '../matchService';
import * as messageDB from './messageDB';
import { Message } from '@/types';
import NetInfo from '@react-native-community/netinfo';

/**
 * Sync Engine - Handles background synchronization between SQLite and Supabase
 */

let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the sync engine
 * Sets up periodic sync and network listeners
 */
export const initSyncEngine = async (): Promise<void> => {
    console.log('[SyncEngine] Initializing...');

    // Listen for network changes
    NetInfo.addEventListener(state => {
        if (state.isConnected && !isSyncing) {
            console.log('[SyncEngine] Network connected, triggering sync');
            syncPendingMessages();
        }
    });

    // Periodic sync every 30 seconds (when online)
    syncInterval = setInterval(() => {
        syncPendingMessages();
    }, 30000);

    // Initial sync
    syncPendingMessages();
};

/**
 * Stop the sync engine
 */
export const stopSyncEngine = (): void => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
};

/**
 * Sync pending messages to Supabase
 */
export const syncPendingMessages = async (): Promise<void> => {
    if (isSyncing) {
        console.log('[SyncEngine] Already syncing, skipping...');
        return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
        console.log('[SyncEngine] No network, skipping sync');
        return;
    }

    isSyncing = true;

    try {
        const pendingMessages = await messageDB.getPendingMessages();

        if (pendingMessages.length === 0) {
            console.log('[SyncEngine] No pending messages to sync');
            isSyncing = false;
            return;
        }

        console.log(`[SyncEngine] Syncing ${pendingMessages.length} pending messages...`);

        for (const pending of pendingMessages) {
            try {
                // Send to Supabase
                const { data, error } = await matchService.sendMessage(
                    pending.match_id,
                    pending.sender_id,
                    pending.content,
                    pending.type,
                    pending.media_url,
                    { ...pending.metadata, client_id: pending.id },
                    pending.reply_to,
                    pending.reply_to_message
                );

                if (error) {
                    console.error(`[SyncEngine] Failed to sync message ${pending.id}:`, error);
                    // TODO: Increment retry count, remove after max retries
                    continue;
                }

                if (data) {
                    // Update local database with real message ID
                    await messageDB.saveMessage(data);

                    // Remove from pending queue
                    await messageDB.removePendingMessage(pending.id);

                    console.log(`[SyncEngine] Successfully synced message ${pending.id}`);
                }
            } catch (error) {
                console.error(`[SyncEngine] Error syncing message ${pending.id}:`, error);
            }
        }

        console.log('[SyncEngine] Sync complete');
    } catch (error) {
        console.error('[SyncEngine] Sync failed:', error);
    } finally {
        isSyncing = false;
    }
};

/**
 * Sync messages for a specific match from Supabase to local DB
 * Used when opening a chat to ensure we have latest messages
 */
export const syncMatchMessages = async (matchId: string, userId?: string): Promise<Message[]> => {
    try {
        console.log(`[SyncEngine] Syncing messages for match ${matchId}...`);

        // Get messages from Supabase
        const { data: serverMessages, error } = await matchService.getMessages(matchId, userId);

        if (error || !serverMessages) {
            console.error('[SyncEngine] Failed to fetch messages from server:', error);
            // Return local messages as fallback
            return await messageDB.getMessages(matchId, userId);
        }

        // Save to local database
        if (serverMessages.length > 0) {
            await messageDB.saveMessages(serverMessages);
            console.log(`[SyncEngine] Saved ${serverMessages.length} messages to local DB`);
        }

        return serverMessages;
    } catch (error) {
        console.error('[SyncEngine] Sync match messages failed:', error);
        // Return local messages as fallback
        return await messageDB.getMessages(matchId, userId);
    }
};

/**
 * Handle incoming real-time message
 * Saves to local DB immediately
 */
export const handleRealtimeMessage = async (message: Message): Promise<void> => {
    try {
        await messageDB.saveMessage(message);
        console.log(`[SyncEngine] Saved real-time message ${message.id} to local DB`);
    } catch (error) {
        console.error('[SyncEngine] Failed to save real-time message:', error);
    }
};

/**
 * Handle message update (status, reactions, etc.)
 */
export const handleMessageUpdate = async (message: Message): Promise<void> => {
    try {
        await messageDB.saveMessage(message);
        console.log(`[SyncEngine] Updated message ${message.id} in local DB`);
    } catch (error) {
        console.error('[SyncEngine] Failed to update message:', error);
    }
};

/**
 * Handle message deletion
 */
export const handleMessageDeletion = async (messageId: string, userId?: string, forEveryone?: boolean): Promise<void> => {
    try {
        if (forEveryone) {
            await messageDB.deleteMessageForEveryone(messageId);
        } else if (userId) {
            await messageDB.deleteMessageForUser(messageId, userId);
        }
        console.log(`[SyncEngine] Deleted message ${messageId} from local DB`);
    } catch (error) {
        console.error('[SyncEngine] Failed to delete message:', error);
    }
};

/**
 * Check if we're currently online
 */
export const isOnline = async (): Promise<boolean> => {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected || false;
};

/**
 * Force sync now (useful for pull-to-refresh)
 */
export const forceSyncNow = async (): Promise<void> => {
    await syncPendingMessages();
};
