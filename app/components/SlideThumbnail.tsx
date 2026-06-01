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

function thumbTextStyle(formatting: SlideFormatting | undefined): CSSProperties {
  return {
    fontWeight: formatting?.bold ? 700 : undefined,
    fontStyle: formatting?.italic ? "italic" : undefined,
    color: formatting?.color || undefined,
    textAlign: formatting?.align || undefined
  };
}

function ThumbPreview({ slide }: { slide: Slide }) {
  const title = slide.title?.trim() ?? "";
  const body = slide.body?.trim() ?? "";

  if (!title && !body) {
    return <div aria-hidden className="thumb-preview thumb-preview-empty" />;
  }

  const titleStyle = thumbTextStyle(slide.titleFormatting);
  const bodyStyle = thumbTextStyle(slide.bodyFormatting);
  const titleSize = slide.titleFormatting?.fontSize ? FONT_SIZE_CQW[slide.titleFormatting.fontSize] : undefined;
  const bodySize = slide.bodyFormatting?.fontSize ? FONT_SIZE_CQW[slide.bodyFormatting.fontSize] : undefined;

  return (
    <div className="thumb-preview">
      {title ? (
        <p className="thumb-preview-title" style={{ ...titleStyle, fontSize: titleSize ?? "7cqw" }}>
          {title}
        </p>
      ) : null}
      {body ? (
        <p className="thumb-preview-body" style={{ ...bodyStyle, fontSize: bodySize ?? "4cqw" }}>
          {body}
        </p>
      ) : null}
    </div>
  );
}

// Centered title-only preview for the "title" layout.
function ThumbPreviewTitleOnly({ slide }: { slide: Slide }) {
  const title = slide.title?.trim() ?? "";
  if (!title) return null;

  const formatting = slide.titleFormatting;
  const override = formatting?.fontSize ? FONT_SIZE_CQW[formatting.fontSize] : undefined;
  const style: CSSProperties = {
    ...thumbTextStyle(formatting),
    textAlign: formatting?.align || "center",
    fontSize: override ?? "7cqw"
  };

  return (
    <div className="thumb-preview thumb-preview-centered">
      <p className="thumb-preview-title" style={style}>
        {title}
      </p>
    </div>
  );
}

// Renders the interior of the thumbnail art box according to the slide layout,
// mirroring what SlideCanvas shows for each layout.
function ThumbArt({ slide }: { slide: Slide }) {
  const layout = slide.layout ?? "full-bleed";

  switch (layout) {
    case "full-bleed":
      if (slide.imageData) {
        return <img alt={slide.name || "Slide image"} src={slide.imageData} />;
      }
      // No image, no text overlay — clean blank.
      return null;

    case "image-text":
      return (
        <div className="thumb-image-text">
          <div className="thumb-image-pane">
            {slide.imageData ? (
              <img alt={slide.name || "Slide image"} src={slide.imageData} />
            ) : null}
          </div>
          <div className="thumb-text-pane">
            <ThumbPreview slide={slide} />
          </div>
        </div>
      );

    case "text-only":
      return <ThumbPreview slide={slide} />;

    case "title":
      return <ThumbPreviewTitleOnly slide={slide} />;
  }
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
          <ThumbArt slide={slide} />
          {slide.userRating === "up" && <span aria-hidden className="thumb-rating-dot up" />}
          {slide.userRating === "down" && <span aria-hidden className="thumb-rating-dot down" />}
        </div>
        <div className="thumb-copy">
          <strong>
            {index + 1}.{" "}
            {slide.name || (
              <span style={{ opacity: 0.4, fontWeight: 400, fontStyle: "italic" }}>
                Untitled slide
              </span>
            )}
          </strong>
        </div>
      </button>
      <button
        aria-label={`Duplicate ${slide.name || "untitled slide"}`}
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
