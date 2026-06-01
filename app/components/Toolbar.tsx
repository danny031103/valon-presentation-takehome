import type { SlideFormatting, SlideLayout } from "../hooks/useDeck";
import { LayoutPicker } from "./LayoutPicker";
import { UploadImageButton } from "./UploadImageButton";

const LAYOUTS_WITH_IMAGE: SlideLayout[] = ["image-text", "full-bleed"];

type ToolbarProps = {
  focusedField: "title" | "body" | null;
  titleFormatting: SlideFormatting | undefined;
  bodyFormatting: SlideFormatting | undefined;
  onTitleFormattingChange: (formatting: SlideFormatting) => void;
  onBodyFormattingChange: (formatting: SlideFormatting) => void;
  body?: string;
  onBodyChange?: (body: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  layout?: SlideLayout;
  onLayoutChange?: (layout: SlideLayout) => void;
  onUploadImage?: (file: File) => void;
  onRecropImage?: () => void;
  hasImage?: boolean;
};

const FONT_SIZES: NonNullable<SlideFormatting["fontSize"]>[] = ["S", "M", "L", "XL"];

const ALIGNMENTS: NonNullable<SlideFormatting["align"]>[] = ["left", "center", "right"];

// Brand palette stored as hex so values round-trip to .pptx export (2d).
const SWATCHES: { name: string; hex: string }[] = [
  { name: "Foreground", hex: "#241A14" },
  { name: "Brand", hex: "#7A4F10" },
  { name: "Brand soft", hex: "#EAC59F" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Danger", hex: "#C75050" },
  { name: "Success", hex: "#3D6B3D" }
];

const ALIGN_GLYPH: Record<NonNullable<SlideFormatting["align"]>, string> = {
  left: "M2 4h14M2 8h9M2 12h14",
  center: "M2 4h14M5 8h8M2 12h14",
  right: "M2 4h14M7 8h9M2 12h14"
};

export function Toolbar({ focusedField, titleFormatting, bodyFormatting, onTitleFormattingChange, onBodyFormattingChange, body, onBodyChange, onUndo, canUndo, onRedo, canRedo, layout, onLayoutChange, onUploadImage, onRecropImage, hasImage }: ToolbarProps) {
  const current = focusedField === "title" ? (titleFormatting ?? {}) :
                  focusedField === "body"  ? (bodyFormatting  ?? {}) :
                  {};
  const isDisabled = focusedField === null;

  function update(patch: SlideFormatting) {
    if (focusedField === "title") {
      onTitleFormattingChange({ ...(titleFormatting ?? {}), ...patch });
    } else if (focusedField === "body") {
      onBodyFormattingChange({ ...(bodyFormatting ?? {}), ...patch });
    }
  }

  function toggleBullets() {
    if (focusedField !== "body") return;
    const next = !current.bullets;
    update({ bullets: next });
    if (onBodyChange && body !== undefined) {
      const lines = body.split("\n");
      if (next) {
        onBodyChange(lines.map((l) => (l ? `• ${l}` : l)).join("\n"));
      } else {
        onBodyChange(lines.map((l) => (l.startsWith("• ") ? l.slice(2) : l)).join("\n"));
      }
    }
  }

  const fieldLabel = focusedField === "title" ? "Title" :
                     focusedField === "body"  ? "Body"  :
                     "Click a field to format";

  return (
    <div className="toolbar" role="group" aria-label="Text formatting">
      <span className="toolbar-field-label" aria-live="polite">{fieldLabel}</span>

      <div className="toolbar-group">
        <button
          aria-label="Bold"
          aria-pressed={Boolean(current.bold)}
          className={`toolbar-btn ${current.bold ? "active" : ""}`}
          disabled={isDisabled}
          onClick={() => update({ bold: !current.bold })}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          aria-label="Italic"
          aria-pressed={Boolean(current.italic)}
          className={`toolbar-btn ${current.italic ? "active" : ""}`}
          disabled={isDisabled}
          onClick={() => update({ italic: !current.italic })}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <em>I</em>
        </button>
        <button
          aria-label="Bullet list"
          aria-pressed={Boolean(current.bullets)}
          className={`toolbar-btn ${current.bullets ? "active" : ""}`}
          disabled={isDisabled || focusedField === "title"}
          onClick={toggleBullets}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <svg viewBox="0 0 18 16" aria-hidden="true">
            <circle cx="2.5" cy="4" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="2.5" cy="8" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="2.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <path d="M6 4h10M6 8h10M6 12h10" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="toolbar-group">
        {FONT_SIZES.map((size) => (
          <button
            key={size}
            aria-label={`Font size ${size}`}
            aria-pressed={current.fontSize === size}
            className={`toolbar-btn ${current.fontSize === size ? "active" : ""}`}
            disabled={isDisabled}
            onClick={() => update({ fontSize: size })}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            {size}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            aria-label={swatch.name}
            aria-pressed={current.color === swatch.hex}
            className={`toolbar-swatch ${current.color === swatch.hex ? "active" : ""}`}
            disabled={isDisabled}
            onClick={() => update({ color: swatch.hex })}
            onMouseDown={(e) => e.preventDefault()}
            style={{ background: swatch.hex }}
            title={swatch.name}
            type="button"
          />
        ))}
        <label className="toolbar-color-pick" title="Custom color">
          <input
            aria-label="Custom color"
            disabled={isDisabled}
            onChange={(event) => update({ color: event.target.value })}
            onMouseDown={(e) => e.preventDefault()}
            type="color"
            value={current.color ?? "#241A14"}
          />
        </label>
      </div>

      <div className="toolbar-group">
        {ALIGNMENTS.map((align) => (
          <button
            key={align}
            aria-label={`Align ${align}`}
            aria-pressed={current.align === align}
            className={`toolbar-btn ${current.align === align ? "active" : ""}`}
            disabled={isDisabled}
            onClick={() => update({ align })}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <svg viewBox="0 0 18 16" aria-hidden="true">
              <path d={ALIGN_GLYPH[align]} />
            </svg>
          </button>
        ))}
      </div>

      {layout !== undefined && onLayoutChange && (
        <LayoutPicker layout={layout} onChange={onLayoutChange} />
      )}

      {onUploadImage && layout !== undefined && LAYOUTS_WITH_IMAGE.includes(layout) && (
        <UploadImageButton
          className="ghost-button button-sm"
          label={hasImage ? "Replace image" : "Upload image"}
          onSelect={onUploadImage}
        />
      )}

      {onRecropImage && hasImage && layout !== undefined && LAYOUTS_WITH_IMAGE.includes(layout) && (
        <button
          aria-label="Recrop image"
          className="ghost-button button-sm"
          onClick={onRecropImage}
          title="Recrop image"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2v14a2 2 0 0 0 2 2h14" />
            <path d="M18 22V8a2 2 0 0 0-2-2H2" />
          </svg>
        </button>
      )}

      {(onUndo || onRedo) && (
        <div className="toolbar-group">
          <button
            aria-label="Undo"
            className="toolbar-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
          </button>
          <button
            aria-label="Redo"
            className="toolbar-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{transform: 'scaleX(-1)'}}>
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
