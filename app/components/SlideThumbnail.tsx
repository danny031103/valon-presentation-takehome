import type { CSSProperties, DragEvent } from "react";

import type { Slide, SlideFormatting } from "../hooks/useDeck";

// Thumbnail-sized equivalents of the canvas font sizes, expressed in container
// query units so the preview text scales with the (16:9) thumbnail box.
const FONT_SIZE_CQW: Record<NonNullable<SlideFormatting["fontSize"]>, string> = {
  S: "4.5cqw",
  M: "5.5cqw",
  L: "7cqw",
  XL: "10cqw"
};

// Mini preview of a slide that has no AI image yet: render its actual title/body
// text with the slide's formatting, so the sidebar shows what's on the slide.
function ThumbPreview({ slide }: { slide: Slide }) {
  const formatting = slide.formatting;
  const title = slide.title?.trim() ?? "";
  const body = slide.body?.trim() ?? "";

  if (!title && !body) {
    return <div aria-hidden className="thumb-preview thumb-preview-empty" />;
  }

  const shared: CSSProperties = {
    fontWeight: formatting?.bold ? 700 : undefined,
    fontStyle: formatting?.italic ? "italic" : undefined,
    color: formatting?.color || undefined,
    textAlign: formatting?.align || undefined
  };
  // A slide-wide font size, when set, overrides both title and body (matches canvas).
  const override = formatting?.fontSize ? FONT_SIZE_CQW[formatting.fontSize] : undefined;

  return (
    <div className="thumb-preview">
      {title ? (
        <p className="thumb-preview-title" style={{ ...shared, fontSize: override ?? "7cqw" }}>
          {title}
        </p>
      ) : null}
      {body ? (
        <p className="thumb-preview-body" style={{ ...shared, fontSize: override ?? "4cqw" }}>
          {body}
        </p>
      ) : null}
    </div>
  );
}

type SlideThumbnailProps = {
  slide: Slide;
  index: number;
  active: boolean;
  dragging: boolean;
  dragOver: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

export function SlideThumbnail({
  slide,
  index,
  active,
  dragging,
  dragOver,
  onSelect,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: SlideThumbnailProps) {
  return (
    <div className="thumb-wrap">
      <button
        className={`thumb ${active ? "active" : ""} ${dragging ? "dragging" : ""} ${
          dragOver ? "drag-over" : ""
        }`}
        draggable
        onClick={onSelect}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragStart={onDragStart}
        onDrop={onDrop}
        type="button"
      >
        <div className="thumb-art">
          {slide.imageData ? (
            <>
              <img alt={slide.name} src={slide.imageData} />
              {(slide.title?.trim() || slide.body?.trim()) && (
                <div className="thumb-art-overlay">
                  <ThumbPreview slide={slide} />
                </div>
              )}
            </>
          ) : (
            <ThumbPreview slide={slide} />
          )}
        </div>
        <div className="thumb-copy">
          <strong>
            {index + 1}. {slide.name}
          </strong>
          <span>{slide.status}</span>
        </div>
      </button>
      <button
        aria-label={`Duplicate ${slide.name}`}
        className="thumb-duplicate"
        onClick={onDuplicate}
        title="Duplicate slide"
        type="button"
      >
        Duplicate
      </button>
    </div>
  );
}
