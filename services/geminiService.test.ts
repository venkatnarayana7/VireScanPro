import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlagiarismService } from './geminiService';
import { HumanizationMode } from '../types';

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

describe('PlagiarismService', () => {
    let service: PlagiarismService;

    beforeEach(() => {
        // Reset mocks and environment
        vi.clearAllMocks();
        process.env.GROQ_API_KEY = 'gsk_test_key_placeholder';
        service = new PlagiarismService();
    });

    it('should initialize correctly', () => {
        expect(service).toBeDefined();
    });

    describe('analyzeText', () => {
        it('should analyze text and return structured results', async () => {
            const mockResponse = {
                similarityScore: 10,
                originalityScore: 90,
                aiScore: 5,
                writingScores: {
                    plagiarism: false,
                    spelling: 95,
                    conciseness: 80,
                    wordChoice: 85,
                    grammar: 90,
                    punctuation: 95,
                    readability: 88,
                    additional: 0
                },
                highlights: [],
                writingFeedback: { grammar: [], tone: "Neutral", readability: "High", aiMarkers: [] },
                summary: "Clean text."
            };

            mockCreate.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify(mockResponse) } }]
            });

            const result = await service.analyzeText('This is a test sentence.');

            expect(result).toBeDefined();
            expect(result.similarityScore).toBe(10);
            expect(result.originalityScore).toBe(90);
            expect(mockCreate).toHaveBeenCalledTimes(1);
        });

        it('should throw error for empty text', async () => {
            await expect(service.analyzeText('')).rejects.toThrow('cannot be empty');
        });
    });

    describe('rewriteToOriginal', () => {
        it('should rewrite text with specific mode', async () => {
            const mockResponse = {
                humanizedText: "This is a rewritten sentence.",
                originalAiProbability: 80,
                newAiProbability: 10,
                readabilityScore: 90,
                keyChanges: ["structure", "vocab"],
                toneAnalysis: "Natural"
            };

            mockCreate.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify(mockResponse) } }]
            });

            const result = await service.rewriteToOriginal('Original AI text.', HumanizationMode.NATURAL);

            expect(result).toBeDefined();
            expect(result.humanizedText).toBe("This is a rewritten sentence.");
            expect(result.newAiProbability).toBe(10);
        });
    });
});
