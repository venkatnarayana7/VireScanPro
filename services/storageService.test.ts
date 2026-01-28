
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from './storageService';

describe('StorageService (Local Mode)', () => {
    beforeEach(() => {
        // Clear localStorage mock before each test
        localStorage.clear();
        // Reset internal mockDb state by reloading the module or essentially "clearing" it if exposed, 
        // but since it's private, we rely on the implementation syncing with localStorage or 
        // we can forcefully assume the service initializes from empty localStorage on first run.
        // However, storageService is a singleton. We might need to manually clear its internal state if accessible,
        // or rely on `localStorage.clear()` being enough if the service re-reads active state or if we can force a 'reset'.
        // Looking at the code, mockDb loads from localStorage at module level. 
        // We might need to monkey-patch or just trust the logic: 
        // actually, `mockDb` is initialized once. 
        // Let's rely on `saveHistoryItem` pushing to the array and valid read/writes.

        // Forcing local mode
        storageService.switchToLocal();
    });

    it('should save a history item and retrieve it', async () => {
        const userId = 'test_user_1';
        const item = {
            timestamp: new Date().toISOString(),
            text: 'Test plagiarism text',
            result: {
                similarityScore: 0,
                originalityScore: 100,
                aiScore: 0,
                writingScores: {
                    plagiarism: false,
                    spelling: 100,
                    conciseness: 100,
                    wordChoice: 100,
                    grammar: 100,
                    punctuation: 100,
                    readability: 100,
                    additional: 100
                },
                highlights: [],
                writingFeedback: {},
                summary: 'Clean'
            },
            hash: 'abc-123-hash'
        };

        // 1. Save Item
        const id = await storageService.saveHistoryItem(userId, item);
        expect(id).toBeDefined();

        // 2. Retrieve History
        const history = await storageService.getHistory(userId);
        expect(history).toHaveLength(1);
        expect(history[0].text).toBe('Test plagiarism text');
        expect(history[0].id).toBe(id);
    });

    it('should persist data to localStorage', async () => {
        const userId = 'test_user_2';
        const item = {
            timestamp: new Date().toISOString(),
            text: 'Persistence Check',
            result: {} as any,
            hash: 'hash'
        };

        await storageService.saveHistoryItem(userId, item);

        // Check raw localStorage
        const rawData = localStorage.getItem('veriscan_history_v7');
        expect(rawData).toBeTruthy();
        const parsed = JSON.parse(rawData!);
        expect(parsed[userId]).toHaveLength(1);
        expect(parsed[userId][0].text).toBe('Persistence Check');
    });
});
