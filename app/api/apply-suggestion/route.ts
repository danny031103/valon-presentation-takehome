import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

type SuggestionType = "content" | "remove" | "split" | "other";

const CLASSIFY_SYSTEM =
  "Classify this presentation suggestion into exactly one category. Return only valid JSON:\n" +
  "- 'content': rewrite title/body text\n" +
  "- 'remove': delete/remove this slide entirely\n" +
  "- 'split': divide this slide into two slides\n" +
  "- 'other': any other structural change\n" +
  "Return ONLY: { \"type\": \"content\" | \"remove\" | \"split\" | \"other\" }";

const REWRITE_SYSTEM =
  "You are a presentation editor. Given a slide's current content and a reviewer's suggestion, " +
  "rewrite the slide title and body to implement the suggestion. Keep the same concise style — " +
  "title under 8 words, body as bullet points with • prefix, max 3 bullets under 10 words each. " +
  "Return ONLY valid JSON with no explanation: { \"title\": string, \"body\": string }";

const SPLIT_SYSTEM =
  "Split this slide content into two slides. Return ONLY valid JSON:\n" +
  "{ \"slide1\": { \"title\": string, \"body\": string }, \"slide2\": { \"title\": string, \"body\": string } }\n" +
  "Keep the same concise style — title under 8 words, body as bullet points with • prefix, max 3 bullets.";

function parseJson(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON object found");
  return JSON.parse(match[0]);
}

async function classifySuggestion(
  suggestion: string,
  client: Anthropic
): Promise<SuggestionType> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 64,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: suggestion }],
  });
  const textBlock = msg.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  const obj = parseJson(raw) as Record<string, unknown>;
  const t = obj.type;
  if (t === "content" || t === "remove" || t === "split" || t === "other") {
    return t;
  }
  return "other";
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "api", message: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "api", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { slideTitle, slideBody, suggestion, deckTitle } = body as {
    slideTitle?: string;
    slideBody?: string;
    suggestion?: string;
    deckTitle?: string;
  };

  if (!suggestion?.trim()) {
    return NextResponse.json(
      { error: "api", message: "suggestion is required." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  let type: SuggestionType;
  try {
    type = await classifySuggestion(suggestion, client);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Classification failed.";
    return NextResponse.json({ error: "api", message: msg }, { status: 502 });
  }

  if (type === "other") {
    return NextResponse.json(
      { error: "structural", message: "This suggestion requires manual editing." },
      { status: 200 }
    );
  }

  if (type === "remove") {
    return NextResponse.json({ action: "remove" });
  }

  const slideContext = [
    deckTitle ? `Deck title: "${deckTitle}"` : null,
    `Current title: ${slideTitle || "(none)"}`,
    `Current body: ${slideBody || "(none)"}`,
    `Reviewer suggestion: ${suggestion}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (type === "split") {
    let rawText: string;
    try {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: SPLIT_SYSTEM,
        messages: [{ role: "user", content: slideContext }],
      });
      const textBlock = msg.content.find((b) => b.type === "text");
      rawText = textBlock?.type === "text" ? textBlock.text : "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claude API call failed.";
      return NextResponse.json({ error: "api", message: msg }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = parseJson(rawText);
    } catch {
      return NextResponse.json(
        { error: "api", message: "Claude returned malformed JSON. Please try again." },
        { status: 502 }
      );
    }

    const obj = parsed as Record<string, unknown>;
    const s1 = obj.slide1 as Record<string, unknown> | undefined;
    const s2 = obj.slide2 as Record<string, unknown> | undefined;
    if (
      typeof s1?.title !== "string" || typeof s1?.body !== "string" ||
      typeof s2?.title !== "string" || typeof s2?.body !== "string"
    ) {
      return NextResponse.json(
        { error: "api", message: "Claude returned an unexpected shape. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      action: "split",
      slide1: { title: s1.title, body: s1.body },
      slide2: { title: s2.title, body: s2.body },
    });
  }

  // type === "content"
  let rawText: string;
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: REWRITE_SYSTEM,
      messages: [{ role: "user", content: slideContext }],
    });
    const textBlock = msg.content.find((b) => b.type === "text");
    rawText = textBlock?.type === "text" ? textBlock.text : "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude API call failed.";
    return NextResponse.json({ error: "api", message: msg }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = parseJson(rawText);
  } catch {
    return NextResponse.json(
      { error: "api", message: "Claude returned malformed JSON. Please try again." },
      { status: 502 }
    );
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.title !== "string" || typeof obj.body !== "string") {
    return NextResponse.json(
      { error: "api", message: "Claude returned an unexpected shape. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ action: "content", title: obj.title, body: obj.body });
}
