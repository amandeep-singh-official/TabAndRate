import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPrompt, generateReviews } from "@/lib/ai";
import fs from "fs";
import path from "path";

// Track models invoked at runtime
const modelsInvoked = {
  groq: [] as string[],
  gemini: [] as string[],
};

vi.mock("groq-sdk", () => {
  return {
    default: class MockGroq {
      chat = {
        completions: {
          create: vi.fn(async ({ model }: { model: string }) => {
            modelsInvoked.groq.push(model);
            if (model === "FAIL_GROQ") {
              throw new Error(`Model ${model} failed`);
            }
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      reviews: ["Great coffee and cozy atmosphere!"],
                    }),
                  },
                },
              ],
            };
          }),
        },
      };
    },
  };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel({ model }: { model: string }) {
        modelsInvoked.gemini.push(model);
        return {
          generateContent: vi.fn(async () => {
            if (model === "FAIL_GEMINI") {
              throw new Error(`Model ${model} failed`);
            }
            return {
              response: {
                text: () => JSON.stringify({
                  reviews: ["Loved the friendly service!"],
                }),
              },
            };
          }),
        };
      }
    },
  };
});

describe("AI Engine Unit Tests", () => {
  beforeEach(() => {
    modelsInvoked.groq = [];
    modelsInvoked.gemini = [];
    vi.clearAllMocks();
  });

  describe("buildPrompt", () => {
    it("synthesizes prompt with business name, category, tags, and human review rules", () => {
      const prompt = buildPrompt(
        {
          businessName: "D-Hangout",
          category: "Cafe",
          tags: ["Cozy Ambiance", "Great Coffee"],
          count: 5,
        },
        5
      );

      expect(prompt).toContain('Business: "D-Hangout" (Cafe)');
      expect(prompt).toContain("Cozy Ambiance, Great Coffee");
      expect(prompt).toContain("CRITICAL RULES — REVIEWS MUST SOUND 100% REAL & HUMAN (NOT LIKE AI):");
      expect(prompt).toContain("VERY SHORT & CONCISE: 1 to 2 sentences only (15–35 words max)");
      expect(prompt).toContain("USE EMOJIS: Add 1 or 2 natural emojis per review");
      expect(prompt).toContain("USE SHORTFORMS & SLANG");
      expect(prompt).toContain('{"reviews": ["review 1", "review 2", ...]}');
    });

    it("injects business specialties when provided", () => {
      const prompt = buildPrompt(
        {
          businessName: "Spice Garden",
          category: "Restaurant",
          tags: ["Friendly Staff"],
          customDescription: "Famous for authentic Butter Chicken and Garlic Naan.",
          count: 3,
        },
        3
      );

      expect(prompt).toContain("Business specialties: Famous for authentic Butter Chicken and Garlic Naan.");
    });

    it("injects customer extra notes when provided", () => {
      const prompt = buildPrompt(
        {
          businessName: "Tech Repair Pro",
          category: "Electronics",
          tags: ["Quick Turnaround"],
          extraNotes: "Fixed my cracked iPhone screen in under 20 minutes!",
          count: 2,
        },
        2
      );

      expect(prompt).toContain("Customer notes: Fixed my cracked iPhone screen in under 20 minutes!");
    });

    it("applies English and Hinglish language instructions correctly", () => {
      const hinglishPrompt = buildPrompt(
        {
          businessName: "Chai Point",
          category: "Cafe",
          tags: ["Masala Chai"],
          language: "Hinglish",
        },
        5
      );
      expect(hinglishPrompt).toContain(
        "Language style: Write in natural conversational Hinglish (Hindi written using English/Latin alphabet"
      );
      expect(hinglishPrompt).toContain("Never use Devanagari Hindi script. Use Roman letters only.");

      const englishPrompt = buildPrompt(
        {
          businessName: "Brew Bar",
          category: "Cafe",
          tags: ["Cold Brew"],
          language: "English",
        },
        5
      );
      expect(englishPrompt).toContain(
        "Language style: Write in natural, conversational English as typed on a smartphone by an everyday customer."
      );
    });
  });

  describe("AI Model Identifiers & Active Production Verification", () => {
    const aiSourcePath = path.resolve(process.cwd(), "lib/ai.ts");
    const aiSource = fs.readFileSync(aiSourcePath, "utf-8");

    it("configures only active production models in Groq modelsToTry array", () => {
      // Extract Groq modelsToTry
      const groqMatch = aiSource.match(/generateWithGroq[\s\S]*?const modelsToTry\s*=\s*(\[[^\]]+\])/);
      expect(groqMatch).not.toBeNull();

      const groqModels = JSON.parse(groqMatch![1].replace(/'/g, '"'));
      expect(groqModels).toEqual(["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]);
    });

    it("configures only active production models in Gemini modelsToTry array", () => {
      // Extract Gemini modelsToTry
      const geminiMatch = aiSource.match(/generateWithGemini[\s\S]*?const modelsToTry\s*=\s*(\[[^\]]+\])/);
      expect(geminiMatch).not.toBeNull();

      const geminiModels = JSON.parse(geminiMatch![1].replace(/'/g, '"'));
      expect(geminiModels).toEqual(["gemini-1.5-flash", "gemini-2.0-flash"]);
    });

    it("does not contain obsolete or fictitious models in lib/ai.ts", () => {
      const obsoleteModels = [
        "llama-3-70b-8192",         // Deprecated Groq model
        "llama3-70b",
        "llama-3.2-90b",
        "gemini-pro",               // Obsolete Gemini 1.0
        "gemini-1.0-pro",
        "gemini-ultra",
        "gpt-4",
        "text-davinci",
      ];

      for (const model of obsoleteModels) {
        expect(aiSource).not.toContain(model);
      }
    });

    it("invokes active primary Groq model during generation", async () => {
      process.env.GROQ_API_KEY = "mock-groq-key";
      process.env.GEMINI_API_KEY = "mock-gemini-key";

      const reviews = await generateReviews({
        businessName: "Test Cafe",
        category: "Cafe",
        tags: ["Coffee"],
        count: 1,
      });

      expect(reviews).toEqual(["Great coffee and cozy atmosphere!"]);
      expect(modelsInvoked.groq).toContain("llama-3.3-70b-versatile");
    });
  });
});
