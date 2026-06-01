import { useEffect, useRef } from "react";
import type React from "react";

type PresentationModeProps = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
};

export function PresentationMode({
  canvasRef,
  currentIndex,
  onNext,
  onPrev,
  onExit,
}: PresentationModeProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const onPrevRef = useRef(onPrev);
  onPrevRef.current = onPrev;

  // Clone the live editor canvas-card into the presentation host on every slide change.
  useEffect(() => {
    const host = hostRef.current;
    const source = canvasRef.current;
    if (!host || !source) return;

    const { width: naturalWidth, height: naturalHeight } = source.getBoundingClientRect();
    const scale = Math.min(window.innerWidth / naturalWidth, window.innerHeight / naturalHeight);

    const clone = source.cloneNode(true) as HTMLDivElement;
    clone.style.cssText = `width:${naturalWidth}px;height:${naturalHeight}px;border:none;border-radius:0;position:static;transform:scale(${scale});transform-origin:center center;`;
    host.innerHTML = "";
    host.appendChild(clone);
  }, [currentIndex, canvasRef]);

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

  return (
    <div className="presentation-viewport" onClick={onNext}>
      <div ref={hostRef} className="presentation-canvas" />
    </div>
  );
}
