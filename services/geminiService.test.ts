import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlagiarismService } from './geminiService';
import { HumanizationMode as LegacyHumanizationMode } from '../types';

// Mock Groq SDK
const mockCreate = vi.fn();
vi.mock('groq-sdk', () => {
    return {
        default: class {
            chat = {
                completions: {
                    create: mockCreate
                }
            }
        }
    }
});

describe('PlagiarismService (Adapter Integration)', () => {
    let service: PlagiarismService;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GROQ_API_KEY = 'gsk_test_key_placeholder';
        // Mock import.meta.env since we are in a test environment
        // @ts-ignore
        global.import = { meta: { env: { VITE_GROQ_API_KEY: 'test_key' } } } as any;
        service = new PlagiarismService({ apiKey: 'test_key' });
    });

    it('should initialize correctly', () => {
        expect(service).toBeDefined();
    });

    describe('analyzeText', () => {
        it('should adapt New Analysis Schema to Legacy Result', async () => {
            // Mock LLM returning the NEW Schema
            const mockNewResponse = {
                plagiarismFound: true,
                totalIssues: 2,
                scores: {
                    grammar: 85,
                    spelling: 90,
                    punctuation: 95,
                    conciseness: 70,
                    readability: 60, // This will be overwritten by Math logic
                    wordChoice: 80,
                    additionalIssues: 10
                },
                flags: [
                    { text: "bad word", issue: "GRAMMAR", fix: "good word", severity: "MINOR" }
                ],
                summary: "Text has issues."
            };

            mockCreate.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify(mockNewResponse) } }]
            });

            const result = await service.analyzeText('This is a test sentence that fits the length requirement.');

            expect(result).toBeDefined();
            // Verify Logic: plagiarismFound: true => similarityScore should be 85 (default fallback)
            expect(result.similarityScore).toBe(85);
            // Verify Math Overwrite: Readability should NOT be the AI's 60, but calculated.
            // "This is a test sentence..." (1 sentence, ~10 words, ~13 syllables) -> Flesch ~70-80
            expect(parseInt(result.writingFeedback.readability)).not.toBe(60);
        });

        it('should throw error for short text', async () => {
            await expect(service.analyzeText('Hi')).rejects.toThrow('too short');
        });
    });

    describe('rewriteToOriginal', () => {
        it('should adapt New Rewrite Schema to Legacy Result', async () => {
            const mockNewResponse = {
                humanizedText: "Rewritten text content.",
                stats: {
                    originalAiScore: 100,
                    predictedNewAiScore: 0,
                    readabilityScore: 92
                },
                changesMade: ["fixed grammar"]
            };

            mockCreate.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify(mockNewResponse) } }]
            });

            const result = await service.rewriteToOriginal('Original AI text.', LegacyHumanizationMode.NATURAL);

            expect(result).toBeDefined();
            expect(result.humanizedText).toBe("Rewritten text content.");
            expect(result.readabilityScore).toBe(92);
        });
    });
});
