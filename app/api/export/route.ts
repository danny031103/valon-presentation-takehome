import { NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

type SlideLayout = "title" | "image-text" | "text-only" | "full-bleed";

type SlideFormatting = {
  bold?: boolean;
  italic?: boolean;
  bullets?: boolean;
  fontSize?: "S" | "M" | "L" | "XL";
  color?: string;
  align?: "left" | "center" | "right";
};

type SlidePayload = {
  name: string;
  prompt: string;
  note?: string;
  imageData?: string;
  layout?: SlideLayout;
  title?: string;
  body?: string;
  formatting?: SlideFormatting;
  titleFormatting?: SlideFormatting;
  bodyFormatting?: SlideFormatting;
};

// Turn a deck title into a safe download filename: strip filesystem-unsafe
// characters, collapse whitespace, fall back to "untitled-deck". Mirrors the
// client-side sanitize in useDeck.ts.
function toFileName(title: string | undefined): string {
  const cleaned = (title ?? "")
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleaned || "untitled-deck"}.pptx`;
}

// On-screen px values double as export pt sizes so output mirrors the canvas.
const FONT_SIZE_PT: Record<NonNullable<SlideFormatting["fontSize"]>, number> = {
  S: 14,
  M: 18,
  L: 24,
  XL: 36
};

// Build pptxgenjs text props from slide-wide formatting (2c). fontSize, when
// set, overrides the field's default size — applies to both title and body.
function textOptions(
  formatting: SlideFormatting | undefined,
  defaults: { fontFace: string; fontSize: number; align: "left" | "center" | "right" }
) {
  return {
    fontFace: defaults.fontFace,
    fontSize:
      formatting?.fontSize !== undefined ? FONT_SIZE_PT[formatting.fontSize] : defaults.fontSize,
    bold: formatting?.bold ?? false,
    italic: formatting?.italic ?? false,
    color: (formatting?.color ?? "#141414").replace(/^#/, ""),
    align: formatting?.align ?? defaults.align,
    valign: "middle" as const,
    margin: 0
  };
}

// Build the text value for addText — plain string normally, bullet array when
// formatting.bullets is set. Strips the leading "• " the canvas inserts so
// pptxgenjs can apply its own native bullet rendering.
function bodyText(
  text: string,
  formatting: SlideFormatting | undefined
): string | { text: string; options: { bullet: boolean } }[] {
  if (!formatting?.bullets) return text;
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => ({
      text: line.startsWith("• ") ? line.slice(2) : line,
      options: { bullet: true }
    }));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      slides?: SlidePayload[];
    };

    if (!body.slides?.length) {
      return NextResponse.json({ error: "No slides to export." }, { status: 400 });
    }

    const deck = new pptxgen();
    deck.layout = "LAYOUT_WIDE";
    deck.author = "Valon";
    deck.company = "Valon";
    deck.subject = "Valon Presentation Takehome export";
    deck.title = body.title || "Valon Presentation Takehome export";

    for (const slideData of body.slides) {
      const slide = deck.addSlide();
      slide.background = { color: "F4E7B8" };

      // Honor layout when placing the image. Editable title/body text
      // arrives in 2d — title/text-only layouts intentionally have no image.
      const layout: SlideLayout = slideData.layout ?? "full-bleed";
      const hasImageRegion = layout === "full-bleed" || layout === "image-text";
      const imageRegion =
        layout === "image-text"
          ? { x: 0, y: 0, w: 6.667, h: 7.5 }
          : { x: 0, y: 0, w: 13.333, h: 7.5 };

      if (hasImageRegion) {
        if (slideData.imageData) {
          slide.addImage({ data: slideData.imageData, ...imageRegion });
        } else {
          slide.addShape("rect", {
            x: imageRegion.x + 0.3,
            y: imageRegion.y + 0.3,
            w: imageRegion.w - 0.6,
            h: imageRegion.h - 0.6,
            fill: { color: "FFF7DC" },
            line: { color: "2B1E16", width: 1.5 }
          });
          slide.addText("No image on this slide yet.", {
            x: imageRegion.x + 0.3,
            y: 3.1,
            w: imageRegion.w - 0.6,
            h: 0.5,
            fontFace: "Aptos",
            fontSize: 18,
            bold: true,
            color: "2B1E16",
            align: "center"
          });
        }
      }

      // Editable title/body, positioned per layout. full-bleed is image-only
      // (matches the canvas), so it gets no text boxes here.
      const title = slideData.title?.trim() ? slideData.title : "";
      const body = slideData.body?.trim() ? slideData.body : "";

      const titleFmt = slideData.titleFormatting ?? slideData.formatting;
      const bodyFmt = slideData.bodyFormatting ?? slideData.formatting;

      if (layout === "title") {
        if (title) {
          slide.addText(
            title,
            { x: 0.8, y: 2.6, w: 11.733, h: 2.3, ...textOptions(titleFmt, { fontFace: "Aptos Display", fontSize: 40, align: "center" }) }
          );
        }
      } else if (layout === "image-text") {
        if (title) {
          slide.addText(
            title,
            { x: 7.0, y: 1.0, w: 5.8, h: 1.5, ...textOptions(titleFmt, { fontFace: "Aptos Display", fontSize: 28, align: "left" }) }
          );
        }
        if (body) {
          slide.addText(
            bodyText(body, bodyFmt),
            { x: 7.0, y: 2.6, w: 5.8, h: 3.8, ...textOptions(bodyFmt, { fontFace: "Aptos", fontSize: 18, align: "left" }) }
          );
        }
      } else if (layout === "text-only") {
        if (title) {
          slide.addText(
            title,
            { x: 1.0, y: 1.2, w: 11.333, h: 1.5, ...textOptions(titleFmt, { fontFace: "Aptos Display", fontSize: 32, align: "center" }) }
          );
        }
        if (body) {
          slide.addText(
            bodyText(body, bodyFmt),
            { x: 1.0, y: 2.9, w: 11.333, h: 3.5, ...textOptions(bodyFmt, { fontFace: "Aptos", fontSize: 18, align: "left" }) }
          );
        }
      }

      slide.addText(slideData.name || "Untitled slide", {
        x: 0.4,
        y: 0.25,
        w: 7.6,
        h: 0.4,
        fontFace: "Aptos Display",
        fontSize: 18,
        bold: true,
        color: "141414",
        margin: 0
      });

      slide.addText(slideData.prompt || "", {
        x: 0.4,
        y: 6.95,
        w: 8.3,
        h: 0.3,
        fontFace: "Aptos",
        fontSize: 8,
        color: "141414",
        margin: 0
      });

      slide.addText(slideData.note || "", {
        x: 8.95,
        y: 6.8,
        w: 4,
        h: 0.45,
        fontFace: "Aptos",
        fontSize: 8,
        color: "2B1E16",
        margin: 0,
        align: "right"
      });
    }

    const file = await deck.write({ outputType: "nodebuffer" });

    let responseBody: BodyInit;

    if (typeof file === "string" || file instanceof Blob || file instanceof ArrayBuffer) {
      responseBody = file;
    } else {
      const arrayBuffer = new ArrayBuffer(file.byteLength);
      new Uint8Array(arrayBuffer).set(file);
      responseBody = arrayBuffer;
    }

    return new Response(responseBody, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${toFileName(body.title)}"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while exporting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
