import { useState } from "react";
import type { DragEvent } from "react";

import type { Slide } from "../hooks/useDeck";
import { SlideThumbnail } from "./SlideThumbnail";

type SidebarProps = {
  slides: Slide[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAddSlide: () => void;
  onReorder: (from: number, to: number) => void;
};

export function Sidebar({ slides, selectedId, onSelect, onAddSlide, onReorder }: SidebarProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function resetDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

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
            dragging={dragIndex === index}
            dragOver={overIndex === index && dragIndex !== index}
            onSelect={() => onSelect(slide.id)}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event: DragEvent) => {
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={() => {
              if (dragIndex !== null) {
                onReorder(dragIndex, index);
              }
              resetDrag();
            }}
            onDragEnd={resetDrag}
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
