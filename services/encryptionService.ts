import CryptoJS from 'react-native-crypto-js';

// In a real production app, this key should be moved to a secure environment variable
// or derived from a user's PIN/Passphrase.
const SECRET_KEY = 'gossip-secure-encryption-key-shhh';

export const encryptionService = {
    encrypt(text: string): string {
        if (!text) return text;
        // Prefix to identify encrypted content
        const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
        return `enc:${encrypted}`;
    },

    decrypt(cipherText: string): string {
        if (!cipherText || !cipherText.startsWith('enc:')) return cipherText;

        try {
            const bytes = CryptoJS.AES.decrypt(cipherText.replace('enc:', ''), SECRET_KEY);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);

            // Fallback if decryption fails (e.g. wrong key)
            return originalText || cipherText;
        } catch (error) {
            console.warn('[EncryptionService] Decryption failed:', error);
            return cipherText;
        }
    }
};
