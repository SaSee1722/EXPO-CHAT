import * as FileSystem from 'expo-file-system/legacy';
import { getSupabaseClient } from '@/template';
import { Platform } from 'react-native';

const supabase = getSupabaseClient();

export const storageService = {
    /**
     * STABLE PRODUCTION UPLOADER WITH RETRY
     * - Uses fetch(uri).blob() for high-performance memory-efficient uploads
     * - Direct Supabase SDK integration with progress tracking
     * - Includes retry logic for network failures
     * - Enhanced 'Ghost Recovery' check for iOS/Android network noise
     */
    async uploadFile(bucket: string, uri: string, path: string, contentType?: string, onProgress?: (progress: number) => void): Promise<{ data: string | null, error: any }> {
        const MAX_RETRIES = 3;
        let lastError: any = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[StorageService] 🚀 Upload attempt ${attempt}/${MAX_RETRIES} to ${bucket}: ${path}`);

                // Small delay on first attempt to help iOS Simulator network stabilize
                if (attempt === 1) {
                    await new Promise(r => setTimeout(r, 500));
                }

                const fileInfo = await FileSystem.getInfoAsync(uri);
                if (!fileInfo.exists) return { data: null, error: 'File missing on device' };

                if (Platform.OS === 'web') {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true });
                    if (uploadError) throw uploadError;
                } else {
                    // MOBILE STABLE PATH - MEMORY EFFICIENT
                    console.log(`[StorageService] ⚡ Fetching local URI: ${uri}`);

                    const response = await fetch(uri);
                    const blob = await response.blob();

                    console.log(`[StorageService] 📡 Sending ${blob.size} bytes via Supabase SDK...`);

                    const { error: uploadError } = await supabase.storage
                        .from(bucket)
                        .upload(path, blob, {
                            contentType: contentType || blob.type || 'application/octet-stream',
                            cacheControl: '3600',
                            upsert: true,
                            onUploadProgress: (event: any) => {
                                if (onProgress && event.total) {
                                    onProgress(event.loaded / event.total);
                                }
                            }
                        } as any);

                    if (uploadError) {
                        const errorMsg = String(uploadError.message || uploadError);
                        console.log(`[StorageService] ⚠️ SDK Error on attempt ${attempt}: ${errorMsg}`);

                        // ENHANCED GHOST RECOVERY: Check if file actually uploaded despite error
                        if (errorMsg.includes('Network request failed') || errorMsg.includes('cannot parse response') || response?.status === 500) {
                            console.log('[StorageService] 🔍 Network error detected. Checking if file exists...');

                            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

                            // Wait longer for storage to sync
                            await new Promise(r => setTimeout(r, 1500));

                            try {
                                // Try to verify the file exists
                                const verify = await fetch(publicUrl, { method: 'HEAD' });
                                if (verify && verify.status) {
                                    console.log(`[StorageService] Verification status: ${verify.status}`);
                                }

                                if (verify && verify.ok) {
                                    console.log('[StorageService] ✨ Ghost Recovery Success! File exists in cloud.');
                                    return { data: publicUrl, error: null };
                                }

                                // Also check via Supabase list API
                                const { data: files } = await supabase.storage.from(bucket).list(path.split('/').slice(0, -1).join('/'));
                                const fileName = path.split('/').pop();
                                const fileExists = files?.some(f => f.name === fileName);

                                if (fileExists) {
                                    console.log('[StorageService] ✨ File found via list API! Recovery successful.');
                                    return { data: publicUrl, error: null };
                                }
                            } catch (e) {
                                console.log('[StorageService] Verification check failed:', e);
                            }
                        }

                        // If not a network error or recovery failed, throw to retry
                        throw new Error(errorMsg);
                    }
                }

                const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

                // CRITICAL FIX: Encode only the path part, not the whole URL
                const encodedUrl = encodeURI(publicUrl);
                const cacheBustUrl = `${encodedUrl}?t=${Date.now()}`;

                console.log('[StorageService] ✅ Success! Public URL:', cacheBustUrl);
                return { data: cacheBustUrl, error: null };

            } catch (error: any) {
                lastError = error;
                // Use console.log for retries to avoid notification spam
                console.log(`[StorageService] ⚠️ Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

                // Wait before retrying (exponential backoff)
                if (attempt < MAX_RETRIES) {
                    const waitTime = attempt * 1000; // 1s, 2s, 3s
                    console.log(`[StorageService] ⏳ Waiting ${waitTime}ms before retry...`);
                    await new Promise(r => setTimeout(r, waitTime));
                }
            }
        }

        console.error('[StorageService] ❌ All retry attempts failed');
        return { data: null, error: lastError?.message || 'Storage upload failed after retries' };
    }
};
