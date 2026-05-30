import { useState } from "react";
import type { DragEvent } from "react";

import type { DeckContext, Slide } from "../hooks/useDeck";
import { ContextPanel } from "./ContextPanel";
import { SlideThumbnail } from "./SlideThumbnail";

type SidebarProps = {
  slides: Slide[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAddSlide: () => void;
  onDeleteSlide: () => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  context: DeckContext | null;
  onContextChange: (context: DeckContext | null) => void;
};

export function Sidebar({
  slides,
  selectedId,
  onSelect,
  onAddSlide,
  onDeleteSlide,
  onReorder,
  onDuplicate,
  context,
  onContextChange
}: SidebarProps) {
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
        <div className="sidebar-slide-actions">
          <button className="loud-button sidebar-add-btn" onClick={onAddSlide} type="button" title="New slide">
            +
          </button>
          <button className="loud-button sidebar-add-btn" onClick={onDeleteSlide} type="button" title="Delete slide" disabled={!selectedId}>
            −
          </button>
        </div>
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
            onDuplicate={() => onDuplicate(slide.id)}
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

      <ContextPanel context={context} onContextChange={onContextChange} />
    </aside>
  );
}
