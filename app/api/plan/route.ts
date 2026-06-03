import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import type { DeckPlan, DeckPlanSlide } from "../../hooks/useDeck";

const VALID_LAYOUTS = ["full-bleed", "image-text", "title", "text-only", "text-image", "image-top", "image-bottom", "big-quote"];
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
      "layout": "full-bleed" | "image-text" | "text-image" | "title" | "text-only" | "image-top" | "image-bottom" | "big-quote"
    }
  ]
}

Rules:
- imagePrompt must describe a specific, real-world scene with concrete visual details. Avoid generic corporate imagery, floating objects on white backgrounds, cliché stock photo compositions, and anything that looks like AI clip art. Think cinematic photography or editorial illustration.
- layout must follow these strict rules:
  - Use 'title' only for the opening title slide with no body text
  - Use 'image-text' when the slide has both an image AND meaningful title/body text — image left, text right
  - Use 'text-image' like image-text but text is the focus — text left, image right; use when text is more important than the image
  - Use 'text-only' when the slide content is primarily text-based (data, lists, comparisons) and an image would distract
  - Use 'full-bleed' ONLY when the image IS the message and no text is needed — use sparingly, maximum 1-2 slides per deck
  - Never assign full-bleed to a slide that has title or body text
  - Use 'image-top' for scene-setting slides where the image establishes context and text below explains it
  - Use 'image-bottom' when leading with a statement or question at the top, then showing visual evidence below
  - Use 'big-quote' for impactful single statements, key statistics, or memorable moments — no image, just powerful text in the title field; leave body empty
- imagePrompt must describe what the camera sees — lighting direction, angle, mood, color palette, specific environment. Never describe the slide topic abstractly.
- Think cinematically: golden hour light through a window, aerial city view at dusk, close-up texture of materials, abstract geometric light patterns, architectural details — these beat generic office scenes every time.
- Avoid: people in suits, laptops, handshakes, whiteboards, conference rooms, stock photo scenarios. Instead use: architecture, nature, abstract patterns, textures, cityscapes, technology in real environments, artistic compositions.
- Each imagePrompt must be visually distinct from the others — vary angles, lighting, and subject matter to create visual rhythm across the deck.
- body should be concise bullet points, one per line, each prefixed with •. Example:
  • First point under ten words
  • Second point under ten words
  Never use plain text paragraphs for body content.
- body text must be maximum 3 bullet points per slide
- each bullet point must be under 10 words
- title must be under 8 words
- if there is more content, split it across multiple slides rather than cramming into one
- less is more — slides should be scannable in 3 seconds
- The first slide must always be a title slide with layout 'full-bleed'. Rules for the title slide:
  - title field must be a short, punchy phrase (3-6 words maximum) that captures the essence of the entire presentation — think magazine cover headline, not a description
  - body field must be empty for the title slide
  - imagePrompt must describe a cinematic, wide hero image that works as a background — dramatic lighting, strong composition, relevant to the deck theme. The imagePrompt for the title slide must include the actual deck title as text to render in the image. Example: if the deck title is "Climate in Crisis", the imagePrompt should say something like: "Cinematic aerial view of melting glaciers at golden hour, with the bold white text CLIMATE IN CRISIS centered in the frame, clean sans-serif typography, dramatic lighting." The text in the imagePrompt must match the deck title exactly.
  - Count this as slide 1 toward the requested slideCount
- No emojis anywhere in the deck — not in titles, body text, or slide names
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
