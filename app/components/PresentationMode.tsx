import { useEffect, useRef } from "react";
import type { Slide, SlideLayout } from "../hooks/useDeck";
import { CanvasBody } from "./SlideCanvas";

type PresentationModeProps = {
  slides: Slide[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
};

export function PresentationMode({
  slides,
  currentIndex,
  onNext,
  onPrev,
  onExit,
}: PresentationModeProps) {
  const slide = slides[currentIndex];

  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const onPrevRef = useRef(onPrev);
  onPrevRef.current = onPrev;

  useEffect(() => {
    void document.documentElement.requestFullscreen().catch(() => {});

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        onExitRef.current();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        onNextRef.current();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevRef.current();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!slide) {
    return null;
  }

  const layout: SlideLayout = slide.layout ?? "full-bleed";

  return (
    <div className="presentation-viewport" onClick={onNext}>
      <div className="presentation-canvas">
        <CanvasBody
          editorMode="ai"
          layout={layout}
          onFocusField={() => {}}
          onPatch={() => {}}
          slide={slide}
        />
      </div>
    </div>
  );
}
