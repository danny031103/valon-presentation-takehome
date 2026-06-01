import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";

const STYLE_FRAGMENTS: Record<string, string> = {
  professional:
    "Professional corporate presentation image. Clean composition, authoritative color palette, modern aesthetic. Sharp focus, high production value. No text overlaid. No watermarks. No stock photo clichés. No cheesy business handshakes or generic office scenes.",
  minimal:
    "Stark minimalist image. Monochromatic or extremely limited palette. Maximum negative space. Single clear focal point. Architectural or abstract feel. No clutter, no decorative elements, no text. Museum-quality simplicity.",
  editorial:
    "High-end editorial magazine photography. Dramatic lighting, bold composition, cinematic quality. Could appear in Bloomberg Businessweek or Wired. High contrast, dynamic angle. No text overlaid. No watermarks. No amateur composition.",
  illustrative:
    "Premium digital illustration. Distinctive artistic style, rich colors, hand-crafted feel. Could appear in a top-tier design publication. Not photorealistic. No AI artifacts. No generic clipart aesthetic.",
  photographic:
    "Award-winning photography. Natural lighting, precise composition, shallow depth of field where appropriate. Could appear in National Geographic or a premium brand campaign. Hyper-realistic, sharp detail. No text overlaid. No watermarks. No stock photo feel.",
  none: ""
};

const QUALITY_SUFFIX =
  "High resolution. Sharp focus. Professional presentation quality. No text, words, or typography embedded in the image unless explicitly requested in the prompt.";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in your local environment." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      prompt?: string;
      style?: string;
      model?: string;
      context?: string;
      layout?: string;
      referenceImage?: string;
    };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const styleKey = body.style && body.style in STYLE_FRAGMENTS ? body.style : "professional";
    const fragment = STYLE_FRAGMENTS[styleKey];
    const contextSnippet = body.context ? body.context.slice(0, 2000) : null;
    const contextNote = contextSnippet
      ? `Context from user's documents (use this to inform the visual):\n${contextSnippet}`
      : null;
    const imageTextComposition =
      body.layout === "image-text"
        ? "Compose this image for the left half of a presentation slide. Use a vertically-oriented composition. Keep the main subject left or center-left. The right portion of the scene should be less busy, as text will appear beside this image on the right side of the slide."
        : null;
    const effectivePrompt = [prompt, fragment || null, imageTextComposition, contextNote, QUALITY_SUFFIX]
      .filter(Boolean)
      .join("\n\n");
    const resolvedModel = body.model || process.env.GOOGLE_IMAGE_MODEL || DEFAULT_MODEL;

    // Build contents: multimodal when a reference image is provided, plain text otherwise.
    let contents: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = effectivePrompt;
    if (body.referenceImage) {
      const match = body.referenceImage.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match?.[1] ?? "image/jpeg";
      const data = match ? match[2] : body.referenceImage;
      const referenceInstruction =
        "Use the provided reference image as visual inspiration and context. Generate a complete, fully-composed image where all elements are contained within the frame — nothing cropped or cut off at the edges. The output should be a complete scene.";
      contents = [
        { text: `${effectivePrompt}\n\n${referenceInstruction}` },
        { inlineData: { mimeType, data } }
      ];
    }

    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: resolvedModel,
      contents,
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
