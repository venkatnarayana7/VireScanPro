import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult } from "../types";

export class PlagiarismService {
  constructor() {
    // Instantiation happens in methods
  }

  async analyzeText(text: string): Promise<AnalysisResult> {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("PLACEHOLDER")) {
      throw new Error("Gemini API Key is not set. Please check your .env.local file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = `
      Perform a forensic writing audit at the level of Grammarly and Turnitin.
      
      Analyze for:
      1. Plagiarism (Deep web matches)
      2. AI Patterns (Perplexity, Burstiness)
      3. Grammar & Punctuation
      4. Conciseness & Word Choice
      5. Structural Readability
      
      Text: "${text}"

      Respond ONLY in JSON. Do not use markdown backticks.
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
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Clean up markdown if present (SDK sometimes includes it)
      const jsonStr = textResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");

      const rawResult = JSON.parse(jsonStr || '{}');

      // Note: Standard SDK does not support Search Grounding on free tier easily, so passing empty sources for now.
      // If paid key logic is needed, we would add the tool here.

      return {
        ...rawResult,
        sources: [], // Search removed to ensure free tier compatibility
        wordCount: text.split(/\s+/).filter(Boolean).length
      };
    } catch (error: any) {
      console.error("Forensic Audit Error:", error);
      throw new Error(error.message || "Analysis failed. Text may be too short or invalid.");
    }
  }

  async rewriteToOriginal(text: string): Promise<string> {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("PLACEHOLDER")) {
      throw new Error("Gemini API Key is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Act as a Human Linguistic Master. Rewrite the input text to bypass ALL AI and Plagiarism detectors.
      
      Original: "${text}"

      Provide ONLY the rewritten text.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || '';
    } catch (error: any) {
      throw new Error(error.message || "Rewrite failed. Please check connection.");
    }
  }
}
