"use client";

import { useRef, useState } from "react";
import type { ImageStyle } from "../hooks/useDeck";
import type { ExtractedContext } from "../hooks/useDocumentExtract";
import { useDocumentExtract } from "../hooks/useDocumentExtract";

const SLIDE_COUNTS = [3, 5, 7, 10] as const;

const STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "minimal", label: "Minimal" },
  { value: "editorial", label: "Editorial" },
  { value: "illustrative", label: "Illustrative" },
  { value: "photographic", label: "Photographic" },
  { value: "none", label: "No style" },
];

export type DeckBuilderFormData = {
  brief: string;
  slideCount: number;
  style: ImageStyle;
  context: ExtractedContext | null;
};

type DeckBuilderProps = {
  defaultStyle: ImageStyle;
  onBack: () => void;
  onSubmit: (data: DeckBuilderFormData) => void;
};

export function DeckBuilder({ defaultStyle, onBack, onSubmit }: DeckBuilderProps) {
  const [brief, setBrief] = useState("");
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const [style, setStyle] = useState<ImageStyle>(defaultStyle);
  const [context, setContext] = useState<ExtractedContext | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<{ brief?: string; slideCount?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { extract, loading: extracting, error: extractError } = useDocumentExtract();

  async function handleFile(file: File) {
    const result = await extract(file);
    if (result) setContext(result);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!brief.trim()) next.brief = "A brief is required.";
    if (!slideCount) next.slideCount = "Select a slide count.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ brief: brief.trim(), slideCount: slideCount!, style, context });
  }

  return (
    <div className="new-deck-screen">
      <div className="new-deck-inner deck-builder-inner">
        <button className="deck-builder-back" onClick={onBack} type="button">
          ← Back
        </button>

        <h1 className="new-deck-heading">Build with AI</h1>
        <p className="new-deck-sub">
          Describe your deck and optionally upload reference docs.
        </p>

        <form className="deck-builder-form" onSubmit={handleSubmit} noValidate>
          {/* Context upload */}
          <div className="deck-builder-field">
            <label className="deck-builder-label">Reference document (optional)</label>
            {context ? (
              <div className="deck-builder-context-active">
                <span className="deck-builder-context-name" title={context.fileName}>
                  {context.fileName}
                </span>
                <span className="deck-builder-context-chars">
                  {context.text.length.toLocaleString()} chars
                </span>
                {context.truncated && (
                  <span className="deck-builder-context-truncated">Truncated to 30 KB</span>
                )}
                <button
                  className="deck-builder-context-clear"
                  onClick={() => setContext(null)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                className={`deck-builder-drop-zone${dragOver ? " drag-over" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragLeave={() => setDragOver(false)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) void handleFile(file);
                }}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                  }}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  type="file"
                />
                {extracting ? (
                  <span>Extracting text…</span>
                ) : (
                  <>
                    <span className="deck-builder-drop-hint">Drop PDF or TXT</span>
                    <span className="deck-builder-drop-sub">click to browse</span>
                  </>
                )}
              </div>
            )}
            {extractError && <p className="deck-builder-field-error">{extractError}</p>}
          </div>

          {/* Brief */}
          <div className="deck-builder-field">
            <label className="deck-builder-label" htmlFor="deck-brief">
              What is this presentation about?
            </label>
            <textarea
              className={`deck-builder-textarea${errors.brief ? " field-error" : ""}`}
              id="deck-brief"
              onChange={(e) => {
                setBrief(e.target.value);
                if (errors.brief) setErrors((prev) => ({ ...prev, brief: undefined }));
              }}
              placeholder="e.g. A pitch deck for a Series A raise targeting fintech investors. Audience is familiar with SaaS metrics."
              rows={4}
              value={brief}
            />
            {errors.brief && <p className="deck-builder-field-error">{errors.brief}</p>}
          </div>

          {/* Slide count */}
          <div className="deck-builder-field">
            <label className="deck-builder-label">Number of slides</label>
            <div className={`slide-count-selector${errors.slideCount ? " field-error-border" : ""}`}>
              {SLIDE_COUNTS.map((n) => (
                <button
                  className={slideCount === n ? "active" : ""}
                  key={n}
                  onClick={() => {
                    setSlideCount(n);
                    if (errors.slideCount) setErrors((prev) => ({ ...prev, slideCount: undefined }));
                  }}
                  type="button"
                >
                  {n}
                </button>
              ))}
            </div>
            {errors.slideCount && (
              <p className="deck-builder-field-error">{errors.slideCount}</p>
            )}
          </div>

          {/* Style */}
          <div className="deck-builder-field">
            <label className="deck-builder-label" htmlFor="deck-style">
              Image style
            </label>
            <select
              className="deck-builder-select"
              id="deck-style"
              onChange={(e) => setStyle(e.target.value as ImageStyle)}
              value={style}
            >
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button className="loud-button deck-builder-submit" type="submit">
            Generate deck
          </button>
        </form>
      </div>
    </div>
  );
}
