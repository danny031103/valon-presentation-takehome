import type { Slide } from "../hooks/useDeck";
import { SlideThumbnail } from "./SlideThumbnail";

type SidebarProps = {
  slides: Slide[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAddSlide: () => void;
};

export function Sidebar({ slides, selectedId, onSelect, onAddSlide }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <h1>Valon Presentations</h1>
      </div>

      <div className="slide-list">
        {slides.map((slide, index) => (
          <SlideThumbnail
            key={slide.id}
            slide={slide}
            index={index}
            active={slide.id === selectedId}
            onSelect={() => onSelect(slide.id)}
          />
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="loud-button" onClick={onAddSlide} type="button">
          New slide
        </button>
      </div>
    </aside>
  );
}
