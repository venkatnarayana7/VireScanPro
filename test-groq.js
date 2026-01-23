import Groq from "groq-sdk";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Manual .env loading
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const apiKey = process.env.GROQ_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

console.log("--- GROQ API DIAGNOSTIC ---");
if (!apiKey) {
    console.error("❌ No API Key found.");
    process.exit(1);
}

if (!apiKey.startsWith("gsk_")) {
    console.warn("⚠️  Your key does not start with 'gsk_'. Are you sure it's a Groq key?");
}

const groq = new Groq({ apiKey });

async function test() {
    process.stdout.write("Connecting to Llama-3 (Free)... ");
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: "Say 'Success'" }],
            model: "llama-3.3-70b-versatile",
        });
        console.log("✅ SUCCESS!");
        console.log("Response:", completion.choices[0]?.message?.content);
    } catch (err) {
        console.log("❌ FAILED");
        console.log(err.message);
    }
}

test();
