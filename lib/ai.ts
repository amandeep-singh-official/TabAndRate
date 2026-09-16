import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GenerateReviewsParams {
  businessName: string;
  category: string;
  tags: string[];
  customDescription?: string | null;
  extraNotes?: string;
  language?: string;
  count?: number;
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  English: "Write in natural, conversational English as typed on a smartphone by an everyday customer.",
  Hinglish:
    "Write in natural conversational Hinglish (Hindi written using English/Latin alphabet, e.g., 'Bhai kya mast food tha', 'Vibe bohot sahi h', 'Staff was super friendly'). Never use Devanagari Hindi script. Use Roman letters only.",
};

export function buildPrompt(params: GenerateReviewsParams, count: number): string {
  const {
    businessName,
    category,
    tags,
    customDescription,
    extraNotes,
    language = "English",
  } = params;

  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS["English"];
  const tagList = tags.slice(0, 5).join(", ");
  const descSection = customDescription
    ? `\nBusiness specialties: ${customDescription}`
    : "";
  const notesSection = extraNotes ? `\nCustomer notes: ${extraNotes}` : "";

  return `You are generating authentic, genuine Google reviews for a customer who loved this place.

Business: "${businessName}" (${category})${descSection}
Customer highlights: ${tagList}${notesSection}
Language style: ${langInstruction}

CRITICAL RULES — REVIEWS MUST SOUND 100% REAL & HUMAN (NOT LIKE AI):
- VERY SHORT & CONCISE: 1 to 2 sentences only (15–35 words max). Keep it punchy!
- CASUAL TONE: Sound like an everyday person quickly tapping a review on Google Maps.
- USE EMOJIS: Add 1 or 2 natural emojis per review (like 🔥, ✨, 👍, ☕, 🍕, 😋, 🙌, ❤️, 💯).
- USE SHORTFORMS & SLANG: Use natural abbreviations and casual words (e.g., "def", "super", "vibes", "10/10", "tbh", "coz").
- HINGLISH: If Hinglish is selected, use natural Roman Hindi words (e.g., "mast", "bohot sahi", "ekdum chill", "bhi", "h"). Never use Devanagari characters.
- ZERO AI CLICHÉS: Strictly DO NOT use generic marketing phrases like "culinary journey", "nestled in", "delightful haven", "testament to", "exceptional craftsmanship", "look no further".
- Mention the business "${businessName}" naturally.
- Ensure all ${count} reviews feel distinct with different casual writing styles.

Return ONLY a valid JSON object with key "reviews" containing an array of ${count} strings:
{"reviews": ["review 1", "review 2", ...]}`;
}

async function generateWithGroq(
  params: GenerateReviewsParams,
  count: number
): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const groq = new Groq({ apiKey });
  const modelsToTry = ["llama3-8b-8192", "llama3-70b-8192"];

  let lastError: Error | null = null;
  for (const model of modelsToTry) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: buildPrompt(params, count),
          },
        ],
        temperature: 0.85,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const reviews: string[] = Array.isArray(parsed.reviews)
        ? parsed.reviews
        : Array.isArray(parsed)
        ? parsed
        : Object.values(parsed).find(Array.isArray) ?? [];

      if (reviews.length > 0) return reviews.slice(0, count);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AI] Groq model ${model} failed, trying next:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Groq generation failed on all models");
}

async function generateWithGemini(
  params: GenerateReviewsParams,
  count: number
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const gemini = new GoogleGenerativeAI(apiKey);
  const modelsToTry = ["gemini-3.6-flash", "gemini-1.5-flash"];

  let lastError: Error | null = null;
  for (const modelName of modelsToTry) {
    try {
      const model = gemini.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(buildPrompt(params, count));
      const text = result.response.text();
      const cleanText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleanText);
      const reviews: string[] = Array.isArray(parsed.reviews)
        ? parsed.reviews
        : Array.isArray(parsed)
        ? parsed
        : Object.values(parsed).find(Array.isArray) ?? [];

      if (reviews.length > 0) return reviews.slice(0, count);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AI] Gemini model ${modelName} failed, trying next:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Gemini generation failed on all models");
}

export async function generateReviews(
  params: GenerateReviewsParams
): Promise<string[]> {
  const count = params.count ?? 5;

  try {
    // Primary: Groq (ultra-fast, free)
    return await generateWithGroq(params, count);
  } catch (primaryError) {
    console.warn("[AI] Groq failed, falling back to Gemini:", primaryError);
    try {
      // Fallback: Gemini Flash
      return await generateWithGemini(params, count);
    } catch (fallbackError) {
      console.error("[AI] Both providers failed:", fallbackError);
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`AI generation unavailable. Groq & Gemini failed. Last error: ${fallbackMsg}`);
    }
  }
}
