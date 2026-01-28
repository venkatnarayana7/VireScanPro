import Groq from "groq-sdk";
import { z } from "zod";
import {
  AnalysisResult as LegacyAnalysisResult,
  RewriteResult as LegacyRewriteResult,
  HumanizationMode as LegacyHumanizationMode
} from "../types";

// ==========================================
// 1. INDUSTRY-GRADE TYPES (Runtime Safety)
// ==========================================

export enum HumanizationMode {
  NATURAL = "NATURAL",       // Coffee shop talk, minor imperfections
  ACADEMIC = "ACADEMIC",     // Dense, nominalizations, passive voice
  AGGRESSIVE = "AGGRESSIVE", // Maximum burstiness, fragmented syntax (Hard to detect)
  STORYTELLER = "STORYTELLER" // High sensory detail, emotional logic
}

// Validation Schema: Guarantees the AI returns exactly what we need
const AnalysisSchema = z.object({
  similarityScore: z.number().min(0).max(100).describe("0-100 score of text that matches web sources"),
  aiProbability: z.number().min(0).max(100).describe("0-100 probability text is AI generated"),
  readabilityScore: z.number().min(0).max(100).describe("Flesch-Kincaid score"),
  writingQuality: z.object({
    sentenceVariance: z.number().describe("Score of how varied sentence lengths are"),
    emotionalResonance: z.number().describe("Score of emotional language usage"),
    grammar: z.number().describe("Grammar correctness score"),
  }),
  flags: z.array(z.object({
    text: z.string(),
    issue: z.string(), // Relaxed from strict enum to prevent AI "hallucination" crashes
    fix: z.string()
  })),
  strategicAdvice: z.string().describe("High-level advice to improve the text"),
});

const RewriteSchema = z.object({
  humanizedText: z.string(),
  stats: z.object({
    originalAiScore: z.number(),
    predictedNewAiScore: z.number(),
    burstinessScore: z.number().describe("Measure of sentence length variance (0-100)"),
  }),
  changesMade: z.array(z.string()).describe("List of specific tactics used (e.g., 'Added sensory detail')"),
});

export type NewAnalysisResult = z.infer<typeof AnalysisSchema>;
export type NewRewriteResult = z.infer<typeof RewriteSchema>;

// ==========================================
// 2. THE HARDCORE SERVICE CLASS
// ==========================================

export class TextIntelligenceService {
  private groq: Groq | null = null;
  private readonly MODEL = "llama-3.3-70b-versatile"; // Best balance of IQ vs Speed
  private readonly MAX_RETRIES = 3;

  constructor(private readonly config: { apiKey?: string; debug?: boolean } = {}) { }

  /**
   * Main Entry: Analyze text for AI patterns and quality
   */
  async analyze(text: string): Promise<NewAnalysisResult> {
    this.validateInput(text);

    const systemPrompt = `
      You are a Forensic Linguistic Auditor (Emulator of Turnitin + GPTZero).
      Your job is to detect "AI-Likeness" based on two metrics:
      1. PERPLEXITY: How predictable is the word choice? (Low = AI, High = Human)
      2. BURSTINESS: How varied is the sentence structure? (Uniform = AI, Chaotic = Human)
      
      CRITICAL: Do not be polite. Be clinically accurate.
    `;

    const userPrompt = `
      Analyze this text strictly.
      <text_analysis>
      ${this.escapeText(text)}
      </text_analysis>
      
      Return JSON adhering to this schema:
      {
        "similarityScore": 0-100,
        "aiProbability": 0-100,
        "readabilityScore": 0-100,
        "writingQuality": { "sentenceVariance": 0-100, "emotionalResonance": 0-100, "grammar": 0-100 },
        "flags": [{ "text": "substring", "issue": "AI_PATTERN", "fix": "suggestion" }],
        "strategicAdvice": "current critique"
      }
    `;

    return this.executeLlmRequest(systemPrompt, userPrompt, AnalysisSchema, 0.2);
  }

