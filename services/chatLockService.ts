import { matchService } from './matchService';
import * as Crypto from 'expo-crypto';

interface ChatLock {
    id: string;
    user_id: string;
    match_id: string;
    pin_hash: string;
    created_at: string;
    updated_at: string;
}

class ChatLockService {
    public getSupabaseClient() {
        return matchService.getSupabaseClient();
    }

    // Hash PIN for secure storage
    private async hashPin(pin: string): Promise<string> {
        return await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pin
        );
    }

    // Check if a chat is locked
    async isChatLocked(userId: string, matchId: string): Promise<boolean> {
        try {
            const supabase = this.getSupabaseClient();
            const { data, error } = await supabase
                .from('chat_locks')
                .select('id')
                .eq('user_id', userId)
                .eq('match_id', matchId)
                .maybeSingle();

            if (error) {
                // Silently fail - chat is not locked if we can't check
                console.log('[ChatLock] Could not check lock status (table may not exist):', error.message);
                return false;
            }

            return !!data;
        } catch (error) {
            // Network or other errors - assume unlocked
            console.log('[ChatLock] Error checking lock status:', error);
            return false;
        }
    }

    // Get lock details
    async getChatLock(userId: string, matchId: string): Promise<ChatLock | null> {
        const supabase = this.getSupabaseClient();
        const { data, error } = await supabase
            .from('chat_locks')
            .select('*')
            .eq('user_id', userId)
            .eq('match_id', matchId)
            .maybeSingle();

        if (error) {
            console.error('[ChatLock] Error getting lock:', error);
            return null;
        }

        return data;
    }

    // Lock a chat with PIN
    async lockChat(userId: string, matchId: string, pin: string): Promise<{ error: any }> {
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return { error: 'PIN must be exactly 4 digits' };
        }

        const supabase = this.getSupabaseClient();
        const pinHash = await this.hashPin(pin);

        const { error } = await supabase
            .from('chat_locks')
            .upsert({
                user_id: userId,
                match_id: matchId,
                pin_hash: pinHash,
            }, {
                onConflict: 'user_id,match_id'
            });

        if (error) {
            console.error('[ChatLock] Error locking chat:', error);
            return { error };
        }

        return { error: null };
    }

    // Unlock a chat (remove lock)
    async unlockChat(userId: string, matchId: string): Promise<{ error: any }> {
        const supabase = this.getSupabaseClient();

        const { error } = await supabase
            .from('chat_locks')
            .delete()
            .eq('user_id', userId)
            .eq('match_id', matchId);

        if (error) {
            console.error('[ChatLock] Error unlocking chat:', error);
            return { error };
        }

        return { error: null };
    }

    // Verify PIN
    async verifyPin(userId: string, matchId: string, pin: string): Promise<boolean> {
        const lock = await this.getChatLock(userId, matchId);
        if (!lock) return false;

        const pinHash = await this.hashPin(pin);
        return pinHash === lock.pin_hash;
    }

    // Change PIN
    async changePin(userId: string, matchId: string, oldPin: string, newPin: string): Promise<{ error: any }> {
        // Verify old PIN first
        const isValid = await this.verifyPin(userId, matchId, oldPin);
        if (!isValid) {
            return { error: 'Invalid current PIN' };
        }

        // Set new PIN
        return await this.lockChat(userId, matchId, newPin);
    }

    // Get all locked chats for a user
    async getLockedChats(userId: string): Promise<string[]> {
        const supabase = this.getSupabaseClient();
        const { data, error } = await supabase
            .from('chat_locks')
            .select('match_id')
            .eq('user_id', userId);

        if (error) {
            console.error('[ChatLock] Error getting locked chats:', error);
            return [];
        }

        return data?.map(lock => lock.match_id) || [];
    }
}

export const chatLockService = new ChatLockService();
