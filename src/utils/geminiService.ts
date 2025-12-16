import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing Gemini API Key in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const testConnection = async (): Promise<string | true> => {
    try {
        console.log("Testing Gemini Connection with Key:", API_KEY?.substring(0, 8) + "...");
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        await model.generateContent("Test");
        return true;
    } catch (error: any) {
        console.error("Gemini Connection Test Failed:", error);
        return error.message || "Unknown Connection Error";
    }
};

export interface GeminiPrediction {
    age: number;
    gender: string;
    comment: string;
}

// Models to try in order. We alternate between Flash (fast) and Pro (smarter) 
// to maximize the chance of hitting an open quota bucket.
const MODEL_CASCADE = [
    "gemini-1.5-flash",        // Standard, high quota (15 RPM)
    "gemini-1.5-flash-8b",     // High volume, lower latency
    "gemini-2.0-flash-exp",    // Experimental (separate quota)
    "gemini-1.5-pro",          // Pro model (separate quota)
    "gemini-flash-latest",     // Bleeding edge (preview)
];

export const predictAgeWithGemini = async (imageBase64: string): Promise<{ result: GeminiPrediction | null, error?: string }> => {
    let lastError = "Unknown Error";

    // Loop through all available models until one works
    for (const modelName of MODEL_CASCADE) {
        try {
            console.log(`Attempting prediction with model: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                ]
            });

            // Remove header if present (data:image/jpeg;base64,)
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            const prompt = `
              Estimate the age (number) and gender (male/female) of the person in this image.
              Add a short, humorous comment about their age.
              Return valid JSON only. NO markdown.
              Example: {"age": 25, "gender": "male", "comment": "..."}
            `;

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;

            // Check if blocked
            if (!response.candidates || response.candidates.length === 0) {
                // If blocked, maybe try next model? Or just fail? 
                // Usually safety blocks are prompt-based, not model-based, but let's try next.
                throw new Error("Safety Block or No Candidates");
            }

            let text = "";
            try {
                text = response.text();
            } catch (e) {
                throw new Error("Safety Block Triggered");
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Invalid JSON Response");
            }

            // If we got here, IT WORKED! Return immediately.
            console.log(`Success with ${modelName}!`);
            return { result: JSON.parse(jsonMatch[0]) as GeminiPrediction };

        } catch (error: any) {
            console.warn(`Failed with ${modelName}:`, error.message);

            // Analyze error to see if we should continue
            const msg = error.message || "";
            // We retry on: 429 (Quota), 404 (Not Found), 503 (Overloaded), or Fetch errors
            if (msg.includes("429") || msg.includes("Quota") || msg.includes("404") || msg.includes("Overloaded") || msg.includes("fetch")) {
                lastError = msg;
                continue; // Try next model!
            }

            // If it's a fundamental error (like Invalid Key), stop trying.
            if (msg.includes("API_KEY") || msg.includes("400")) {
                return { result: null, error: "Invalid API Key" };
            }

            lastError = msg;
            // Continue anyway for generic errors, just in case.
        }
    }

    // If we exit the loop, ALL models failed.
    let errorMsg = "Prediction Failed";
    if (lastError.includes("429")) {
        const waitMatch = lastError.match(/retry in ([0-9\.]+)/);
        if (waitMatch) {
            const seconds = Math.ceil(parseFloat(waitMatch[1]));
            errorMsg = `All Quotas Hit (Wait ${seconds}s)`;
        } else {
            errorMsg = "System Overloaded (Try later)";
        }
    } else if (lastError.includes("404")) {
        errorMsg = "AI Models Not Available";
    }

    return { result: null, error: errorMsg };
};
