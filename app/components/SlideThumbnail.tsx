import type { Slide } from "../hooks/useDeck";

type SlideThumbnailProps = {
  slide: Slide;
  index: number;
  active: boolean;
  onSelect: () => void;
};

export function SlideThumbnail({ slide, index, active, onSelect }: SlideThumbnailProps) {
  return (
    <button
      className={`thumb ${active ? "active" : ""}`}
      onClick={onSelect}
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
  );
}
