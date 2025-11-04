// ✅ Firebase Functions v2 version
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

type HintStyle = "neutral" | "personalized" | "motivational";

// 🔹 Define your secrets once (top-level)
const OPENROUTER_KEY = defineSecret("OPENROUTER_KEY");
const OPENROUTER_MODEL = defineSecret("OPENROUTER_MODEL");
// const OPENAI_KEY = defineSecret("OPENAI_KEY");
// const OPENAI_MODEL = defineSecret("OPENAI_MODEL");
const LLM_PROVIDER = defineSecret("LLM_PROVIDER");

// ------------------------------------------------------
// Utility functions
// ------------------------------------------------------

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function difficultyBand(progress: number) {
  if (progress <= 0.2) return "vague";
  if (progress <= 0.6) return "thematic";
  if (progress <= 0.9) return "strong";
  return "finale";
}

function buildUserPrompt({
  experienceType,
  sessionNumber,
  totalSessions,
  userName,
  style,
}: {
  experienceType: string;
  sessionNumber: number;
  totalSessions: number;
  userName?: string | null;
  style: HintStyle;
}) {
  const progress = clamp01(sessionNumber / totalSessions);
  const band = difficultyBand(progress);
  const name = userName?.trim() || "friend";

  const persona =
    style === "neutral"
      ? "Style: Neutral, poetic, mysterious."
      : style === "personalized"
      ? `Style: Personalized with the user's first name ("${name}") for warmth.`
      : `Style: Motivational & personalized with the user's first name ("${name}").`;

  return [
    `Generate one hint.`,
    `Rules:`,
    `- 1–2 sentences max (<= 180 characters ideal).`,
    `- Warm, playful, encouraging. Spark curiosity.`,
    `- NEVER reveal or name the experience directly, any brand, or address.`,
    `- Make it clearly about the hidden experience type "${experienceType}" via mood, senses, or setting.`,
    `- Proportional difficulty band: ${band}.`,
    `  - vague: abstract feeling, zero logistics`,
    `  - thematic: sensory & vibe`,
    `  - strong: 1–2 concrete details, still coy`,
    `  - finale: very revealing tease, still not explicit`,
    `- Output ONLY the hint text.`,
    ``,
    `Context:`,
    `- Session ${sessionNumber} of ${totalSessions} (${Math.round(
      progress * 100
    )}%).`,
    `- Experience type: "${experienceType}".`,
    `- ${persona}`,
  ].join("\n");
}

// ------------------------------------------------------
// API helpers
// ------------------------------------------------------

async function callOpenRouter(prompt: string): Promise<string> {
  const key = OPENROUTER_KEY.value();
  const model =
    OPENROUTER_MODEL.value() || "meta-llama/Meta-Llama-3-8B-Instruct";

  if (!key) throw new Error("OpenRouter key missing.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a Hint Maker for a hidden surprise experience. Produce a single hint: (a) 1–2 sentences, (b) warm, playful, motivational, (c) never naming the experience, venue, or brand, (d) aligned to the difficulty band (vague→finale). Forbidden: explicit experience names/brands/addresses. Output ONLY the hint.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const json: any = await res.json();
  const out = json?.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("OpenRouter returned empty content.");
  return out.replace(/\n+/g, " ").trim();
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = "ola"; //OPENAI_KEY.value();
  const model = "ole"; //OPENAI_MODEL.value() || "gpt-4.1-mini";

  if (!key) throw new Error("OpenAI key missing.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
    {
      role: "system",
      content: `You are a Hint Maker for a hidden surprise experience.
          Produce one short hint that is:
          (a) 1–2 sentences,
          (b) warm, playful, and motivational,
          (c) never naming the experience, venue, or brand,
          (d) aligned with the difficulty band (vague → finale),
          (e) containing no reference to time or order.
          Forbidden: any tags, brackets, or formatting markers such as <s>, </s>, [HINT], [/HINT], [BJackpot], markdown, or metadata.
          Output only the plain hint text. No extra text, prefixes, or symbols.`,
    }
    ,
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const json: any = await res.json();
  const out = json?.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("OpenAI returned empty content.");
  return out.replace(/\n+/g, " ").trim();
}

// ------------------------------------------------------
// Cloud Function
// ------------------------------------------------------

export const aiGenerateHint = onCall(
  {
    secrets: [
      OPENROUTER_KEY,
      OPENROUTER_MODEL,
      // OPENAI_KEY,
      // OPENAI_MODEL,
      LLM_PROVIDER,
    ],
  },
  async (requestData, context) => {
    console.log("🚀 aiGenerateHint called");

    // `requestData.data` for Firebase SDK clients
    const data = (requestData?.data || requestData) as any;
    const {
      experienceType,
      sessionNumber,
      totalSessions,
      userName,
      style,
    } = data;

    if (!experienceType || !sessionNumber || !totalSessions || !style) {
      console.error("❌ Missing required fields", data);
      throw new Error("Missing required fields.");
    }

    console.log("📦 Received valid data:", {
      experienceType,
      sessionNumber,
      totalSessions,
      style,
    });

    const prompt = buildUserPrompt({
      experienceType,
      sessionNumber,
      totalSessions,
      userName,
      style,
    });

    const provider = (LLM_PROVIDER.value() || "openrouter").toLowerCase();

    try {
      const hint =
        provider === "openai"
          ? await callOpenAI(prompt)
          : await callOpenRouter(prompt);

      const cleaned = hint
        // Remove anything inside [] or <>
        .replace(/\[.*?\]/g, '')
        .replace(/<.*?>/g, '')
        // Collapse extra spaces and newlines
        .replace(/\s+/g, ' ')
        // Fix spaces before punctuation
        .replace(/\s+([.,!?;:])/g, '$1')
        // Remove leading/trailing quotes or weird characters
        .replace(/^["“”'`]+|["“”'`]+$/g, '')
        .trim();

      // Keep only the first 2–3 sentences max (prevents long rambles)
      const finalHint = cleaned
        .split(/(?<=[.!?])\s+/)
        .slice(0, 3)
        .join(' ')
        .trim();

      return { hint: finalHint, style };
    } catch (err: any) {
      console.error("aiGenerateHint error:", err?.message || err);
      throw new Error("Failed to generate hint.");
    }
  }
);
