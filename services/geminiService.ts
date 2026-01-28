
import Groq from "groq-sdk";
import { z } from "zod";
import { AnalysisResult, HumanizationMode, RewriteResult } from "../types";

// --- Runtime Validation Schemas (Zod) ---

const AnalysisSchema = z.object({
  similarityScore: z.number().min(0).max(100),
  originalityScore: z.number().min(0).max(100),
  aiScore: z.number().min(0).max(100),
  writingScores: z.object({
    plagiarism: z.boolean(),
    spelling: z.number(),
    conciseness: z.number(),
    wordChoice: z.number(),
    grammar: z.number(),
    punctuation: z.number(),
    readability: z.number(),
    additional: z.number(),
  }),
  highlights: z.array(z.object({
    text: z.string(),
    sourceUrl: z.string(), // Adapted from suspicionType to match types.ts
    confidence: z.number()
  })),
  writingFeedback: z.object({
    grammar: z.array(z.string()),
    tone: z.string(),
    readability: z.string(),
    aiMarkers: z.array(z.string()),
  }),
  summary: z.string(),
});

const RewriteSchema = z.object({
  humanizedText: z.string(),
  originalAiProbability: z.number(),
  newAiProbability: z.number(),
  readabilityScore: z.number(),
  keyChanges: z.array(z.string()),
  toneAnalysis: z.string(),
});

export class PlagiarismService {
  private groq: Groq | null = null;
  private readonly MODEL = "llama-3.3-70b-versatile";
  private readonly MAX_RETRIES = 3;

  constructor(private readonly explicitApiKey?: string) { }

  /**
   * Orchestrates the API call with Retries, parsing, and Validation
   */
  private async executeLlmRequest<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>,
    temperature: number = 0.5
  ): Promise<T> {
    const groq = this.ensureGroqInitialized();
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: this.MODEL,
          response_format: { type: "json_object" },
          temperature: temperature,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty response from Groq");

        // 1. Sanitize JSON (Strip markdown fences if AI adds them)
        const sanitized = this.cleanJsonString(content);

        // 2. Parse JSON
        const rawJson = JSON.parse(sanitized);

        // 3. Validate against Zod Schema
        return schema.parse(rawJson);

      } catch (error) {
        attempts++;
        console.warn(`LLM Attempt ${attempts} failed:`, error);

        if (attempts >= this.MAX_RETRIES) {
          throw new Error(`Operation failed after ${this.MAX_RETRIES} attempts. Last error: ${error}`);
        }

        // Exponential Backoff: Wait 1s, then 2s, then 4s
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempts - 1)));
      }
    }
    throw new Error("Unreachable");
  }

  public async analyzeText(text: string): Promise<AnalysisResult> {
    if (!text.trim()) throw new Error("Input text is empty");

    const systemPrompt = `
      You are a forensic linguistic auditor (Turnitin + GPTZero + Grammarly emulation).
      Output strictly in JSON.
      
      SCORING RULES:
      - **similarityScore**: 0-100. (Phrase matching against common internet corpora).
      - **aiScore**: 0-100. (Based on perplexity and burstiness).
      - If text has perfect grammar but low sentence variance -> High AI Score.
      - If text has "robotic" transitions ("Moreover", "In conclusion") -> High AI Score.
    `;

    const userPrompt = `
      Analyze the text inside the tags.
      <text_to_analyze>
      ${this.escapeText(text)}
      </text_to_analyze>

      Return JSON matching this structure:
      {
        "similarityScore": number,
        "originalityScore": number, // 100 - similarity
        "aiScore": number,
        "writingScores": { "plagiarism": boolean, "spelling": number, "conciseness": number, "wordChoice": number, "grammar": number, "punctuation": number, "readability": number, "additional": number },
        "highlights": [{ "text": "substring", "sourceUrl": "string (empty if AI marker)", "confidence": number }],
        "writingFeedback": { "grammar": ["string"], "tone": "string", "readability": "string", "aiMarkers": ["string"] },
        "summary": "string"
      }
    `;

    const result = await this.executeLlmRequest(systemPrompt, userPrompt, AnalysisSchema, 0.1);

    return {
      ...result,
      wordCount: text.trim().split(/\s+/).length,
      // Fallback calculation if AI math drifts
      originalityScore: 100 - result.similarityScore,
      sources: [] // Added to satisfy AnalysisResult interface
    };
  }

  public async rewriteToOriginal(
    text: string,
    mode: HumanizationMode = HumanizationMode.NATURAL
  ): Promise<RewriteResult> {
    if (!text.trim()) throw new Error("Input text is empty");

    const systemPrompt = `
      You are Core_v9 (Cognitive Engine). Your goal is to defeat AI detection by decoupling logic from syntax.
      
      *** THE "ANTI-GRAMMARLY" RULESET ***
      1. ASYMMETRICAL SYNTAX: Never write balanced sentences. Be Head-Heavy or Tail-Heavy.
      2. VOCABULARY DEPTH: Use Tier 3 words (e.g., "Underscore", "Catalyze") ONLY for main verbs.
      3. MICRO-ANECDOTE: Insert sensory details mid-sentence.
      
      ${this.getModeSpecifics(mode)}
    `;

    const userPrompt = `
      Humanize this text:
      <input_text>
      ${this.escapeText(text)}
      </input_text>
      
      Return JSON:
      {
        "humanizedText": "string",
        "originalAiProbability": number, // Estimation before rewrite
        "newAiProbability": number, // Estimation after rewrite
        "readabilityScore": number,
        "keyChanges": ["string"],
        "toneAnalysis": "string"
      }
    `;

    const temp = (mode === HumanizationMode.AGGRESSIVE || mode === HumanizationMode.CREATIVE) ? 1.0 : 0.7;
    return this.executeLlmRequest(systemPrompt, userPrompt, RewriteSchema, temp);
  }

  private ensureGroqInitialized(): Groq {
    if (this.groq) return this.groq;

    // Use environment variables (Vite standard)
    const apiKey = this.explicitApiKey ||
      import.meta.env.VITE_GROQ_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY; // Fallback to other keys if configured

    if (!apiKey) throw new Error("Missing Groq API Key. Please configure VITE_GROQ_API_KEY.");

    this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    return this.groq;
  }

  private cleanJsonString(str: string): string {
    // Removes ```json and ``` wrapping, and cleans common trailing comma errors
    return str.replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
  }

  private escapeText(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }

  private getModeSpecifics(mode: HumanizationMode): string {
    switch (mode) {
      case HumanizationMode.ACADEMIC:
        return "MODE: ACADEMIC. Use nominalizations (changing verbs to nouns) to increase density. Use passive voice intentionally.";
      case HumanizationMode.AGGRESSIVE:
        return "MODE: AGGRESSIVE. High burstiness. Mix 50-word sentences with 2-word fragments.";
      case HumanizationMode.CREATIVE:
        return "MODE: CREATIVE. Focus on texture and rhythm. Ignore standard sentence structures.";
      default:
        return "MODE: NATURAL. Coffee shop conversation. Use em-dashes and self-correction.";
    }
  }
}
