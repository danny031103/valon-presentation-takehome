import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY in your local environment." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      prompt?: string;
      style?: string;
      deckTitle?: string;
      slideTitle?: string;
    };

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const contextParts: string[] = [];
    if (body.deckTitle) contextParts.push(`Deck title: ${body.deckTitle}`);
    if (body.slideTitle) contextParts.push(`Slide name: ${body.slideTitle}`);
    if (body.style && body.style !== "none") contextParts.push(`Visual style: ${body.style}`);

    const userMessage = contextParts.length
      ? `${contextParts.join("\n")}\n\nPrompt to enhance: ${prompt}`
      : prompt;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        "You are an expert at writing prompts for AI image generation. Rewrite the user's rough prompt into a vivid, specific scene description that will produce a high-quality presentation slide image. Keep it under 100 words. Return only the enhanced prompt, no explanation.",
      messages: [{ role: "user", content: userMessage }]
    });

    const enhancedPrompt = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Enhancement failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
