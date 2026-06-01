import { type CSSProperties, useEffect, useRef } from "react";

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
  onFocusField: (field: "title" | "body" | null) => void;
};

function SlideImage({ slide }: { slide: Slide }) {
  if (slide.imageData) {
    const objectPosition = slide.generatedForLayout === "image-text" ? "left center" : "center center";
    return <img alt={slide.name} className="slide-image" src={slide.imageData} style={{ objectPosition }} />;
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
function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function TitleField({
  value,
  style,
  onChange,
  onFocus,
  onBlur
}: {
  value: string;
  style: CSSProperties;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (ref.current) autoResize(ref.current); }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label="Slide title"
      className="layout-text-field layout-text-field-title"
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
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
  onChange,
  onFocus,
  onBlur
}: {
  value: string;
  style: CSSProperties;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (ref.current) autoResize(ref.current); }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label="Slide body"
      className="layout-text-field"
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      placeholder="Body text"
      rows={2}
      style={style}
      value={value}
    />
  );
}

export function CanvasBody({
  layout,
  slide,
  editorMode,
  onPatch,
  onFocusField
}: {
  layout: SlideLayout;
  slide: Slide;
  editorMode: EditorMode;
  onPatch: (patch: Partial<Slide>) => void;
  onFocusField: (field: "title" | "body" | null) => void;
}) {
  const titleStyle = formattingStyle(slide.titleFormatting);
  const bodyStyle = formattingStyle(slide.bodyFormatting);
  const title = slide.title ?? "";
  const body = slide.body ?? "";

  switch (layout) {
    case "title":
      return (
        <div className="layout-region layout-title">
          <TitleField
            value={title}
            style={titleStyle}
            onChange={(value) => onPatch({ title: value })}
            onFocus={() => onFocusField("title")}
            onBlur={() => onFocusField(null)}
          />
        </div>
      );
    case "image-text":
      return (
        <div className="layout-region layout-image-text">
          <div className="layout-image-pane">
            <SlideImage slide={slide} />
          </div>
          <div className="layout-text-pane">
            <TitleField
              value={title}
              style={titleStyle}
              onChange={(value) => onPatch({ title: value })}
              onFocus={() => onFocusField("title")}
              onBlur={() => onFocusField(null)}
            />
            <BodyField
              value={body}
              style={bodyStyle}
              onChange={(value) => onPatch({ body: value })}
              onFocus={() => onFocusField("body")}
              onBlur={() => onFocusField(null)}
            />
          </div>
        </div>
      );
    case "text-only":
      return (
        <div className="layout-region layout-text-only">
          <TitleField
            value={title}
            style={titleStyle}
            onChange={(value) => onPatch({ title: value })}
            onFocus={() => onFocusField("title")}
            onBlur={() => onFocusField(null)}
          />
          <BodyField
            value={body}
            style={bodyStyle}
            onChange={(value) => onPatch({ body: value })}
            onFocus={() => onFocusField("body")}
            onBlur={() => onFocusField(null)}
          />
        </div>
      );
    case "full-bleed":
    default: {
      if (slide.imageData) {
        const objectPosition = slide.generatedForLayout === "image-text" ? "left center" : "center center";
        return <img alt={slide.name} className="slide-image" src={slide.imageData} style={{ objectPosition }} />;
      }
      const hasText = title.trim() || body.trim();
      if (!hasText) return null;
      return (
        <div className="canvas-full-bleed-overlay">
          {editorMode === "edit" ? (
            <>
              <TitleField
                value={title}
                style={titleStyle}
                onChange={(value) => onPatch({ title: value })}
                onFocus={() => onFocusField("title")}
                onBlur={() => onFocusField(null)}
              />
              <BodyField
                value={body}
                style={bodyStyle}
                onChange={(value) => onPatch({ body: value })}
                onFocus={() => onFocusField("body")}
                onBlur={() => onFocusField(null)}
              />
            </>
          ) : (
            <>
              {title ? <p className="canvas-overlay-title" style={titleStyle}>{title}</p> : null}
              {body ? <p className="canvas-overlay-body" style={bodyStyle}>{body}</p> : null}
            </>
          )}
        </div>
      );
    }
  }
}

// Read-only slide renderer — reuses the same layout classes as CanvasBody
// but renders <p> elements instead of editable textareas.
export function SlideReadView({ slide }: { slide: Slide }) {
  const layout: SlideLayout = slide.layout ?? "full-bleed";
  const titleStyle = formattingStyle(slide.titleFormatting);
  const bodyStyle = formattingStyle(slide.bodyFormatting);
  const title = slide.title ?? "";
  const body = slide.body ?? "";

  switch (layout) {
    case "title":
      return (
        <div className="layout-region layout-title">
          {title && <p className="slide-read-title" style={titleStyle}>{title}</p>}
        </div>
      );
    case "image-text":
      return (
        <div className="layout-region layout-image-text">
          <div className="layout-image-pane">
            <SlideImage slide={slide} />
          </div>
          <div className="layout-text-pane">
            {title && <p className="slide-read-title" style={titleStyle}>{title}</p>}
            {body && <p className="slide-read-body" style={bodyStyle}>{body}</p>}
          </div>
        </div>
      );
    case "text-only":
      return (
        <div className="layout-region layout-text-only">
          {title && <p className="slide-read-title" style={titleStyle}>{title}</p>}
          {body && <p className="slide-read-body" style={bodyStyle}>{body}</p>}
        </div>
      );
    case "full-bleed":
    default: {
      if (slide.imageData) {
        const objectPosition = slide.generatedForLayout === "image-text" ? "left center" : "center center";
        return <img alt={slide.name} className="slide-image" src={slide.imageData} style={{ objectPosition }} />;
      }
      const hasText = title.trim() || body.trim();
      if (!hasText) return null;
      return (
        <div className="canvas-full-bleed-overlay">
          {title ? <p className="canvas-overlay-title" style={titleStyle}>{title}</p> : null}
          {body ? <p className="canvas-overlay-body" style={bodyStyle}>{body}</p> : null}
        </div>
      );
    }
  }
}

export function SlideCanvas({ slide, editorMode, onPatch, onRetry, onFocusField }: SlideCanvasProps) {
  const layout: SlideLayout = slide?.layout ?? "full-bleed";
  const showLayoutHint =
    !!slide?.imageData &&
    !!slide.generatedForLayout &&
    slide.generatedForLayout !== slide.layout;

  return (
    <div className="canvas-wrap">
      <div className={`canvas-card canvas-layout-${layout}`}>
        {slide ? <CanvasBody layout={layout} slide={slide} editorMode={editorMode} onPatch={onPatch} onFocusField={onFocusField} /> : null}
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
      {showLayoutHint ? (
        <p className="canvas-layout-hint">
          Image was generated for a different layout — regenerate for best results.
        </p>
      ) : null}
    </div>
  );
}
