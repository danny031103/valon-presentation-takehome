import type { DragEvent } from "react";

import type { Slide } from "../hooks/useDeck";

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
            <img alt={slide.name} src={slide.imageData} />
          ) : (
            <span>No image</span>
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
