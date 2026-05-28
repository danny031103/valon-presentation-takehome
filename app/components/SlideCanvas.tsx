import type { Slide, SlideLayout, SlideStatus } from "../hooks/useDeck";

const STATUS_LABEL: Record<SlideStatus, string> = {
  idle: "Ready",
  working: "Generating…",
  done: "Done",
  error: "Error"
};

type SlideCanvasProps = {
  slide: Slide | undefined;
};

function SlideImage({ slide }: { slide: Slide }) {
  if (slide.imageData) {
    return <img alt={slide.name} className="slide-image" src={slide.imageData} />;
  }

  return (
    <div className="empty-state">
      <p>No image yet.</p>
      <span>Switch to Generate to create an image, or pick a text layout.</span>
    </div>
  );
}

// Placeholder text regions — real editable title/body arrive in 2d.
function TitlePlaceholder() {
  return <span className="layout-placeholder layout-placeholder-title">Title</span>;
}

function BodyPlaceholder() {
  return <span className="layout-placeholder">Body text</span>;
}

function CanvasBody({ layout, slide }: { layout: SlideLayout; slide: Slide }) {
  switch (layout) {
    case "title":
      return (
        <div className="layout-region layout-title">
          <TitlePlaceholder />
        </div>
      );
    case "image-text":
      return (
        <div className="layout-region layout-image-text">
          <div className="layout-image-pane">
            <SlideImage slide={slide} />
          </div>
          <div className="layout-text-pane">
            <TitlePlaceholder />
            <BodyPlaceholder />
          </div>
        </div>
      );
    case "text-only":
      return (
        <div className="layout-region layout-text-only">
          <TitlePlaceholder />
          <BodyPlaceholder />
        </div>
      );
    case "full-bleed":
    default:
      return <SlideImage slide={slide} />;
  }
}

export function SlideCanvas({ slide }: SlideCanvasProps) {
  const layout: SlideLayout = slide?.layout ?? "full-bleed";

  return (
    <div className="canvas-wrap">
      <div className={`canvas-card canvas-layout-${layout}`}>
        {slide ? <CanvasBody layout={layout} slide={slide} /> : null}
      </div>

      <div className="floating-chip">
        <span>{STATUS_LABEL[slide?.status ?? "idle"]}</span>
        {slide?.status !== "done" && slide?.feedback ? <span>{slide.feedback}</span> : null}
      </div>
    </div>
  );
}
