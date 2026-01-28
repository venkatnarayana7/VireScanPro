import Groq from "groq-sdk";
import { AnalysisResult, HumanizationMode, RewriteResult } from "../types";

interface EnvironmentConfig {
  apiKey: string;
}

export class PlagiarismService {
  private groq: Groq | null = null;
  private readonly MODEL = "llama-3.3-70b-versatile";
  private readonly DEFAULT_TEMPERATURE = 0.1;

  constructor() {
    this.initializeGroq();
  }

  /**
   * Initialize Groq client with validation
   */
  private initializeGroq(): void {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn("Groq API Key not configured. Service will attempt lazy initialization on first use.");
      return;
    }

    try {
      this.groq = new Groq({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    } catch (error) {
      console.error("Failed to initialize Groq client:", error);
      this.groq = null;
    }
  }

  /**
   * Retrieve and validate API key from environment
   */
  private getApiKey(): string | null {
    const keys = [
      import.meta.env.VITE_GROQ_API_KEY,
      import.meta.env.VITE_API_KEY,
      import.meta.env.VITE_GEMINI_API_KEY,
    ];

    for (const key of keys) {
      if (key && !key.includes("PLACEHOLDER")) {
        return key;
      }
    }

    return null;
  }

  /**
   * Ensure Groq client is initialized before use
   */
  private ensureGroqInitialized(): Groq {
    if (this.groq) {
      return this.groq;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        "API Key is missing. Please configure GROQ_API_KEY, API_KEY, or GEMINI_API_KEY in your environment."
      );
    }

    try {
      this.groq = new Groq({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
      return this.groq;
    } catch (error) {
      throw new Error(`Failed to initialize Groq client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze text for plagiarism, AI patterns, and writing quality
   */
  async analyzeText(text: string): Promise<AnalysisResult> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text to analyze cannot be empty.");
    }

    const groq = this.ensureGroqInitialized();

    const prompt = this.buildAnalysisPrompt(text);

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.MODEL,
        response_format: { type: "json_object" },
        temperature: this.DEFAULT_TEMPERATURE,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from Groq API.");
      }

      const parsedResult = this.parseJsonResponse(responseContent);
      const wordCount = this.calculateWordCount(text);

      return {
        ...(parsedResult as any),
        sources: [],
        wordCount,
      };
    } catch (error) {
      this.handleError("Text Analysis", error);
    }
  }

  /**
   * Rewrite text with humanization
   */
  async rewriteToOriginal(
    text: string,
    mode: HumanizationMode = HumanizationMode.NATURAL
  ): Promise<RewriteResult> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text to rewrite cannot be empty.");
    }

    const groq = this.ensureGroqInitialized();
    const temperature = this.getTemperatureForMode(mode);
    const prompt = this.buildRewritePrompt(text, mode);

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.MODEL,
        response_format: { type: "json_object" },
        temperature,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from Groq API.");
      }

      const parsedResult = this.parseJsonResponse(responseContent);

      return this.normalizeRewriteResult(parsedResult);
    } catch (error) {
      this.handleError("Text Rewrite", error);
    }
  }

  /**
   * Build the analysis prompt
   */
  private buildAnalysisPrompt(text: string): string {
    return `
      Perform a deep forensic linguistic audit on the following text.
      
      *** ANALYTICAL OBJECTIVE ***
      You are a specific emulation of a multi-model detector (Turnitin + GPTZero + Grammarly).
      You must evaluate THIS SPECIFIC TEXT. Do not output generic or average scores.
      
      Analyze for:
      1. **Plagiarism**: Simulated Deep Web search. distinct phrases that appear web-scraped.
      2. **AI Probability**: Burstiness (variation in sentence structure) and Perplexity (randomness of word choice).
      3. **Readability**: Flesch-Kincaid complexity.
      
      Text to Analyze:
      "${this.escapeText(text)}"

      MANDATORY SCORING RULES:
      - **similarityScore**: 0-100. (0 = Unique, 100 = Copied). BASED ON PHRASE MATCHING.
      - **originalityScore**: 100 - similarityScore.
      - **aiScore**: 0-100. (0 = Human, 100 = Pure AI). Analyze sentence variance.
      - **writingScores**: Specific sub-scores (0-100).
      
      CALCULATION HEURISTICS:
      - If text has perfect grammar but low sentence variance -> High AI Score.
      - If text has "robotic" transitions ("Moreover", "In conclusion") -> High AI Score.
      - If text has specific, unique metaphors -> Low AI Score.

      Respond ONLY in VALID JSON.
      Structure:
      {
        "similarityScore": number,
        "originalityScore": number,
        "aiScore": number,
        "writingScores": {
          "plagiarism": boolean, // true if similarityScore > 15
          "spelling": number,
          "conciseness": number,
          "wordChoice": number,
          "grammar": number,
          "punctuation": number,
          "readability": number,
          "additional": number
        },
        "highlights": [{ "text": "substring", "sourceUrl": "simulated_url", "confidence": number }],
        "writingFeedback": { "grammar": ["specific error"], "tone": "string", "readability": "string", "aiMarkers": ["found marker"] },
        "summary": "Specific critique of this text."
      }
    `;
  }

  /**
   * Build the rewrite prompt
   */
  private buildRewritePrompt(text: string, mode: HumanizationMode): string {
    const modeSpecifics = this.getModeSpecifics(mode);

    return `
      You are **Core_v9 (Cognitive Engine)**, a deep-learning adversary designed to deconstruct and rebuild text to defeat Grammarly AI and GPTZero.
      
      *** THE CORE PROBLEM ***
      Standard AI writing is "Symmetrical" and "Predictable". Grammarly detects 81%+ AI because the logic flows too perfectly.
      
      *** THE SOLUTION: COGNITIVE ASYMMETRY ***
      You must decouple the *logic* from the *syntax*. 
      Write sentences that are "Head-Heavy" (lots of context first) or "Tail-Heavy" (punchline at the end), but NEVER balanced.
      
      *** COGNITIVE CHAIN OF THOUGHT (Execute Internally) ***
      1. **Deconstruct**: Identify the core facts of the input.
      2. **Mask**: Remove ALL original transition words (Therefore, Additionally, However).
      3. **Re-Voice**: Choose a human persona (e.g., "Tired Expert", "Cynical Professor") and rewrite the facts from *their* perspective.
      4. **Inject Noise**: Add *necessary inefficiency*—adjectives or clauses that a machine tries to optimize away, but a human keeps for flavor.
      
      *** THE "ANTI-GRAMMARLY" RULESET ***
      
      1. **ASYMMETRICAL SYNTAX**:
         - **Bad (AI)**: "Blockchain is secure, and it provides transparency." (Balanced).
         - **Good (Human)**: "For all the security blockchain promises—and it does promise a lot—the transparency aspect is what actually matters." (Asymmetrical).
      
      2. **VOCABULARY DEPTH (The "Tier 3" Rule)**:
         - **Tier 1 (AI)**: "Use", "Show", "Help".
         - **Tier 2 (Better)**: "Utilize", "Demonstrate", "Facilitate".
         - **Tier 3 (Human Expert)**: "Wield", "Underscore", "Catalyze", "Buttress", "Mirror".
         - **Instruction**: Use Tier 3 words ONLY for the main verb of the sentence. Keep the rest simple.

      3. **THE "MICRO-ANECDOTE"**:
         - In the middle of an explanation, insert a 3-word "micro-story" or sensory detail.
         - *Example*: "...based on the data (which took weeks to clean)..."

      4. ** ACADEMIC SPECIFIC (If Mode = ACADEMIC)**:
         - **Do not use slang.**
         - Use **Nominalizations** to create density. "The system failed" -> "The systemic failure..."
         - Use **Hedging**: "It is undeniable" -> "One might argue..."

      Original Text: "${this.escapeText(text)}"

      ${modeSpecifics}
      
      Respond ONLY in VALID JSON.
      Structure:
      {
        "humanizedText": "string",
        "originalAiProbability": number,
        "newAiProbability": number,
        "readabilityScore": number,
        "keyChanges": ["string"],
        "toneAnalysis": "string"
      }
    `;
  }

  /**
   * Get mode-specific instructions
   */
  private getModeSpecifics(mode: HumanizationMode): string {
    const modeMap: Record<HumanizationMode, string> = {
      [HumanizationMode.NATURAL]: `
        MODE: NATURAL
        - Goal: "Coffee Shop Conversation".
        - Syntax: Looping, self-correcting.
        - Tactic: Use em-dashes (—) to insert thoughts.
      `,
      [HumanizationMode.ACADEMIC]: `
        MODE: ACADEMIC (Research Standard)
        - Goal: "Peer-Reviewed Journal".
        - Syntax: Hierarchical. Use subordinating conjunctions ("Whereas", "Insofar as", "Albeit").
        - **Anti-Grammarly Tactic**: Grammarly hates "passive voice" and "wordiness". USE THEM INTENTIONALLY.
        - Example: "The mistakes were made by the team" (Passive) is better than "The team made mistakes" (Active AI).
      `,
      [HumanizationMode.AGGRESSIVE]: `
        MODE: AGGRESSIVE (Anti-Detector)
        - Goal: Maximum Burstiness.
        - Syntax: Broken. Mix 50-word sentences with 1-word convictions.
        - Tactic: "Rhetorical Questions" followed immediately by answers.
      `,
      [HumanizationMode.CREATIVE]: `
        MODE: CREATIVE
        - Goal: Sensory Immersion.
        - Syntax: Flowing, rhythmic.
        - Tactic: Focus on "Texture" words (Rough, Bright, Silence).
      `,
    };

    return `TARGET MODE: ${mode}\nINSTRUCTIONS:\n${modeMap[mode] || modeMap[HumanizationMode.NATURAL]}`;
  }

  /**
   * Get temperature for mode
   */
  private getTemperatureForMode(mode: HumanizationMode): number {
    if (mode === HumanizationMode.AGGRESSIVE || mode === HumanizationMode.CREATIVE) {
      return 1.0;
    }
    return 0.85;
  }

  /**
   * Parse and validate JSON response
   */
  private parseJsonResponse(content: string): Record<string, any> {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Response is not a valid JSON object.");
      }
      return parsed;
    } catch (error) {
      throw new Error(
        `Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Normalize rewrite result with defaults
   */
  private normalizeRewriteResult(result: Record<string, any>): RewriteResult {
    return {
      humanizedText: result.humanizedText ?? "",
      originalAiProbability: this.clampScore(result.originalAiProbability ?? 80),
      newAiProbability: this.clampScore(result.newAiProbability ?? 10),
      readabilityScore: this.clampScore(result.readabilityScore ?? 50),
      keyChanges: Array.isArray(result.keyChanges) ? result.keyChanges : [],
      toneAnalysis: result.toneAnalysis ?? "Neutral",
    };
  }

  /**
   * Clamp numeric score to 0-100 range
   */
  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate word count
   */
  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * Escape text for safe embedding in prompts
   */
  private escapeText(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }

  /**
   * Handle and throw normalized errors
   */
  private handleError(context: string, error: unknown): never {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(`${context} failed: ${message}`);
  }
}
