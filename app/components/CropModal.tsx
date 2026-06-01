import { useEffect, useRef, useState } from "react";

type CropModalProps = {
  src: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
};

function clampPan(
  px: number,
  py: number,
  scale: number,
  imgEl: HTMLImageElement,
  fitScale: number,
  fw: number,
  fh: number
): { x: number; y: number } {
  const dispW = imgEl.naturalWidth * fitScale * scale;
  const dispH = imgEl.naturalHeight * fitScale * scale;
  const maxX = Math.max(0, (dispW - fw) / 2);
  const maxY = Math.max(0, (dispH - fh) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, px)),
    y: Math.max(-maxY, Math.min(maxY, py)),
  };
}

export function CropModal({ src, onApply, onCancel }: CropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [frameDims, setFrameDims] = useState({ w: 0, h: 0 });

  // Mutable transform state kept in refs to avoid stale closures in event
  // handlers — forceUpdate() triggers a re-render to reflect changes.
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const [, forceUpdate] = useState(0);
  const tick = () => forceUpdate((n) => n + 1);

  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    const el = new Image();
    el.onload = () => {
      if (!frameRef.current) return;
      const { width: fw, height: fh } = frameRef.current.getBoundingClientRect();
      const fs = Math.min(fw / el.naturalWidth, fh / el.naturalHeight);
      setImg(el);
      setFitScale(fs);
      setFrameDims({ w: fw, h: fh });
    };
    el.src = src;
  }, [src]);

  // Wheel and touchmove need { passive: false } to call preventDefault.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !img) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      const next = Math.max(1, Math.min(4, scaleRef.current * factor));
      const clamped = clampPan(panRef.current.x, panRef.current.y, next, img!, fitScale, frameDims.w, frameDims.h);
      scaleRef.current = next;
      panRef.current = clamped;
      tick();
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastPointer.current.x;
        const dy = e.touches[0].clientY - lastPointer.current.y;
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panRef.current = clampPan(panRef.current.x + dx, panRef.current.y + dy, scaleRef.current, img!, fitScale, frameDims.w, frameDims.h);
        tick();
      } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / lastTouchDist.current;
        lastTouchDist.current = dist;
        const next = Math.max(1, Math.min(4, scaleRef.current * factor));
        const clamped = clampPan(panRef.current.x, panRef.current.y, next, img!, fitScale, frameDims.w, frameDims.h);
        scaleRef.current = next;
        panRef.current = clamped;
        tick();
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [img, fitScale, frameDims.w, frameDims.h]);

  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    tick();
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !img) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    panRef.current = clampPan(panRef.current.x + dx, panRef.current.y + dy, scaleRef.current, img, fitScale, frameDims.w, frameDims.h);
    tick();
  }

  function handleMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    tick();
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }

  function handleTouchEnd() {
    lastTouchDist.current = null;
  }

  function handleApply() {
    if (!img) return;
    const { w: fw, h: fh } = frameDims;
    const displayScale = fitScale * scaleRef.current;
    const imgLeft = fw / 2 + panRef.current.x - (img.naturalWidth * displayScale) / 2;
    const imgTop = fh / 2 + panRef.current.y - (img.naturalHeight * displayScale) / 2;
    const sx = -imgLeft / displayScale;
    const sy = -imgTop / displayScale;
    const sw = fw / displayScale;
    const sh = fh / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1280, 720);
    onApply(canvas.toDataURL("image/jpeg", 0.92));
  }

  const pan = panRef.current;
  const scale = scaleRef.current;

  return (
    <div
      className="crop-backdrop"
      onMouseUp={handleMouseUp}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="crop-dialog">
        <div
          ref={frameRef}
          className="crop-frame"
          style={{ cursor: dragging.current ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {img ? (
            <img
              alt=""
              src={src}
              draggable={false}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: `${img.naturalWidth * fitScale}px`,
                height: `${img.naturalHeight * fitScale}px`,
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
                transformOrigin: "center",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          ) : (
            <span className="crop-loading">Loading…</span>
          )}
          {dragging.current && (
            <div className="crop-grid" aria-hidden="true">
              <div className="crop-grid-h" style={{ top: "33.33%" }} />
              <div className="crop-grid-h" style={{ top: "66.67%" }} />
              <div className="crop-grid-v" style={{ left: "33.33%" }} />
              <div className="crop-grid-v" style={{ left: "66.67%" }} />
            </div>
          )}
          <div className="crop-corner crop-corner--tl" aria-hidden="true" />
          <div className="crop-corner crop-corner--tr" aria-hidden="true" />
          <div className="crop-corner crop-corner--bl" aria-hidden="true" />
          <div className="crop-corner crop-corner--br" aria-hidden="true" />
        </div>
        <p className="crop-hint">Drag to reposition · Scroll to zoom</p>
        <div className="crop-actions">
          <button className="ghost-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="loud-button" disabled={!img} onClick={handleApply} type="button">
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
