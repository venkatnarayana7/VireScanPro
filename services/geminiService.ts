
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export class PlagiarismService {
  constructor() {
    // We instantiate GoogleGenAI inside methods to ensure it uses the most up-to-date API key.
  }

  async analyzeText(text: string): Promise<AnalysisResult> {
    // Fix: Create a new GoogleGenAI instance right before making an API call as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Perform a forensic writing audit at the level of Grammarly and Turnitin.
      
      Analyze for:
      1. Plagiarism (Deep web matches)
      2. AI Patterns (Perplexity, Burstiness)
      3. Grammar & Punctuation
      4. Conciseness & Word Choice
      5. Structural Readability
      
      Text: "${text}"

      Respond ONLY in JSON:
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
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview", 
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0,
          // Fixed: recommended to provide responseSchema when using application/json
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              similarityScore: { type: Type.NUMBER },
              originalityScore: { type: Type.NUMBER },
              aiScore: { type: Type.NUMBER },
              writingScores: {
                type: Type.OBJECT,
                properties: {
                  plagiarism: { type: Type.BOOLEAN },
                  spelling: { type: Type.NUMBER },
                  conciseness: { type: Type.NUMBER },
                  wordChoice: { type: Type.NUMBER },
                  grammar: { type: Type.NUMBER },
                  punctuation: { type: Type.NUMBER },
                  readability: { type: Type.BOOLEAN },
                  additional: { type: Type.NUMBER }
                }
              },
              highlights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                  }
                }
              },
              writingFeedback: {
                type: Type.OBJECT,
                properties: {
                  grammar: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tone: { type: Type.STRING },
                  readability: { type: Type.STRING },
                  aiMarkers: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              summary: { type: Type.STRING }
            }
          }
        },
      });

      // Fixed: Using .text property directly
      const rawResult = JSON.parse(response.text || '{}');
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || 'External Source',
          uri: chunk.web?.uri || '',
        })) || [];

      return {
        ...rawResult,
        sources,
        wordCount: text.split(/\s+/).filter(Boolean).length
      };
    } catch (error) {
      console.error("Forensic Audit Error:", error);
      throw new Error("Analysis failed. Text may be too short or invalid.");
    }
  }

  async rewriteToOriginal(text: string): Promise<string> {
    // Fix: Create a new GoogleGenAI instance right before making an API call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Act as a Human Linguistic Master. Rewrite the input text to bypass ALL AI and Plagiarism detectors (Grammarly, Turnitin, Copyleaks).

      TECHNIQUE: "Syntactic Shifting"
      - Change the voice (Active vs Passive) frequently.
      - Break up predictable rhythms.
      - Use rare but contextually perfect synonyms.
      - Flip the order of information in sentences.
      - Inject human-specific nuance (idioms, varied sentence lengths).
      - Ensure NO 3-word sequence remains identical to the original if it was plagiarized.

      Original: "${text}"

      Provide ONLY the rewritten text.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: { temperature: 0.9 },
      });
      // Fixed: Using .text property directly
      return response.text || '';
    } catch (error) {
      throw new Error("Rewrite failed. Please check connection.");
    }
  }
}
