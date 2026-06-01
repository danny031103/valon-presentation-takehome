import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import type { DeckPlan, DeckPlanSlide } from "../../hooks/useDeck";

const VALID_LAYOUTS = ["full-bleed", "image-text", "title", "text-only"];
const CONTEXT_API_LIMIT = 8000;

const SYSTEM_PROMPT =
  "You are a presentation designer. Generate a deck plan as JSON only. " +
  "Do not include any explanation, preamble, or markdown — output only the raw JSON object.";

function buildUserPrompt(
  brief: string,
  slideCount: number,
  style: string,
  context: string | null,
  purpose: string | null,
  audience: string | null
): string {
  const parts = [
    purpose ? `Purpose: ${purpose}` : null,
    audience ? `Audience: ${audience}` : null,
    `Brief: ${brief}`,
    `Slide count: ${slideCount}`,
    `Style: ${style}`,
    context ? `Reference material:\n${context}` : null,
    "",
    `Return ONLY valid JSON in this exact shape:
{
  "deckTitle": "string",
  "slides": [
    {
      "name": "string",
      "title": "string",
      "body": "string",
      "imagePrompt": "string",
      "layout": "full-bleed" | "image-text" | "title" | "text-only"
    }
  ]
}

Rules:
- imagePrompt should be vivid and specific, written for an image generation model
- layout should match the slide content (title slide → "title", data/text heavy → "text-only", etc.)
- body should be concise bullet points separated by newlines, not paragraphs
- Do not include any text outside the JSON object`,
  ];

  return parts.filter(Boolean).join("\n");
}

function validateSlide(slide: unknown): slide is DeckPlanSlide {
  if (typeof slide !== "object" || slide === null) return false;
  const s = slide as Record<string, unknown>;
  return (
    typeof s.name === "string" &&
    typeof s.title === "string" &&
    typeof s.body === "string" &&
    typeof s.imagePrompt === "string" &&
    VALID_LAYOUTS.includes(s.layout as string)
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { brief, context, slideCount, style, purpose, audience } = body as {
    brief?: string;
    context?: string;
    slideCount?: number;
    style?: string;
    purpose?: string;
    audience?: string;
  };

  if (!brief?.trim()) {
    return NextResponse.json({ error: "brief is required." }, { status: 400 });
  }

  const contextSnippet =
    typeof context === "string" ? context.slice(0, CONTEXT_API_LIMIT) : null;

  const userPrompt = buildUserPrompt(
    brief.trim(),
    slideCount ?? 5,
    style ?? "professional",
    contextSnippet,
    purpose?.trim() || null,
    audience?.trim() || null
  );

  const client = new Anthropic({ apiKey });

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    rawText = textBlock?.type === "text" ? textBlock.text : "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude API call failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let parsed: unknown;
  try {
    // Extract the first {...} block — handles fences, preamble, trailing text
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON object found");
    parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json(
      { error: "Claude returned malformed JSON. Please try again." },
      { status: 502 }
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).deckTitle !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).slides) ||
    ((parsed as Record<string, unknown>).slides as unknown[]).length === 0
  ) {
    return NextResponse.json(
      { error: "Claude returned an unexpected plan shape. Please try again." },
      { status: 502 }
    );
  }

  const { deckTitle, slides } = parsed as {
    deckTitle: string;
    slides: unknown[];
  };

  const invalidSlide = slides.find((s) => !validateSlide(s));
  if (invalidSlide !== undefined) {
    return NextResponse.json(
      {
        error:
          "Claude returned a slide with missing or invalid fields. Please try again.",
      },
      { status: 502 }
    );
  }

  const plan: DeckPlan = { deckTitle, slides: slides as DeckPlanSlide[] };
  return NextResponse.json({ plan });
}
