import { NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

type SlideLayout = "title" | "image-text" | "text-only" | "full-bleed";

type SlidePayload = {
  name: string;
  prompt: string;
  note?: string;
  imageData?: string;
  layout?: SlideLayout;
};

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
        "Content-Disposition": 'attachment; filename="valon-presentation-takehome-export.pptx"'
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while exporting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