  /**
   * Main Entry: Rewrite text to bypass detection WITHOUT looking illiterate
   */
  async humanize(text: string, mode: HumanizationMode): Promise<NewRewriteResult> {
    this.validateInput(text);

    // Dynamic temperature: Higher for aggressive modes to force randomness
    const temperature = mode === HumanizationMode.AGGRESSIVE ? 0.95 : 0.75;

    const systemPrompt = `
      You are "Ghostwriter V9", an elite adversarial engine designed to defeat AI detection (GPTZero, Originality.ai).
      
      *** THE STRATEGY ***
      AI detectors look for "Symmetry" and "Predictability". 
      To defeat them, you must use **"Cognitive Asymmetry"**:
      
      1. **BURSTINESS RULE**: You must mix extremely short sentences (2-5 words) with extremely long, complex sentences (40+ words). Never write three sentences of similar length in a row.
      2. **VOCABULARY RULE**: Do NOT use "Thesaurus salad" (big words for no reason). Instead, use *idioms* and *phrasal verbs* (e.g., "count on", "run into") which AI avoids.
      3. **STRUCTURAL RULE**: Break the "Topic Sentence -> Evidence -> Conclusion" loop. Dive straight into the action/point. 
      4. **ANTI-HALLUCINATION**: Do not invent facts. Keep the core meaning, change the *delivery*.
      
      ${this.getModeInstructions(mode)}
    `;

    const userPrompt = `
      Re-write the following text to bypass AI detection.
      <input_text>
      ${this.escapeText(text)}
      </input_text>

      Return JSON:
      {
        "humanizedText": "The rewritten text...",
        "stats": { "originalAiScore": number, "predictedNewAiScore": number, "burstinessScore": number },
        "changesMade": ["list of 3 key tactics used"]
      }
    `;

    return this.executeLlmRequest(systemPrompt, userPrompt, RewriteSchema, temperature);
  }

  // ==========================================
  // 3. ROBUST EXECUTION ENGINE (Retries + Validation)
  // ==========================================

  private async executeLlmRequest<T>(
    sysPrompt: string,
    usrPrompt: string,
    schema: z.ZodSchema<T>,
    temp: number
  ): Promise<T> {
    const groq = this.ensureGroq();
    let lastError: unknown;

    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        const response = await groq.chat.completions.create({
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: usrPrompt }
          ],
          model: this.MODEL,
          response_format: { type: "json_object" },
          temperature: temp,
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("Empty response from LLM");

        // CLEANING: Llama sometimes wraps JSON in markdown blocks or adds trailing text
        const cleanJson = this.sanitizeJson(rawContent);
        const parsed = JSON.parse(cleanJson);

        // VALIDATION: Zod ensures the structure is 100% correct
        return schema.parse(parsed);

      } catch (err) {
        lastError = err;
        if (this.config.debug) console.warn(`Attempt ${i + 1} failed:`, err);
        // Exponential backoff: 500ms, 1000ms, 2000ms
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }

