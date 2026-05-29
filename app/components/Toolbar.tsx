import type { SlideFormatting } from "../hooks/useDeck";

type ToolbarProps = {
  formatting: SlideFormatting | undefined;
  onChange: (formatting: SlideFormatting) => void;
  body?: string;
  onBodyChange?: (body: string) => void;
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

export function Toolbar({ formatting, onChange, body, onBodyChange }: ToolbarProps) {
  const current = formatting ?? {};

  function update(patch: SlideFormatting) {
    onChange({ ...current, ...patch });
  }

  function toggleBullets() {
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

  return (
    <div className="toolbar" role="group" aria-label="Text formatting">
      <div className="toolbar-group">
        <button
          aria-label="Bold"
          aria-pressed={Boolean(current.bold)}
          className={`toolbar-btn ${current.bold ? "active" : ""}`}
          onClick={() => update({ bold: !current.bold })}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          aria-label="Italic"
          aria-pressed={Boolean(current.italic)}
          className={`toolbar-btn ${current.italic ? "active" : ""}`}
          onClick={() => update({ italic: !current.italic })}
          type="button"
        >
          <em>I</em>
        </button>
        <button
          aria-label="Bullet list"
          aria-pressed={Boolean(current.bullets)}
          className={`toolbar-btn ${current.bullets ? "active" : ""}`}
          onClick={toggleBullets}
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
            onClick={() => update({ fontSize: size })}
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
            onClick={() => update({ color: swatch.hex })}
            style={{ background: swatch.hex }}
            title={swatch.name}
            type="button"
          />
        ))}
        <label className="toolbar-color-pick" title="Custom color">
          <input
            aria-label="Custom color"
            onChange={(event) => update({ color: event.target.value })}
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
            onClick={() => update({ align })}
            type="button"
          >
            <svg viewBox="0 0 18 16" aria-hidden="true">
              <path d={ALIGN_GLYPH[align]} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
