import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const MEDIA_DIR = `${(FileSystem as any).documentDirectory}chat_media/`;

/**
 * Service to handle persistent media caching
 * Uses documentDirectory to ensure media stays on device even if cache is cleared
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

    getFileName(messageId: string, type: string, remoteUrl: string) {
        // Extract extension from URL if possible, otherwise use defaults
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
            console.error('[MediaCacheService] getLocalUri failed:', error);
        }
        return null;
    },

    async downloadMedia(remoteUrl: string, messageId: string, type: string, onProgress?: (progress: number) => void): Promise<string | null> {
        if (Platform.OS === 'web' || !remoteUrl) return remoteUrl || null;

        await this.init();
        const fileName = this.getFileName(messageId, type, remoteUrl);
        const localUri = `${MEDIA_DIR}${fileName}`;

        try {
            // Check if it's already a local URI (prevents downloading file://)
            if (remoteUrl.startsWith('file://')) {
                console.log('[MediaCacheService] 📎 URL is already local, skipping download.');
                return remoteUrl;
            }

            // Double check if exists before downloading
            const info = await FileSystem.getInfoAsync(localUri);
            if (info.exists && (info.size || 0) > 0) {
                if (onProgress) onProgress(1);
                return localUri;
            }

            console.log(`[MediaCacheService] 📥 Downloading ${type} from: ${remoteUrl.substring(0, 50)}...`);

            const downloadResumable = FileSystem.createDownloadResumable(
                remoteUrl,
                localUri,
                {},
                (downloadProgress) => {
                    if (downloadProgress.totalBytesExpectedToWrite > 0) {
                        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        if (onProgress) onProgress(progress);
                    }
                }
            );

            const downloadRes = await downloadResumable.downloadAsync();

            if (downloadRes && downloadRes.status === 200) {
                console.log(`[MediaCacheService] ✅ Downloaded to: ${downloadRes.uri}`);
                if (onProgress) onProgress(1);
                return downloadRes.uri;
            } else {
                console.warn(`[MediaCacheService] ⚠️ Download failed with status ${downloadRes?.status || 'unknown'}`);
                return null;
            }
        } catch (error) {
            console.error('[MediaCacheService] Download failed:', error);
            return null;
        }
    },

    /**
     * Save a local file (e.g. just picked from gallery) to persistent cache
     */
    async saveToCache(uri: string, messageId: string, type: string, remoteUrl: string): Promise<string | null> {
        if (Platform.OS === 'web' || !uri) return uri || null;

        await this.init();
        const fileName = this.getFileName(messageId, type, remoteUrl || uri);
        const localUri = `${MEDIA_DIR}${fileName}`;

        try {
            await FileSystem.copyAsync({ from: uri, to: localUri });
            console.log(`[MediaCacheService] 💾 Saved to cache: ${localUri}`);
            return localUri;
        } catch (error) {
            console.error('[MediaCacheService] saveToCache failed:', error);
            return null;
        }
    },

    /**
     * Clear all cached media
     */
    async clearCache() {
        if (Platform.OS === 'web') return;
        try {
            await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
            await this.init();
        } catch (error) {
            console.error('[MediaCacheService] Clear cache failed:', error);
        }
    },

    /**
     * Save to system gallery or downloads
     */
    async saveToPublicStorage(uri: string, type: string) {
        if (Platform.OS === 'web' || !uri) return false;

        try {
            if (type === 'image' || type === 'video' || type === 'sticker') {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status === 'granted') {
                    await MediaLibrary.saveToLibraryAsync(uri);
                    return true;
                }
            } else {
                // For files, use sharing to allow user to save to downloads/files
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                    return true;
                }
            }
        } catch (error) {
            console.error('[MediaCacheService] saveToPublicStorage failed:', error);
        }
        return false;
    }
};
