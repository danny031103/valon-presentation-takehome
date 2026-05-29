import type { CSSProperties } from "react";

import type { EditorMode, Slide, SlideFormatting, SlideLayout, SlideStatus } from "../hooks/useDeck";

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

type ErrorKind = "api-key" | "quota" | "safety" | "generic";

function getErrorKind(feedback: string): ErrorKind {
  if (feedback.includes("GOOGLE_API_KEY")) return "api-key";
  const lower = feedback.toLowerCase();
  if (lower.includes("quota") || lower.includes("429") || lower.includes("exhausted") || lower.includes("resource_exhausted")) return "quota";
  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("recitation") || lower.includes("harm")) return "safety";
  return "generic";
}

const ERROR_COPY: Record<ErrorKind, { title: string; body: string; canRetry: boolean }> = {
  "api-key": {
    title: "API key missing",
    body: "Add GOOGLE_API_KEY to .env.local and restart the dev server.",
    canRetry: false
  },
  quota: {
    title: "Quota exceeded",
    body: "Your Google AI quota is exhausted. Try again later or check your usage limits.",
    canRetry: true
  },
  safety: {
    title: "Blocked by safety filter",
    body: "The model blocked this request. Try rephrasing your prompt.",
    canRetry: true
  },
  generic: {
    title: "Generation failed",
    body: "",
    canRetry: true
  }
};

type SlideCanvasProps = {
  slide: Slide | undefined;
  editorMode: EditorMode;
  onPatch: (patch: Partial<Slide>) => void;
  onRetry: () => void;
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

// Editable text regions. Formatting (2c) is slide-wide, so a controlled
// textarea per field is enough — no per-character rich text needed.
function TitleField({
  value,
  style,
  onChange
}: {
  value: string;
  style: CSSProperties;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      aria-label="Slide title"
      className="layout-text-field layout-text-field-title"
      onChange={(event) => onChange(event.target.value)}
      placeholder="Title"
      rows={1}
      style={style}
      value={value}
    />
  );
}

function BodyField({
  value,
  style,
  onChange
}: {
  value: string;
  style: CSSProperties;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      aria-label="Slide body"
      className="layout-text-field"
      onChange={(event) => onChange(event.target.value)}
      placeholder="Body text"
      style={style}
      value={value}
    />
  );
}

function CanvasBody({
  layout,
  slide,
  onPatch
}: {
  layout: SlideLayout;
  slide: Slide;
  onPatch: (patch: Partial<Slide>) => void;
}) {
  const style = formattingStyle(slide.formatting);
  const title = slide.title ?? "";
  const body = slide.body ?? "";

  switch (layout) {
    case "title":
      return (
        <div className="layout-region layout-title">
          <TitleField value={title} style={style} onChange={(value) => onPatch({ title: value })} />
        </div>
      );
    case "image-text":
      return (
        <div className="layout-region layout-image-text">
          <div className="layout-image-pane">
            <SlideImage slide={slide} />
          </div>
          <div className="layout-text-pane">
            <TitleField value={title} style={style} onChange={(value) => onPatch({ title: value })} />
            <BodyField value={body} style={style} onChange={(value) => onPatch({ body: value })} />
          </div>
        </div>
      );
    case "text-only":
      return (
        <div className="layout-region layout-text-only">
          <TitleField value={title} style={style} onChange={(value) => onPatch({ title: value })} />
          <BodyField value={body} style={style} onChange={(value) => onPatch({ body: value })} />
        </div>
      );
    case "full-bleed":
    default:
      return <SlideImage slide={slide} />;
  }
}

export function SlideCanvas({ slide, editorMode, onPatch, onRetry }: SlideCanvasProps) {
  const layout: SlideLayout = slide?.layout ?? "full-bleed";

  return (
    <div className="canvas-wrap">
      <div className={`canvas-card canvas-layout-${layout}`}>
        {slide ? <CanvasBody layout={layout} slide={slide} onPatch={onPatch} /> : null}
        {slide?.status === "working" ? (
          <div className="canvas-skeleton">
            <p className="skeleton-hint">Generating image — usually 10–20s</p>
          </div>
        ) : null}
        {slide?.status === "error" ? (() => {
          const kind = getErrorKind(slide.feedback ?? "");
          const copy = ERROR_COPY[kind];
          return (
            <div className="canvas-error">
              <div className="canvas-error-inner">
                <span className="error-icon">⚠</span>
                <p className="error-title">{copy.title}</p>
                <p className="error-body">{copy.body || slide.feedback}</p>
                {copy.canRetry ? (
                  <button className="ghost-button button-sm" onClick={onRetry} type="button">
                    Retry
                  </button>
                ) : null}
              </div>
            </div>
          );
        })() : null}
      </div>

    </div>
  );
}
