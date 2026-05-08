import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const MEDIA_DIR = `${(FileSystem as any).documentDirectory}chat_media/`;
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200 MB cap

/**
 * Service to handle persistent media caching for chat.
 *
 * Privacy guarantee:
 * - All media is saved to the app's private documentDirectory.
 * - NOTHING is ever written to the device gallery / MediaLibrary automatically.
 * - Gallery / Downloads saves only happen when the user explicitly taps
 *   "Save to Gallery" or "Save to Downloads".
 */
export const mediaCacheService = {
    async init() {
        if (Platform.OS === 'web') return;
        try {
            const info = await FileSystem.getInfoAsync(MEDIA_DIR);
            if (!info.exists) {
                await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
            }
        } catch (error) {
            console.error('[MediaCacheService] Init failed:', error);
        }
    },

    getFileName(messageId: string, type: string, remoteUrl: string): string {
        let ext = remoteUrl.split('.').pop()?.split('?')[0] || '';
        if (ext.length > 4 || ext.length < 2) {
            switch (type) {
                case 'video': ext = 'mp4'; break;
                case 'audio': ext = 'm4a'; break;
                case 'image': ext = 'jpg'; break;
                case 'sticker': ext = 'webp'; break;
                default: ext = 'bin';
            }
        }
        return `${messageId}.${ext}`;
    },

    /** Returns the private local path if the file is already cached, or null. */
    async getLocalUri(messageId: string, type: string, remoteUrl: string): Promise<string | null> {
        if (Platform.OS === 'web' || !remoteUrl) return remoteUrl || null;

        await this.init();
        const fileName = this.getFileName(messageId, type, remoteUrl);
        const localUri = `${MEDIA_DIR}${fileName}`;

        try {
            const info = await FileSystem.getInfoAsync(localUri);
            if (info.exists && (info.size || 0) > 0) {
                return localUri;
            }
        } catch (error) {
            console.error('[MediaCacheService] getLocalUri check failed:', error);
        }
        return null;
    },

    /**
     * Downloads media from a remote URL into the app's private cache folder.
     * The file is NEVER written to the gallery. onProgress receives 0→1.
     */
    async downloadMedia(
        remoteUrl: string,
        messageId: string,
        type: string,
        onProgress?: (progress: number) => void
    ): Promise<string | null> {
        if (Platform.OS === 'web' || !remoteUrl) return remoteUrl || null;
        if (remoteUrl.startsWith('file://')) return remoteUrl;

        await this.init();
        const fileName = this.getFileName(messageId, type, remoteUrl);
        const localUri = `${MEDIA_DIR}${fileName}`;

        try {
            // Return immediately if already cached
            const info = await FileSystem.getInfoAsync(localUri);
            if (info.exists && (info.size || 0) > 0) {
                if (onProgress) onProgress(1);
                return localUri;
            }

            console.log(`[MediaCacheService] 📥 Downloading ${type}…`);

            const downloadResumable = FileSystem.createDownloadResumable(
                remoteUrl,
                localUri,
                {},
                (downloadProgress) => {
                    if (downloadProgress.totalBytesExpectedToWrite > 0) {
                        const progress =
                            downloadProgress.totalBytesWritten /
                            downloadProgress.totalBytesExpectedToWrite;
                        if (onProgress) onProgress(progress);
                    }
                }
            );

            const downloadRes = await downloadResumable.downloadAsync();

            if (downloadRes && downloadRes.status === 200) {
                console.log(`[MediaCacheService] ✅ Cached to private storage: ${downloadRes.uri}`);
                if (onProgress) onProgress(1);
                // Run eviction in background — don't await to keep UI snappy
                this.evictIfNeeded().catch(() => { });
                return downloadRes.uri;
            } else {
                console.warn(`[MediaCacheService] ⚠️ Download failed status=${downloadRes?.status}`);
                return null;
            }
        } catch (error) {
            console.error('[MediaCacheService] Download failed:', error);
            return null;
        }
    },

    /** Copies an already-local file (e.g. just-picked from camera) into the private cache. */
    async saveToCache(uri: string, messageId: string, type: string, remoteUrl: string): Promise<string | null> {
        if (Platform.OS === 'web' || !uri) return uri || null;

        await this.init();
        const fileName = this.getFileName(messageId, type, remoteUrl || uri);
        const localUri = `${MEDIA_DIR}${fileName}`;

        try {
            await FileSystem.copyAsync({ from: uri, to: localUri });
            console.log(`[MediaCacheService] 💾 Saved to private cache: ${localUri}`);
            return localUri;
        } catch (error) {
            console.error('[MediaCacheService] saveToCache failed:', error);
            return null;
        }
    },

    // ─── EXPLICIT USER ACTIONS ONLY ──────────────────────────────────────────

    /**
     * Save a cached image or video to the system photo gallery.
     * MUST only be called in response to an explicit user tap ("Save to Gallery").
     * Never called automatically.
     */
    async saveToGallery(uri: string): Promise<boolean> {
        if (Platform.OS === 'web' || !uri) return false;
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('[MediaCacheService] Gallery permission denied');
                return false;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            console.log('[MediaCacheService] 📸 Saved to gallery (user-initiated)');
            return true;
        } catch (error) {
            console.error('[MediaCacheService] saveToGallery failed:', error);
            return false;
        }
    },

    /**
     * Share / export a cached audio or document file via the OS share sheet.
     * MUST only be called in response to an explicit user tap ("Save / Share").
     * Never called automatically.
     */
    async shareFile(uri: string): Promise<boolean> {
        if (Platform.OS === 'web' || !uri) return false;
        try {
            const available = await Sharing.isAvailableAsync();
            if (!available) return false;
            await Sharing.shareAsync(uri, { UTI: 'public.item', dialogTitle: 'Save or Share' });
            return true;
        } catch (error) {
            console.error('[MediaCacheService] shareFile failed:', error);
            return false;
        }
    },

    /**
     * @deprecated Use saveToGallery() for images/videos, shareFile() for audio/docs.
     * Kept for backward compatibility with older call sites.
     */
    async saveToPublicStorage(uri: string, type: string): Promise<boolean> {
        if (type === 'image' || type === 'video' || type === 'sticker') {
            return this.saveToGallery(uri);
        }
        return this.shareFile(uri);
    },

    // ─── CACHE MANAGEMENT ────────────────────────────────────────────────────

    /** Remove a single file from cache (e.g. when message is deleted). */
    async removeFromCache(messageId: string, type: string, remoteUrl: string): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            const fileName = this.getFileName(messageId, type, remoteUrl);
            const localUri = `${MEDIA_DIR}${fileName}`;
            await FileSystem.deleteAsync(localUri, { idempotent: true });
        } catch (error) {
            console.error('[MediaCacheService] removeFromCache failed:', error);
        }
    },

    /** Clear entire private media cache. Messages remain in SQLite; only local files are removed. */
    async clearCache(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
            await this.init();
            console.log('[MediaCacheService] 🗑️ Cache cleared');
        } catch (error) {
            console.error('[MediaCacheService] clearCache failed:', error);
        }
    },

    /** Returns total cache size in bytes and file count. */
    async getCacheStats(): Promise<{ totalBytes: number; fileCount: number }> {
        if (Platform.OS === 'web') return { totalBytes: 0, fileCount: 0 };
        try {
            await this.init();
            const dir = await FileSystem.readDirectoryAsync(MEDIA_DIR);
            let totalBytes = 0;
            for (const fileName of dir) {
                const info = await FileSystem.getInfoAsync(`${MEDIA_DIR}${fileName}`);
                if (info.exists) totalBytes += info.size || 0;
            }
            return { totalBytes, fileCount: dir.length };
        } catch {
            return { totalBytes: 0, fileCount: 0 };
        }
    },

    /**
     * Evict oldest files when total cache exceeds MAX_CACHE_BYTES.
     * Uses file modification time as an LRU proxy.
     */
    async evictIfNeeded(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await this.init();
            const fileNames = await FileSystem.readDirectoryAsync(MEDIA_DIR);

            // Gather info for all files
            const entries: { uri: string; size: number; modTime: number }[] = [];
            let totalBytes = 0;

            for (const fileName of fileNames) {
                const uri = `${MEDIA_DIR}${fileName}`;
                const info = await FileSystem.getInfoAsync(uri, { md5: false });
                if (info.exists) {
                    const size = info.size || 0;
                    const modTime = (info as any).modificationTime || 0;
                    entries.push({ uri, size, modTime });
                    totalBytes += size;
                }
            }

            if (totalBytes <= MAX_CACHE_BYTES) return;

            // Sort oldest first → delete until under 80% of limit
            entries.sort((a, b) => a.modTime - b.modTime);
            for (const entry of entries) {
                if (totalBytes <= MAX_CACHE_BYTES * 0.8) break;
                await FileSystem.deleteAsync(entry.uri, { idempotent: true });
                totalBytes -= entry.size;
                console.log(`[MediaCacheService] 🗑️ Evicted: ${entry.uri}`);
            }
        } catch (error) {
            console.error('[MediaCacheService] evictIfNeeded failed:', error);
        }
    },
};
