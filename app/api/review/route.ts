import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import type { DeckReview } from "../../hooks/useDeck";

type ReviewSlide = {
  name?: string;
  title?: string;
  body?: string;
  prompt?: string;
  note?: string;
  layout?: string;
  imageDescription?: string;
};

const SYSTEM_PROMPT =
  "You are an expert presentation consultant with 20 years of experience advising " +
  "executives and founders. You review presentation decks and give direct, actionable " +
  "feedback. You are honest but constructive. You focus on narrative clarity, slide " +
  "structure, messaging effectiveness, and overall persuasiveness. " +
  "When image descriptions are provided for slides, evaluate visual coherence across " +
  "the deck and include a 'visualCohesion' field in your response. " +
  "Do not include any explanation, preamble, or markdown — output only the raw JSON object.";

function buildUserPrompt(deckTitle: string, slides: ReviewSlide[]): string {
  const hasImageDescriptions = slides.some((s) => s.imageDescription);

  const outline = slides
    .map((s, i) => {
      const lines = [
        `Slide ${i + 1}: ${s.name || "(untitled)"}`,
        `  Layout: ${s.layout ?? "unknown"}`,
        s.title ? `  Title: ${s.title}` : null,
        s.body ? `  Body: ${s.body}` : null,
        s.note ? `  Speaker note: ${s.note}` : null,
        s.imageDescription ? `  Image: ${s.imageDescription}` : null,
        !s.title && !s.body && !s.note && !s.imageDescription
          ? `  (no text content yet)`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      return lines;
    })
    .join("\n\n");

  return [
    `Deck title: "${deckTitle}"`,
    "",
    outline,
    "",
    `Review this presentation deck as an expert consultant.${
      hasImageDescriptions
        ? " Image descriptions are provided — evaluate visual coherence across slides."
        : ""
    }`,
    "",
    `Return ONLY valid JSON in this exact shape:
{
  "overall": "string — 2-3 sentence overall assessment",
  "score": 7,
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "visualCohesion": "string — omit this field entirely if no image descriptions were provided",
  "slideReviews": [
    {
      "index": 0,
      "name": "slide name",
      "rating": "good | okay | weak",
      "feedback": "1-2 sentences",
      "suggestion": "specific improvement as a string, or null"
    }
  ]
}

Rules:
- score is an integer 1-10
- rating must be exactly one of: "good", "okay", "weak"
- suggestion is a string or null (not omitted)
- Omit visualCohesion entirely if no image descriptions were provided
- Do not include any text outside the JSON object`,
  ].join("\n");
}

function validateReview(r: unknown): r is DeckReview {
  if (typeof r !== "object" || r === null) return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.overall === "string" &&
    typeof obj.score === "number" &&
    Array.isArray(obj.strengths) &&
    Array.isArray(obj.improvements) &&
    Array.isArray(obj.slideReviews)
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

  const { deckTitle, slides } = body as {
    deckTitle?: string;
    slides?: ReviewSlide[];
  };

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "slides array is required." }, { status: 400 });
  }

  const userPrompt = buildUserPrompt(deckTitle?.trim() || "Untitled deck", slides);
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
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON object found");
    parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json(
      { error: "Claude returned malformed JSON. Please try again." },
      { status: 502 }
    );
  }

  if (!validateReview(parsed)) {
    return NextResponse.json(
      { error: "Claude returned an unexpected review shape. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ review: parsed });
}
