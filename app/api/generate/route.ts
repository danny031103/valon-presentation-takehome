import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";

const STYLE_FRAGMENTS: Record<string, string> = {
  professional:
    "Editorial photography style as seen in Bloomberg Businessweek or Fast Company. Real environments, natural lighting, candid moments. Cinematic 35mm film aesthetic. No staged corporate scenes, no suits pointing at whiteboards, no handshakes, no generic office environments.",
  minimal:
    "Architectural photography. Clean geometric forms, dramatic negative space, monochromatic or duotone palette. Think Wallpaper* magazine or MoMA exhibition catalog. No people, no clutter, pure form and light.",
  editorial:
    "Award-winning photojournalism meets high fashion editorial. Dramatic chiaroscuro lighting, unexpected angles, high contrast. Could appear in Vogue Business or Wired. Cinematic, bold, unforgettable composition.",
  illustrative:
    "Contemporary digital illustration in the style of a premium tech company annual report. Sophisticated color palette, geometric abstraction, hand-crafted feel. Not clipart, not cartoon — premium and refined.",
  photographic:
    "National Geographic quality nature or architectural photography. Perfect natural lighting, precise composition, shallow depth of field. Hyper-realistic, tactile textures, sense of place and atmosphere.",
  none: ""
};

const QUALITY_SUFFIX =
  "Cinematic quality. No stock photography aesthetics. No staged scenes. No suits, handshakes, people at whiteboards, or generic office environments. Real lighting, real environments, genuine moments. Sharp focus. Professional presentation quality.";

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
        : body.layout === "text-image"
        ? "Compose this image for the right half of a presentation slide. Use a vertically-oriented composition. Keep the main subject right or center-right. The left portion of the scene should be less busy, as text will appear beside this image on the left side of the slide."
        : body.layout === "image-top"
        ? "Compose this image for the top 60% of a presentation slide. Use a wide horizontal composition. Keep important elements centered and avoid placing key details at the very bottom edge, as text will appear below this image."
        : body.layout === "image-bottom"
        ? "Compose this image for the bottom 60% of a presentation slide. Use a wide horizontal composition. Keep important elements centered and avoid placing key details at the very top edge, as text will appear above this image."
        : null;

    const fullBleedComposition =
      body.layout === "full-bleed"
        ? "Generate this image in a wide 16:9 landscape aspect ratio. The composition must fill the entire frame edge to edge with no letterboxing, black bars, or empty space at the edges. All important visual elements must be within the frame. Leave the center of the image relatively clean and uncluttered — avoid busy textures, text, or high-contrast details in the center third of the frame. The image should work as a background with overlaid text."
        : null;

    const allowsText = body.layout === "full-bleed" || body.layout === "big-quote";
    const promptMentionsText = /\b(text|type|typograph|word|letter|font|caption|headline|title|quote|label)\b/i.test(prompt);
    const textEncouragement =
      allowsText && !promptMentionsText
        ? "If typography or text elements would enhance the composition, feel free to include them."
        : null;
    const qualitySuffix = allowsText
      ? "High resolution. Sharp focus. Professional presentation quality."
      : QUALITY_SUFFIX;

    const effectivePrompt = [prompt, fragment || null, imageTextComposition, fullBleedComposition, contextNote, qualitySuffix, textEncouragement]
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
