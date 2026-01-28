/**
 * Cryptographic service for securing forensic data
 */
export const cryptoService = {
    /**
     * Generates a SHA-512 hash of the provided text.
     * used for creating an immutable integrity trail of audited manuscripts.
     * 
     * @param text The text to hash
     * @returns The hexadecimal representation of the SHA-512 hash
     */
    generateSHA512: async (text: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-512', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
};
