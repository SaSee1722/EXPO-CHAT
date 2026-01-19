import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CLOUDINARY_CLOUD_NAME = 'dknphfi7o';
const CLOUDINARY_UPLOAD_PRESET = 'gossip';

export const storageService = {
    /**
     * CLOUDINARY UPLOADER (Free Unlimited Bandwidth)
     * - Uploads directly to Cloudinary using Unsigned Preset
     * - Bypasses Supabase Storage limits completely
     * - Automatic compression and optimization
     * - Supports images, videos, audio, and documents (PDFs, etc.)
     */
    async uploadFile(bucket: string, uri: string, path: string, contentType: string = 'image/jpeg', onProgress?: (progress: number) => void): Promise<{ data: string | null, error: any }> {
        const MAX_RETRIES = 3;
        let lastError: any = null;

        // Determine Cloudinary resource type
        const isVideoOrAudio = contentType.startsWith('video') || contentType.startsWith('audio');
        const isDocument = contentType.startsWith('application') || contentType === 'text/plain';

        let resourceType = 'image';
        if (isVideoOrAudio) {
            resourceType = 'video';
        } else if (isDocument) {
            resourceType = 'raw';
        }

        // Cloudinary API Endpoint
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[StorageService] ☁️ Uploading to Cloudinary (${resourceType}) attempt ${attempt}/${MAX_RETRIES}`);

                // Map Supabase 'bucket' to Cloudinary 'folder' for organization
                let folderName = 'chat_media';
                if (bucket === 'profile-photos') folderName = 'profiles';
                if (bucket === 'voice-messages') folderName = 'voice_notes';
                if (resourceType === 'raw') folderName = 'chat_documents';

                if (Platform.OS === 'web') {
                    // WEB UPLOAD (Standard Fetch)
                    const formData = new FormData();
                    const response = await fetch(uri);
                    const blob = await response.blob();

                    formData.append('file', blob);
                    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                    formData.append('folder', folderName);

                    const uploadReq = await fetch(cloudinaryUrl, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await uploadReq.json();

                    if (data.error) throw new Error(data.error.message);

                    console.log('[StorageService] ✅ Cloudinary Success (Web):', data.secure_url);
                    return { data: data.secure_url, error: null };

                } else {
                    // MOBILE UPLOAD (FileSystem Native)
                    console.log(`[StorageService] ⚡ Uploading native URI: ${uri}`);

                    const uploadResult = await FileSystem.uploadAsync(
                        cloudinaryUrl,
                        uri,
                        {
                            httpMethod: 'POST',
                            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                            fieldName: 'file',
                            parameters: {
                                upload_preset: CLOUDINARY_UPLOAD_PRESET,
                                folder: folderName,
                            }
                        }
                    );

                    if (uploadResult.status !== 200) {
                        console.error('[StorageService] Cloudinary Upload failed:', uploadResult.body);
                        throw new Error(`Cloudinary Error: ${uploadResult.status}`);
                    }

                    const data = JSON.parse(uploadResult.body);
                    if (data.error) throw new Error(data.error.message);

                    console.log('[StorageService] ✅ Cloudinary Success (Mobile):', data.secure_url);
                    return { data: data.secure_url, error: null };
                }

            } catch (error: any) {
                lastError = error;
                console.log(`[StorageService] ⚠️ Attempt ${attempt} failed:`, error.message);

                if (attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }

        console.error('[StorageService] ❌ All attempts failed');
        return { data: null, error: lastError?.message || 'Upload failed' };
    }
};
