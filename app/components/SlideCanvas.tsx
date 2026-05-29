import type { CSSProperties } from "react";

import type { EditorMode, Slide, SlideFormatting, SlideLayout, SlideStatus } from "../hooks/useDeck";
import { UploadImageButton } from "./UploadImageButton";

// Layouts whose canvas actually renders an image (see CanvasBody).
const LAYOUTS_WITH_IMAGE: SlideLayout[] = ["image-text", "full-bleed"];

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
  editorMode: EditorMode;
  onPatch: (patch: Partial<Slide>) => void;
  onUploadImage: (file: File) => void;
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

export function SlideCanvas({ slide, editorMode, onPatch, onUploadImage }: SlideCanvasProps) {
  const layout: SlideLayout = slide?.layout ?? "full-bleed";
  const canUpload = Boolean(slide) && editorMode === "edit" && LAYOUTS_WITH_IMAGE.includes(layout);

  return (
    <div className="canvas-wrap">
      <div className={`canvas-card canvas-layout-${layout}`}>
        {slide ? <CanvasBody layout={layout} slide={slide} onPatch={onPatch} /> : null}
        {slide?.status === "working" ? (
          <div className="canvas-skeleton">
            <p className="skeleton-hint">Generating image — usually 10–20s</p>
          </div>
        ) : null}
      </div>

      {canUpload ? (
        <UploadImageButton
          className="ghost-button canvas-upload"
          label={slide?.imageData ? "Replace image" : "Upload image"}
          onSelect={onUploadImage}
        />
      ) : null}

      {slide?.status !== "working" ? (
        <div className="floating-chip">
          <span>{STATUS_LABEL[slide?.status ?? "idle"]}</span>
          {slide?.status !== "done" && slide?.feedback ? <span>{slide.feedback}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
