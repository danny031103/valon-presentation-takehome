import { useEffect, useRef, useState } from "react";

type CropRect = { x: number; y: number; w: number; h: number };
type Corner = "tl" | "tr" | "bl" | "br";

type CropModalProps = {
  src: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
};

const RATIO_OPTIONS: { label: string; value: number }[] = [
  { label: "16:9", value: 16 / 9 },
  { label: "4:3",  value: 4 / 3  },
  { label: "9:16", value: 9 / 16 },
];

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

// Returns the largest rect of `ratio` centered in `fw × fh`.
function computeInitialCropRect(fw: number, fh: number, ratio: number): CropRect {
  const cw = fw / fh >= ratio ? fh * ratio : fw;
  const ch = cw / ratio;
  return { x: (fw - cw) / 2, y: (fh - ch) / 2, w: cw, h: ch };
}

function outputSize(ratio: number): { w: number; h: number } {
  if (ratio > 1.4) return { w: 1280, h: 720  }; // 16:9
  if (ratio > 1.0) return { w: 960,  h: 720  }; // 4:3
  return               { w: 720,  h: 1280 };    // 9:16
}

function cornerCursor(corner: Corner): string {
  return corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize";
}

export function CropModal({ src, onApply, onCancel }: CropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [frameDims, setFrameDims] = useState({ w: 0, h: 0 });
  const [isPortrait, setIsPortrait] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  // Mutable interaction state in refs — tick() triggers re-renders.
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const cropRectRef = useRef<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const dragging = useRef(false);
  const resizingCorner = useRef<Corner | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);
  const tick = () => forceUpdate((n) => n + 1);

  useEffect(() => {
    const el = new Image();
    el.onload = () => {
      if (!frameRef.current) return;
      const { width: fw, height: fh } = frameRef.current.getBoundingClientRect();
      const fs = Math.min(fw / el.naturalWidth, fh / el.naturalHeight);
      setImg(el);
      setFitScale(fs);
      setFrameDims({ w: fw, h: fh });
      setIsPortrait(el.naturalHeight > el.naturalWidth);
      cropRectRef.current = computeInitialCropRect(fw, fh, 16 / 9);
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

  function handleFrameMouseDown(e: React.MouseEvent) {
    if (resizingCorner.current) return;
    dragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    tick();
  }

  function handleCornerMouseDown(e: React.MouseEvent, corner: Corner) {
    e.stopPropagation();
    resizingCorner.current = corner;
    tick();
  }

  // onMouseMove lives on the backdrop so resize/pan continue outside the frame.
  function handleMouseMove(e: React.MouseEvent) {
    if (resizingCorner.current) {
      handleResizeMove(e.clientX);
    } else if (dragging.current && img) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      panRef.current = clampPan(panRef.current.x + dx, panRef.current.y + dy, scaleRef.current, img, fitScale, frameDims.w, frameDims.h);
      tick();
    }
  }

  // Resize is driven by horizontal mouse position; height locks to aspect ratio.
  function handleResizeMove(clientX: number) {
    if (!resizingCorner.current || !frameRef.current) return;
    const frameLeft = frameRef.current.getBoundingClientRect().left;
    const mx = clientX - frameLeft;
    const { w: fw, h: fh } = frameDims;
    const ratio = aspectRatio;
    const { x, y, w, h } = cropRectRef.current;
    const MIN = 60;
    let next = cropRectRef.current;

    switch (resizingCorner.current) {
      case "br": {
        const newW = Math.max(MIN, Math.min(fw - x, mx - x));
        const newH = newW / ratio;
        if (y + newH <= fh) next = { x, y, w: newW, h: newH };
        break;
      }
      case "bl": {
        const right = x + w;
        const newW = Math.max(MIN, Math.min(right, right - mx));
        const newH = newW / ratio;
        if (y + newH <= fh) next = { x: right - newW, y, w: newW, h: newH };
        break;
      }
      case "tr": {
        const bottom = y + h;
        const newW = Math.max(MIN, Math.min(fw - x, mx - x));
        const newH = newW / ratio;
        if (bottom - newH >= 0) next = { x, y: bottom - newH, w: newW, h: newH };
        break;
      }
      case "tl": {
        const right = x + w;
        const bottom = y + h;
        const newW = Math.max(MIN, Math.min(right, right - mx));
        const newH = newW / ratio;
        if (bottom - newH >= 0) next = { x: right - newW, y: bottom - newH, w: newW, h: newH };
        break;
      }
    }

    cropRectRef.current = next;
    tick();
  }

  function handleMouseUp() {
    const wasActive = dragging.current || resizingCorner.current !== null;
    dragging.current = false;
    resizingCorner.current = null;
    if (wasActive) tick();
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

  function handleRatioChange(newRatio: number) {
    setAspectRatio(newRatio);
    cropRectRef.current = computeInitialCropRect(frameDims.w, frameDims.h, newRatio);
    tick();
  }

  function handleApply() {
    if (!img) return;
    const { w: fw, h: fh } = frameDims;
    const { x: cx, y: cy, w: cw, h: ch } = cropRectRef.current;
    const displayScale = fitScale * scaleRef.current;
    const imgLeft = fw / 2 + panRef.current.x - (img.naturalWidth  * displayScale) / 2;
    const imgTop  = fh / 2 + panRef.current.y - (img.naturalHeight * displayScale) / 2;
    const sx = (cx - imgLeft) / displayScale;
    const sy = (cy - imgTop)  / displayScale;
    const sw = cw / displayScale;
    const sh = ch / displayScale;
    const out = outputSize(aspectRatio);
    const canvas = document.createElement("canvas");
    canvas.width  = out.w;
    canvas.height = out.h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.w, out.h);
    onApply(canvas.toDataURL("image/jpeg", 0.92));
  }

  const pan      = panRef.current;
  const scale    = scaleRef.current;
  const cropRect = cropRectRef.current;
  const isResizing = resizingCorner.current !== null;
  const showGrid   = dragging.current || isResizing;

  const backdropCursor = isResizing
    ? cornerCursor(resizingCorner.current!)
    : dragging.current
    ? "grabbing"
    : undefined;

  const CORNERS: { id: Corner; cx: number; cy: number }[] = img ? [
    { id: "tl", cx: cropRect.x,              cy: cropRect.y              },
    { id: "tr", cx: cropRect.x + cropRect.w, cy: cropRect.y              },
    { id: "bl", cx: cropRect.x,              cy: cropRect.y + cropRect.h },
    { id: "br", cx: cropRect.x + cropRect.w, cy: cropRect.y + cropRect.h },
  ] : [];

  return (
    <div
      className="crop-backdrop"
      style={{ cursor: backdropCursor }}
      onMouseMove={(e) => { if (resizingCorner.current) handleResizeMove(e.clientX); }}
      onMouseUp={handleMouseUp}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="crop-dialog">
        <div
          ref={frameRef}
          className="crop-frame"
          style={{ cursor: dragging.current ? "grabbing" : "grab" }}
          onMouseDown={handleFrameMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { if (dragging.current) { dragging.current = false; tick(); } }}
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

          {/* Mask — darkens the area outside the crop rect */}
          {img && (
            <>
              <div className="crop-mask" style={{ top: 0, left: 0, right: 0, height: cropRect.y }} />
              <div className="crop-mask" style={{ top: cropRect.y + cropRect.h, left: 0, right: 0, bottom: 0 }} />
              <div className="crop-mask" style={{ top: cropRect.y, left: 0, width: cropRect.x, height: cropRect.h }} />
              <div className="crop-mask" style={{ top: cropRect.y, left: cropRect.x + cropRect.w, right: 0, height: cropRect.h }} />
            </>
          )}

          {/* Rule-of-thirds grid — visible while dragging or resizing */}
          {showGrid && (
            <div className="crop-grid" aria-hidden="true">
              <div className="crop-grid-h" style={{ top: cropRect.y + cropRect.h / 3,       left: cropRect.x, width: cropRect.w }} />
              <div className="crop-grid-h" style={{ top: cropRect.y + (cropRect.h * 2) / 3, left: cropRect.x, width: cropRect.w }} />
              <div className="crop-grid-v" style={{ left: cropRect.x + cropRect.w / 3,       top: cropRect.y, height: cropRect.h }} />
              <div className="crop-grid-v" style={{ left: cropRect.x + (cropRect.w * 2) / 3, top: cropRect.y, height: cropRect.h }} />
            </div>
          )}

          {/* Corner handles — draggable, positioned at crop rect corners */}
          {CORNERS.map(({ id, cx, cy }) => (
            <div
              key={id}
              className={`crop-corner crop-corner--${id}`}
              style={{ left: cx - 8, top: cy - 8, cursor: cornerCursor(id) }}
              onMouseDown={(e) => handleCornerMouseDown(e, id)}
            />
          ))}
        </div>

        {isPortrait && (
          <div className="crop-ratio-toggle" role="group" aria-label="Crop ratio">
            {RATIO_OPTIONS.map(({ label, value }) => (
              <button
                key={label}
                className={`crop-ratio-btn${aspectRatio === value ? " active" : ""}`}
                onClick={() => handleRatioChange(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <p className="crop-hint">Drag to reposition · Scroll to zoom · Drag corners to resize</p>

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
