import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";

const STYLE_FRAGMENTS: Record<string, string> = {
  professional:
    "Create a clean, modern, corporate presentation image. Use a clear composition, professional color palette, and minimal decorative elements. Polished and restrained.",
  minimal:
    "Create a stark, minimal image. Monochromatic or very limited palette. Generous negative space. No decorative elements. Austere and precise.",
  editorial:
    "Create a magazine-quality editorial image. Dramatic lighting, bold composition, high visual impact. Photography or design-forward aesthetic.",
  illustrative:
    "Create a hand-crafted illustration. Artistic, colorful, distinctive visual language. Not photorealistic — clearly illustrated.",
  photographic:
    "Create a photorealistic image with natural lighting and high-quality photography aesthetics. Realistic and grounded.",
  none: ""
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in your local environment." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { prompt?: string; style?: string; model?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const styleKey = body.style && body.style in STYLE_FRAGMENTS ? body.style : "professional";
    const fragment = STYLE_FRAGMENTS[styleKey];
    const effectivePrompt = fragment ? `${prompt}\n\n${fragment}` : prompt;
    const resolvedModel = body.model || process.env.GOOGLE_IMAGE_MODEL || DEFAULT_MODEL;

    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: resolvedModel,
      contents: effectivePrompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    });

    const parts = (response.candidates ?? []).flatMap(
      (candidate) => candidate.content?.parts ?? []
    );
    const imagePart = parts.find((part) => part.inlineData?.data);
    const text = parts
      .filter((part) => typeof part.text === "string")
      .map((part) => part.text?.trim())
      .filter(Boolean)
      .join("\n");

    if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
      return NextResponse.json(
        {
          error:
            text || "The model answered, but it did not send an image back."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      text
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while generating.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