    throw new Error(`Service Failure: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  // ==========================================
  // 4. UTILITIES & PROMPT LOGIC
  // ==========================================

  private getModeInstructions(mode: HumanizationMode): string {
    const modes = {
      [HumanizationMode.NATURAL]: `
        MODE: NATURAL (The "Coffee Shop" Method)
        - Use contractions (don't, can't, it's).
        - Use em-dashes (—) to interrupt your own thoughts.
        - Start sentences with conjunctions (But, And, So).
        - Goal: Sound like a smart friend explaining a concept, not a textbook.
      `,
      [HumanizationMode.ACADEMIC]: `
        MODE: ACADEMIC (The "Ivy League" Method)
        - AI writes "simple". You must write "dense".
        - Use nominalizations (Turn verbs into nouns: "decided" -> "reached a decision").
        - Use passive voice intentionally to shift focus.
        - Use hedging words: "ostensibly", "arguably", "to some extent".
      `,
      [HumanizationMode.AGGRESSIVE]: `
        MODE: AGGRESSIVE (The "Journalist" Method)
        - HIGH VARIANCE REQUIRED.
        - Use rhetorical questions followed immediately by answers.
        - Use fragments for impact. "Not now. Not ever."
        - Eliminate all "fluff" words (Moreover, Furthermore, Additionally).
      `,
      [HumanizationMode.STORYTELLER]: `
        MODE: STORYTELLER
        - Focus on sensory details (sight, sound, texture).
        - Use metaphors instead of literal descriptions.
        - Example: Instead of "It was hard", write "It felt like wading through cement."
      `
    };
    return modes[mode] || modes[HumanizationMode.NATURAL];
  }

  private sanitizeJson(input: string): string {
    // Removes Markdown code blocks (```json ... ```)
    let cleaned = input.replace(/```json/g, "").replace(/```/g, "");
    // Removes potential trailing text after the JSON object closes
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1);
    return cleaned.trim();
  }

  private escapeText(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }

  private ensureGroq(): Groq {
    if (this.groq) return this.groq;
    // Safe environment variable access
    let key: string | undefined;

    // Check Vite Env first
    if (import.meta.env.VITE_GROQ_API_KEY) key = import.meta.env.VITE_GROQ_API_KEY;
    else if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
    else if (import.meta.env.VITE_GEMINI_API_KEY) key = import.meta.env.VITE_GEMINI_API_KEY;

    // Config fallback
    if (!key && this.config.apiKey) key = this.config.apiKey;

    if (!key) throw new Error("Groq API Key missing. Please configure VITE_GROQ_API_KEY.");

    this.groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
    return this.groq;
  }

  private validateInput(text: string) {
    if (!text || text.trim().length < 10) {
      throw new Error("Input text is too short to analyze/rewrite (min 10 chars).");
    }
  }
}

// ==========================================
// 5. COMPATIBILITY ADAPTER (For Existing App.tsx)
// ==========================================

export class PlagiarismService {
  private engine: TextIntelligenceService;

  constructor() {
    this.engine = new TextIntelligenceService();
  }

  async analyzeText(text: string): Promise<LegacyAnalysisResult> {
    const raw = await this.engine.analyze(text);
    const wordCount = text.trim().split(/\s+/).length;

    // Adapt NewAnalysisResult -> LegacyAnalysisResult
    return {
      similarityScore: raw.similarityScore,
      originalityScore: 100 - raw.similarityScore,
      aiScore: raw.aiProbability,
      wordCount: wordCount,
      sources: [], // No fake sources
      highlights: raw.flags.map(f => ({
        text: f.text,
        sourceUrl: f.issue, // Map Issue Type to "SourceUrl" label for UI compatibility
        confidence: 100
      })),
      writingFeedback: {
        grammar: raw.flags.filter(f => f.issue === 'GRAMMAR').map(f => `${f.text}: ${f.fix}`),
        tone: "Analyzed",
        readability: `${raw.readabilityScore}/100`,
        aiMarkers: raw.flags.filter(f => f.issue === 'AI_PATTERN').map(f => f.text)
      },
      writingScores: {
        plagiarism: raw.similarityScore > 15,
        spelling: raw.writingQuality.grammar, // Proxy
        conciseness: 80, // Default good
        wordChoice: raw.writingQuality.sentenceVariance, // Proxy
        grammar: raw.writingQuality.grammar,
        punctuation: raw.writingQuality.grammar,
        readability: raw.readabilityScore,
        additional: raw.writingQuality.emotionalResonance
      },
      summary: raw.strategicAdvice
    };
  }

  async rewriteToOriginal(text: string, mode: LegacyHumanizationMode): Promise<LegacyRewriteResult> {
    // Map Legacy Mode -> New Mode
    let newMode = HumanizationMode.NATURAL;
    if (mode === LegacyHumanizationMode.ACADEMIC) newMode = HumanizationMode.ACADEMIC;
    if (mode === LegacyHumanizationMode.AGGRESSIVE) newMode = HumanizationMode.AGGRESSIVE;
    if (mode.toString() === 'Creative' || mode.toString() === 'Storyteller') newMode = HumanizationMode.STORYTELLER;

    const raw = await this.engine.humanize(text, newMode);

    return {
      humanizedText: raw.humanizedText,
      originalAiProbability: raw.stats.originalAiScore,
      newAiProbability: raw.stats.predictedNewAiScore,
      readabilityScore: 60, // Default or calc
      keyChanges: raw.changesMade,
      toneAnalysis: `Burstiness Score: ${raw.stats.burstinessScore}/100`
    };
  }
}
