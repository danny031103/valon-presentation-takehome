import type { Slide, SlideStatus } from "../hooks/useDeck";

const STATUS_LABEL: Record<SlideStatus, string> = {
  idle: "Ready",
  working: "Generating…",
  done: "Done",
  error: "Error"
};

type SlideCanvasProps = {
  slide: Slide | undefined;
};

export function SlideCanvas({ slide }: SlideCanvasProps) {
  return (
    <div className="canvas-wrap">
      <div className="canvas-card">
        {slide?.imageData ? (
          <img alt={slide.name} className="slide-image" src={slide.imageData} />
        ) : (
          <div className="empty-state">
            <p>No image yet.</p>
            <span>Write a prompt and generate an image for this slide.</span>
          </div>
        )}
      </div>

      <div className="floating-chip">
        <span>{STATUS_LABEL[slide?.status ?? "idle"]}</span>
        {slide?.status !== "done" && slide?.feedback ? (
          <span>{slide.feedback}</span>
        ) : null}
      </div>
    </div>
  );
}
