import "dotenv/config";
import { prisma } from "../lib/db";
import { buildPrompt } from "../lib/ai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import QRCode from "qrcode";

interface CheckResult {
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details?: string;
  error?: string;
}

async function runSmokeTests() {
  console.log("==================================================");
  console.log("🚀 TabAndRate Production Smoke Test Suite");
  console.log("==================================================\n");

  const results: CheckResult[] = [];

  // 1. Supabase PostgreSQL Connectivity
  const startDb = Date.now();
  try {
    const rawResult = await prisma.$queryRaw<{ connected: number }[]>`SELECT 1 as connected;`;
    const count = await prisma.business.count();
    const duration = Date.now() - startDb;
    results.push({
      name: "Supabase PostgreSQL Database",
      status: "PASS",
      durationMs: duration,
      details: `Connected (${rawResult[0]?.connected === 1 ? "OK" : "?"}). Found ${count} registered business(es).`,
    });
  } catch (err: any) {
    results.push({
      name: "Supabase PostgreSQL Database",
      status: "FAIL",
      durationMs: Date.now() - startDb,
      error: err.message,
    });
  }

  // 2. Groq AI Engine (Primary)
  const startGroq = Date.now();
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing from environment");

    const groq = new Groq({ apiKey });
    const prompt = buildPrompt(
      {
        businessName: "SmokeTest Cafe",
        category: "Café",
        tags: ["Cozy Ambiance", "Great Espresso"],
      },
      2
    );

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const duration = Date.now() - startGroq;
    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const reviews: string[] = Array.isArray(parsed.reviews)
      ? parsed.reviews
      : Array.isArray(parsed)
      ? parsed
      : [];

    if (reviews.length === 0) throw new Error("No reviews in model response");

    results.push({
      name: "Groq LLM Engine (Primary: qwen/qwen3.8-27b)",
      status: "PASS",
      durationMs: duration,
      details: `Generated ${reviews.length} reviews. Sample: "${reviews[0].slice(0, 60)}..."`,
    });
  } catch (err: any) {
    results.push({
      name: "Groq LLM Engine (Primary)",
      status: "FAIL",
      durationMs: Date.now() - startGroq,
      error: err.message,
    });
  }

  // 3. Google Gemini AI Engine (Fallback)
  const startGemini = Date.now();
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing from environment");

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
    });

    const prompt = buildPrompt(
      {
        businessName: "SmokeTest Bakery",
        category: "Bakery",
        tags: ["Fresh Croissants", "Great Service"],
        language: "Hinglish",
      },
      2
    );

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const duration = Date.now() - startGemini;
    const cleanText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleanText);
    const reviews: string[] = Array.isArray(parsed.reviews)
      ? parsed.reviews
      : Array.isArray(parsed)
      ? parsed
      : [];

    if (reviews.length === 0) throw new Error("No reviews in model response");

    results.push({
      name: "Google Gemini Engine (Fallback: gemini-3.6-flash)",
      status: "PASS",
      durationMs: duration,
      details: `Generated ${reviews.length} reviews. Sample: "${reviews[0].slice(0, 60)}..."`,
    });
  } catch (err: any) {
    results.push({
      name: "Google Gemini Engine (Fallback)",
      status: "FAIL",
      durationMs: Date.now() - startGemini,
      error: err.message,
    });
  }

  // 4. QR Code Generation Engine
  const startQr = Date.now();
  try {
    const testUrl = "https://tabandrate.com/r/smoke-test";
    const pngBuffer = await QRCode.toBuffer(testUrl, {
      type: "png",
      width: 300,
      margin: 2,
    });

    // Check PNG magic bytes: 0x89 0x50 0x4E 0x47
    const isPng =
      pngBuffer[0] === 0x89 &&
      pngBuffer[1] === 0x50 &&
      pngBuffer[2] === 0x4e &&
      pngBuffer[3] === 0x47;

    const duration = Date.now() - startQr;
    if (!isPng) throw new Error("Buffer is not a valid PNG");

    results.push({
      name: "QR Code Generation Engine",
      status: "PASS",
      durationMs: duration,
      details: `Generated valid PNG (${pngBuffer.length} bytes)`,
    });
  } catch (err: any) {
    results.push({
      name: "QR Code Generation Engine",
      status: "FAIL",
      durationMs: Date.now() - startQr,
      error: err.message,
    });
  }

  // 5. Supabase Analytics Event Insertion & Cleanup
  const startEvent = Date.now();
  try {
    const firstBusiness = await prisma.business.findFirst();
    if (!firstBusiness) {
      results.push({
        name: "Analytics Event Lifecycle",
        status: "PASS",
        durationMs: Date.now() - startEvent,
        details: "Skipped create (no business profiles yet in database)",
      });
    } else {
      // Create temporary smoke test event
      const event = await prisma.analyticsEvent.create({
        data: {
          businessId: firstBusiness.id,
          type: "visit",
          metadata: { smokeTest: true },
        },
      });

      // Cleanup
      await prisma.analyticsEvent.delete({
        where: { id: event.id },
      });

      const duration = Date.now() - startEvent;
      results.push({
        name: "Analytics Event Lifecycle",
        status: "PASS",
        durationMs: duration,
        details: `Successfully wrote & purged test event for business "${firstBusiness.name}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: "Analytics Event Lifecycle",
      status: "FAIL",
      durationMs: Date.now() - startEvent,
      error: err.message,
    });
  }

  // Summary Report
  console.log("--------------------------------------------------");
  console.log("📊 Results Summary");
  console.log("--------------------------------------------------");
  let anyFailed = false;

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${icon} [${r.status}] ${r.name} (${r.durationMs}ms)`);
    if (r.details) console.log(`   └─ ${r.details}`);
    if (r.error) {
      console.log(`   └─ ⚠️ ERROR: ${r.error}`);
      anyFailed = true;
    }
  }

  console.log("--------------------------------------------------\n");

  if (anyFailed) {
    console.error("❌ Smoke test suite failed.");
    process.exit(1);
  } else {
    console.log("🎉 All smoke tests passed successfully!");
    process.exit(0);
  }
}

runSmokeTests().catch((e) => {
  console.error("Fatal error running smoke tests:", e);
  process.exit(1);
});
