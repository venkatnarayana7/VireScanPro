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

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

console.log("--- RAW API DIAGNOSTIC (No SDK) ---");

if (!apiKey) {
    console.error("❌ CRTICAL: No API Key found in .env.local");
    process.exit(1);
}

// Check for simple formatting errors
const trimmed = apiKey.trim();
if (trimmed.length !== apiKey.length) {
    console.warn("⚠️  WARNING: Your API Key has spaces around it in .env.local. Removing them for test...");
}
if (apiKey.substring(0, 4) !== 'AIza') {
    console.warn("⚠️  WARNING: Your API Key does not start with 'AIza'. It might be invalid.");
}

console.log(`Key Prefix: ${trimmed.substring(0, 8)}...`);
console.log(`Key Length: ${trimmed.length} chars`);

async function rawCheck() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`;

    console.log(`\nChecking Model List from Google Server...`);
    console.log(`Endpoint: ${url.replace(trimmed, 'HIDDEN_KEY')}`);

    try {
        const response = await fetch(url);
        const status = response.status;
        const data = await response.json();

        if (status === 200) {
            console.log("\n✅ SUCCESS! The API Key works and found these models:");
            const models = data.models || [];
            if (models.length === 0) {
                console.log("   (No models list returned - weird but 200 OK)");
            } else {
                models.forEach(m => console.log(`   - ${m.name.replace('models/', '')}`));

                // Recommendation
                const flash = models.find(m => m.name.includes("flash"));
                if (flash) {
                    console.log(`\n🏆 RECOMMENDATION: Please set your code to use "${flash.name.replace('models/', '')}"`);
                }
            }
        } else {
            console.log(`\n❌ API ERROR: HTTP ${status}`);
            console.log("Error Details:", JSON.stringify(data, null, 2));

            if (status === 400 && data.error?.message?.includes("API key not valid")) {
                console.log("\n👉 DIAGNOSIS: The API Key is WRONG. It does not exist.");
            }
            if (status === 403) {
                console.log("\n👉 DIAGNOSIS: BLOCKED. Possible reasons:");
                console.log("   1. You are in a restricted region (Europe/UK requires age check).");
                console.log("   2. The 'Generative Language API' is DISABLED in your Google Cloud Project.");
            }
        }
    } catch (err) {
        console.error("Network Error:", err.message);
    }
}

rawCheck();
