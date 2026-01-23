import Groq from "groq-sdk";
import { AnalysisResult } from "../types";

export class PlagiarismService {
  private groq: Groq;

  constructor() {
    // Initialize Groq client
    // Note: In Vite/Client-side, we must be careful with env vars. 
    // Ideally this runs server-side, but adhering to existing architecture:
    const apiKey = process.env.GROQ_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes("PLACEHOLDER")) {
      // We defer error throwing to methods to avoid crash on load
    }

    // Allow 'dangerouslyAllowBrowser' because this is a client-side demo app structure
    this.groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async analyzeText(text: string): Promise<AnalysisResult> {
    const apiKey = process.env.GROQ_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key is missing. Please add GROQ_API_KEY to .env.local");

    // Re-init to ensure latest key is used if changed at runtime
    this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

    const prompt = `
      Perform a forensic writing audit at the level of Grammarly and Turnitin.
      
      Analyze for:
      1. Plagiarism (Deep web matches)
      2. AI Patterns (Perplexity, Burstiness)
      3. Grammar & Punctuation
      4. Conciseness & Word Choice
      5. Structural Readability
      
      Text: "${text}"

      Respond ONLY in VALID JSON.
      Structure:
      {
        "similarityScore": number,
        "originalityScore": number,
        "aiScore": number,
        "writingScores": {
          "plagiarism": boolean,
          "spelling": number,
          "conciseness": number,
          "wordChoice": number,
          "grammar": number,
          "punctuation": number,
          "readability": boolean,
          "additional": number
        },
        "highlights": [{ "text": "string", "sourceUrl": "string", "confidence": number }],
        "writingFeedback": { "grammar": [], "tone": "string", "readability": "string", "aiMarkers": [] },
        "summary": "string"
      }
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';
      const rawResult = JSON.parse(responseContent);

      return {
        ...rawResult,
        sources: [], // Groq/Llama3 doesn't have web search grounding
        wordCount: text.split(/\s+/).filter(Boolean).length
      };
    } catch (error: any) {
      console.error("Forensic Audit Error:", error);
      throw new Error(error.message || "Groq Analysis failed.");
    }
  }

  async rewriteToOriginal(text: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");

    this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

    const prompt = `
      Act as a Human Linguistic Master. Rewrite the input text to bypass ALL AI and Plagiarism detectors.
      Original: "${text}"
      Provide ONLY the rewritten text.
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      throw new Error(error.message || "Groq Rewrite failed.");
    }
  }
}
