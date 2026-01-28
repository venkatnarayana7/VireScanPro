import Groq from "groq-sdk";
import { z } from "zod";
import {
  AnalysisResult as LegacyAnalysisResult,
  RewriteResult as LegacyRewriteResult,
  HumanizationMode as LegacyHumanizationMode
} from "../types";

// ==========================================
// 1. ROBUST TYPES (Prevents Crashes)
// ==========================================

export enum HumanizationMode {
  ACADEMIC = "ACADEMIC",       // Research papers (Clean but complex)
  ANTI_GRAMMARLY = "ANTI_GRAMMARLY", // "Dumb" mode (Undetectable but messy)
  STORYTELLER = "STORYTELLER", // Creative writing
  NATURAL = "NATURAL"          // Standard conversational
}

const IssueType = z.enum([
  "AI_PATTERN",
  "REPETITION",
  "CLICHE",
  "LOGIC_FLAW",
  "GRAMMAR",
  "SPELLING",
  "READABILITY"
]);

// Flexible Schema: Handles AI hallucinations gracefully
const AnalysisSchema = z.object({
  similarityScore: z.number().min(0).max(100),
  aiProbability: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100),
  writingQuality: z.object({
    sentenceVariance: z.number(),
    academicTone: z.number().optional(),
    grammar: z.number(),
    emotionalResonance: z.number().optional().default(50), // Fallback for legacy
  }),
  flags: z.array(z.object({
    text: z.string(),
    issue: IssueType.catch("AI_PATTERN"), // Safety catch: improperly flagged issues default to AI_PATTERN instead of crashing
    fix: z.string()
  })),
  strategicAdvice: z.string()
});

const RewriteSchema = z.object({
  humanizedText: z.string(),
  stats: z.object({
    originalAiScore: z.number(),
    predictedNewAiScore: z.number(),
    complexityScore: z.number().describe("Depth of vocabulary and syntax"),
  }),
  changesMade: z.array(z.string())
});

export type NewRewriteResult = z.infer<typeof RewriteSchema>;
export type NewAnalysisResult = z.infer<typeof AnalysisSchema>;

// ==========================================
// 2. THE SERVICE
// ==========================================

export class TextIntelligenceService {
  private groq: Groq | null = null;
  private readonly MODEL = "llama-3.3-70b-versatile";
  private readonly MAX_RETRIES = 3;

