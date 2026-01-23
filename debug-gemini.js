import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Manual .env loading since we are in ES modules and might not have dotenv-cli
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

console.log("--- Gemini API Diagnostic ---");
console.log("API Key Present:", !!apiKey);
if (apiKey) console.log("API Key Prefix:", apiKey.substring(0, 5) + "...");

async function testConnection() {
    if (!apiKey) {
        console.error("❌ ERROR: No API Key found in .env.local");
        return;
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-pro",
        "gemini-1.5-pro-001",
        "gemini-1.5-pro-002",
        "gemini-2.0-flash-exp",
        "gemini-pro"
    ];

    console.log(`\nTesting ${modelsToTry.length} models to find a working one...`);

    for (const model of modelsToTry) {
        process.stdout.write(`Testing ${model}... `);
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: "Test.",
            });
            console.log(`✅ SUCCESS!`);
            // console.log("Response:", response.text);
            console.log(`\n🏆 WINNER: "${model}" is the correct model name for your key.`);
            return; // Stop after first success
        } catch (error) {
            console.log(`❌ FAILED`);
            if (error.message.includes("429")) console.log("   -> Quota Exceeded");
            else if (error.message.includes("404")) console.log("   -> Model Not Found (404)");
            else console.log(`   -> ${error.message.substring(0, 80)}...`);
        }
    }
    console.log("\n❌ ALL MODELS FAILED. This likely indicates an API Key issue or zero quota.");
}

testConnection();
