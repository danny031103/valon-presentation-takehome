import type { CSSProperties } from "react";

import type { Slide, SlideFormatting, SlideLayout, SlideStatus } from "../hooks/useDeck";

const FONT_SIZE_PX: Record<NonNullable<SlideFormatting["fontSize"]>, string> = {
  S: "14px",
  M: "18px",
  L: "24px",
  XL: "36px"
};

// Reflect slide-wide formatting onto the placeholder text regions so the
// toolbar is testable in 2c. Real title/body text takes the same style in 2d.
function formattingStyle(formatting: SlideFormatting | undefined): CSSProperties {
  if (!formatting) {
    return {};
  }

  return {
    fontWeight: formatting.bold ? 700 : undefined,
    fontStyle: formatting.italic ? "italic" : undefined,
    fontSize: formatting.fontSize ? FONT_SIZE_PX[formatting.fontSize] : undefined,
    color: formatting.color || undefined,
    textAlign: formatting.align || undefined
  };
}

const STATUS_LABEL: Record<SlideStatus, string> = {
  idle: "Ready",
  working: "Generating…",
  done: "Done",
  error: "Error"
};

type SlideCanvasProps = {
  slide: Slide | undefined;
};

function SlideImage({ slide }: { slide: Slide }) {
  if (slide.imageData) {
    return <img alt={slide.name} className="slide-image" src={slide.imageData} />;
  }

  return (
    <div className="empty-state">
      <p>No image yet.</p>
      <span>Switch to Generate to create an image, or pick a text layout.</span>
    </div>
  );
}

// Placeholder text regions — real editable title/body arrive in 2d.
function TitlePlaceholder({ style }: { style: CSSProperties }) {
  return (
    <span className="layout-placeholder layout-placeholder-title" style={style}>
      Title
    </span>
  );
}

function BodyPlaceholder({ style }: { style: CSSProperties }) {
  return (
    <span className="layout-placeholder" style={style}>
      Body text
    </span>
  );
}

function CanvasBody({ layout, slide }: { layout: SlideLayout; slide: Slide }) {
  const style = formattingStyle(slide.formatting);

  switch (layout) {
    case "title":
      return (
        <div className="layout-region layout-title">
          <TitlePlaceholder style={style} />
        </div>
      );
    case "image-text":
      return (
        <div className="layout-region layout-image-text">
          <div className="layout-image-pane">
            <SlideImage slide={slide} />
          </div>
          <div className="layout-text-pane">
            <TitlePlaceholder style={style} />
            <BodyPlaceholder style={style} />
          </div>
        </div>
      );
    case "text-only":
      return (
        <div className="layout-region layout-text-only">
          <TitlePlaceholder style={style} />
          <BodyPlaceholder style={style} />
        </div>
      );
    case "full-bleed":
    default:
      return <SlideImage slide={slide} />;
  }
}

export function SlideCanvas({ slide }: SlideCanvasProps) {
  const layout: SlideLayout = slide?.layout ?? "full-bleed";

  return (
    <div className="canvas-wrap">
      <div className={`canvas-card canvas-layout-${layout}`}>
        {slide ? <CanvasBody layout={layout} slide={slide} /> : null}
      </div>

      <div className="floating-chip">
        <span>{STATUS_LABEL[slide?.status ?? "idle"]}</span>
        {slide?.status !== "done" && slide?.feedback ? <span>{slide.feedback}</span> : null}
      </div>
    </div>
  );
}