  constructor(private readonly config: { apiKey?: string } = {}) { }

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
        "writingQuality": { "sentenceVariance": 0-100, "grammar": 0-100, "emotionalResonance": 0-100 },
        "flags": [{ "text": "substring", "issue": "AI_PATTERN", "fix": "suggestion" }],
        "strategicAdvice": "critique"
      }
    `;

    return this.executeLlmRequest(systemPrompt, userPrompt, AnalysisSchema, 0.2);
  }

  /**
   * Universal Humanizer: Handles both "Smart" and "Dumb" modes
   */
  async humanize(text: string, mode: HumanizationMode): Promise<NewRewriteResult> {
    this.validateInput(text);

    // Temperature Control: 
    // NUCLEAR mode needs High Temperature (Randomness) + Low Top_P (Focus) implied by model defaults
    const isNuclear = mode === HumanizationMode.NUCLEAR;
    // Academic needs typically lower temp (0.7) to stay coherent.
    // Anti-Grammarly needs higher temp (0.9) to generate "noise".
    const temperature = isNuclear ? 1.0 : (mode === HumanizationMode.ACADEMIC ? 0.7 : 0.9);

    const systemPrompt = `
      You are "Core_v9", an elite linguistic engine.
      Your goal is to rewrite the input text based on the TARGET MODE.
      
      ${this.getModeInstructions(mode)}
      
      GENERAL RULES:
      1. Do not hallucinate facts. Keep the meaning 100% identical.
      2. Do not add fake URLs or citations.
    `;

    const userPrompt = `
      Rewrite this text:
      <input_text>
      ${this.escapeText(text)}
      </input_text>

      Return strictly valid JSON:
      {
        "humanizedText": "string",
        "stats": { "originalAiScore": 0-100, "predictedNewAiScore": 0-100, "complexityScore": 0-100 },
        "changesMade": ["string", "string"]
      }
    `;

    return this.executeLlmRequest(systemPrompt, userPrompt, RewriteSchema, temperature);
  }

  /**
   * The "Nuclear" Workflow for stubborn text
   */
  async hardHumanize(text: string): Promise<NewRewriteResult> {
    // Pass 1: Break the AI structure completely (Chaos Method)
    const pass1 = await this.humanize(text, HumanizationMode.ANTI_GRAMMARLY);

    // Pass 2: Smooth it out just enough to be readable, but lock the structure
    // We feed the output of Pass 1 into Pass 2
    const pass2 = await this.humanize(pass1.humanizedText, HumanizationMode.NATURAL);

    return {
      ...pass2,
      changesMade: [...pass1.changesMade, ...pass2.changesMade],
      stats: {
        ...pass2.stats,
        // Show the user the drastic change
        originalAiScore: pass1.stats.originalAiScore,
        predictedNewAiScore: pass2.stats.predictedNewAiScore
      }
    };
  }

  /**
   * The "Iterative Refinement" Pattern
   */
  async smartHumanize(rawText: string): Promise<NewRewriteResult> {
    // 1. First, analyze to see WHERE it is failing
    const analysis = await this.analyze(rawText);

    // 2. Choose mode based on the current score
    let mode = HumanizationMode.NATURAL;

    if (analysis.aiProbability > 80) {
      // If it's glaringly AI, use the Nuclear option
      mode = HumanizationMode.NUCLEAR;
    } else if (analysis.aiProbability > 40) {
      // If it's unsure, use the Academic/Natural mix
      mode = HumanizationMode.ACADEMIC;
    }

    // 3. Execute ONE strong pass
    return this.humanize(rawText, mode);
  }

  // ==========================================
  // 3. THE "MAGIC" PROMPT LOGIC
  // ==========================================

  private getModeInstructions(mode: HumanizationMode): string {
    const modes = {
      // ---------------------------------------------------------
      // OPTION A: RESEARCH PAPERS (High Quality, Low Detection)
      // ---------------------------------------------------------
      [HumanizationMode.ACADEMIC]: `
        TARGET MODE: ACADEMIC (The "Professor" Method)
        
        **Objective**: Pass AI detection by increasing LINGUISTIC DENSITY, not by making errors.
        
        1. **SYNTACTIC COMPLEXITY (The "Clause" Rule)**:
           - AI writes simple sentences: "The study showed X. This means Y."
           - You write complex sentences: "While the study initially suggested X, closer inspection reveals Y, notwithstanding the outliers."
           - Use subordinating conjunctions: *Whereas, Insofar as, Albeit, Given that*.
           
        2. **VOCABULARY DEPTH (Tier 3)**:
           - Use specific, high-level vocabulary.
           - Instead of "show", use "elucidate" or "underscore".
           - Instead of "change", use "fluctuation" or "paradigm shift".
           
        3. **NOMINALIZATIONS**:
           - Turn verbs into nouns. This is a hallmark of academic writing.
           - "We analyzed the data" -> "The analysis of the data was conducted..."
           
        4. **HEDGING**:
           - Never be 100% sure. AI is always sure.
           - Use: "It is plausible that," "The data suggests," "One might argue."
      `,

      // ---------------------------------------------------------
      // OPTION B: ANTI-GRAMMARLY (Nuclear Option)
      // ---------------------------------------------------------
      [HumanizationMode.ANTI_GRAMMARLY]: `
        TARGET MODE: ANTI-GRAMMARLY_V2 (The "Chaos" Method)
        
        **Objective**: Destroy the "Logic Chain" that Grammarly detects.
        
        1. **THE "DISCONNECT" RULE (Crucial)**:
           - AI connects every sentence logically ("Therefore", "As a result").
           - **YOU MUST**: Remove logical connectors. Jump between thoughts abruptly.
           - *Bad (AI)*: "The server crashed, therefore users were disconnected."
           - *Good (Human)*: "The server crashed. Users got disconnected." (No bridge).

        2. **THE "AFTERTHOUGHT" TACTIC**:
           - Add a short clause at the END of a sentence that feels like an afterthought.
           - *Example*: "...which was the whole point, honestly."
           - *Example*: "...at least for now."

        3. **VARIABLE SUBJECT STARTING**:
           - Never start three sentences in a row with "The" or "It".
           - Start with a Preposition: "In the middle of the process..."
           - Start with a Verb (Gerund): "Running the script again revealed..."

        4. **INTENTIONAL VAGUENESS**:
           - AI is precise. Humans are vague.
           - specific numbers ("42%") -> vague quantifiers ("almost half").
           - specific dates -> "a few days ago".
           
        5. **IDIOMATIC PHRASING**:
           - Use "Run into" instead of "Encounter".
           - Use "Figure out" instead of "Determine".
           - Use "Iron out" instead of "Resolve".
      `,

      // ---------------------------------------------------------
      // OPTION C: NUCLEAR (The "Subjective Bridge")
      // ---------------------------------------------------------
      [HumanizationMode.NUCLEAR]: `
        TARGET MODE: NUCLEAR (Opinionated Editorial)
      
        *** STRATEGY: THE "SUBJECTIVE BRIDGE" ***
        AI is objective. Humans are subjective.
        You must rewrite the input by injecting a "Subjective Opinion" into every paragraph.
        
        *** FEW-SHOT EXAMPLES (MIMIC THIS STYLE) ***
        
        [Input (AI)]: "The software update improves security. It creates a firewall."
        [Output (Human)]: "Honestly, the update is a pain, but it locks things down. Think of it like a firewall, basically."
        
        [Input (AI)]: "Climate change is a significant challenge requiring global cooperation."
        [Output (Human)]: "We are looking at a mess with the climate. It's going to take everyone working together to even put a dent in it."
        
        *** MANDATORY RULES ***
        1. **NO TRANSITIONS**: Banned words: "Moreover", "Furthermore", "In conclusion", "Additionally".
        2. **START WITH VERBS**: Try starting sentences with -ing words. "Running the data showed..."
        3. **USE CONTRACTIONS**: Always use "It's", "We're", "Don't".
        4. **BREAK THE FLOW**: Use a dash (—) to interrupt yourself.
      `,

      [HumanizationMode.NATURAL]: `
        TARGET MODE: NATURAL. Conversational, blogging style. Use contractions and idioms.
      `,

      [HumanizationMode.STORYTELLER]: `
        TARGET MODE: STORYTELLER. Focus on sensory details (sight, sound, texture). Use metaphors.
      `
    };

    return modes[mode] || modes[HumanizationMode.NATURAL];
  }

  // ==========================================
  // 4. EXECUTION UTILS
  // ==========================================

  private async executeLlmRequest<T>(sys: string, usr: string, schema: z.ZodSchema<T>, temp: number): Promise<T> {
    const groq = this.ensureGroq();
    let lastErr;

    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        const res = await groq.chat.completions.create({
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          model: this.MODEL,
          response_format: { type: "json_object" },
          temperature: temp,
        });

        const rawContent = res.choices[0]?.message?.content;
        if (!rawContent) throw new Error("Empty response from LLM");

        const content = this.cleanJson(rawContent);
        return schema.parse(JSON.parse(content));
      } catch (e) {
        lastErr = e;
        if (i < this.MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Backoff
        }
      }
    }
    throw new Error(`LLM Failed after ${this.MAX_RETRIES} attempts: ${lastErr}`);
  }

  private cleanJson(str: string): string {
    return str.replace(/^```json\s*/, "").replace(/\s*```$/, "").replace(/,(\s*[}\]])/g, '$1').trim();
  }

  private ensureGroq(): Groq {
    if (this.groq) return this.groq;

    // Use environment variables (Vite standard)
    const key = this.config.apiKey ||
      import.meta.env.VITE_GROQ_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY;

    if (!key) throw new Error("No API Key configured. Please check VITE_GROQ_API_KEY.");
    this.groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
    return this.groq;
  }

  private validateInput(text: string) {
    if (!text || text.trim().length < 10) throw new Error("Text too short");
  }

  private escapeText(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
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

    // SMART/NUCLEAR OPTION: If user selects AGGRESSIVE, we now use the Smart Humanize workflow
    if (mode === LegacyHumanizationMode.AGGRESSIVE) {
      const raw = await this.engine.smartHumanize(text);
      return {
        humanizedText: raw.humanizedText,
        originalAiProbability: raw.stats.originalAiScore,
        newAiProbability: raw.stats.predictedNewAiScore,
        readabilityScore: raw.stats.complexityScore,
        keyChanges: raw.changesMade,
        toneAnalysis: `Smart Applied: ${raw.stats.complexityScore}/100` // Visual indicator
      };
    }

    let newMode = HumanizationMode.NATURAL;
    if (mode === LegacyHumanizationMode.ACADEMIC) newMode = HumanizationMode.ACADEMIC;
    if (mode.toString() === 'Creative' || mode.toString() === 'Storyteller') newMode = HumanizationMode.STORYTELLER;

    const raw = await this.engine.humanize(text, newMode);

    return {
      humanizedText: raw.humanizedText,
      originalAiProbability: raw.stats.originalAiScore,
      newAiProbability: raw.stats.predictedNewAiScore,
      readabilityScore: raw.stats.complexityScore, // Map complexity to readability slot
      keyChanges: raw.changesMade,
      toneAnalysis: `Vocabulary Depth: ${raw.stats.complexityScore}/100`
    };
  }
}
```
