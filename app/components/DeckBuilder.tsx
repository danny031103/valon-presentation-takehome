"use client";

import { useRef, useState } from "react";
import type { DeckPlan, ImageStyle } from "../hooks/useDeck";
import type { ExtractedContext } from "../hooks/useDocumentExtract";
import { useDocumentExtract } from "../hooks/useDocumentExtract";

const SLIDE_COUNTS = [3, 5, 7, 10] as const;

const PURPOSE_OPTIONS = [
  "Sales pitch",
  "Internal update",
  "Educational / training",
  "Conference talk",
  "Client proposal",
  "Other",
] as const;

const AUDIENCE_OPTIONS = [
  "Executive / leadership",
  "Potential customers",
  "Technical team",
  "General audience",
] as const;

type StyleOption = {
  value: ImageStyle;
  label: string;
  variant: string;
};

const STYLE_OPTIONS: StyleOption[] = [
  { value: "professional", label: "Professional", variant: "professional" },
  { value: "minimal", label: "Minimal", variant: "minimal" },
  { value: "editorial", label: "Editorial", variant: "editorial" },
  { value: "illustrative", label: "Illustrative", variant: "illustrative" },
];

export type DeckBuilderFormData = {
  purpose: string;
  audience: string;
  brief: string;
  slideCount: number;
  style: ImageStyle;
  context: ExtractedContext | null;
};

type DeckBuilderProps = {
  defaultStyle: ImageStyle;
  onBack: () => void;
  onGenerateDeck: (plan: DeckPlan, style: ImageStyle) => void;
};

function buildBriefStarter(purpose: string, audience: string): string {
  const p = purpose === "Other" ? "presentation" : purpose.toLowerCase();
  const a = audience.toLowerCase();
  return `A ${p} presentation for ${a}.`;
}

export function DeckBuilder({ defaultStyle, onBack, onGenerateDeck }: DeckBuilderProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [purpose, setPurpose] = useState<string | null>(null);
  const [purposeOther, setPurposeOther] = useState("");

  // Step 2
  const [audience, setAudience] = useState<string | null>(null);

  // Step 3
  const [style, setStyle] = useState<ImageStyle>(defaultStyle);
  const [styleSelected, setStyleSelected] = useState(false);

  // Step 4
  const [brief, setBrief] = useState("");
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const [context, setContext] = useState<ExtractedContext | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<{ brief?: string; slideCount?: string }>({});
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { extract, loading: extracting, error: extractError } = useDocumentExtract();

  async function handleFile(file: File) {
    const result = await extract(file);
    if (result) setContext(result);
  }

  function resolvedPurpose(): string {
    return purpose === "Other" ? purposeOther.trim() || "Other" : (purpose ?? "");
  }

  function step1Valid(): boolean {
    if (!purpose) return false;
    if (purpose === "Other" && !purposeOther.trim()) return false;
    return true;
  }

  function goToStep2() {
    if (!step1Valid()) return;
    setStep(2);
  }

  function goToStep3() {
    if (!audience) return;
    setStep(3);
  }

  function goToStep4() {
    if (!styleSelected) return;
    const starter = buildBriefStarter(resolvedPurpose(), audience ?? "");
    if (!brief) setBrief(starter);
    setStep(4);
  }

  function handleBack() {
    if (step === 1) {
      onBack();
    } else {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!brief.trim()) next.brief = "A brief is required.";
    if (!slideCount) next.slideCount = "Select a slide count.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setPlanning(true);
    setPlanError(null);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: resolvedPurpose(),
          audience: audience ?? "",
          brief: brief.trim(),
          slideCount: slideCount!,
          style,
          context: context?.text ?? undefined,
        }),
      });

      const payload = (await response.json()) as {
        plan?: DeckPlan;
        error?: string;
      };

      if (!response.ok || !payload.plan) {
        setPlanError(payload.error ?? "Failed to generate plan. Please try again.");
        return;
      }

      onGenerateDeck(payload.plan, style);
    } catch {
      setPlanError("Network error. Please try again.");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <div className="new-deck-screen">
      <div className="new-deck-inner deck-builder-inner">
        <button className="deck-builder-back" onClick={handleBack} type="button">
          ← Back
        </button>

        {/* Step 1 — Purpose */}
        {step === 1 && (
          <>
            <div className="deck-builder-step-header">
              <h1 className="new-deck-heading">What&apos;s this deck for?</h1>
              <span className="step-indicator">Step 1 of 4</span>
            </div>
            <p className="new-deck-sub">Pick the type that fits best.</p>

            <div className="step-tiles">
              {PURPOSE_OPTIONS.map((opt) => (
                <button
                  className={`step-tile${purpose === opt ? " selected" : ""}`}
                  key={opt}
                  onClick={() => setPurpose(opt)}
                  type="button"
                >
                  {opt}
                </button>
              ))}
            </div>

            {purpose === "Other" && (
              <input
                autoFocus
                className="step-tile-other-input"
                onChange={(e) => setPurposeOther(e.target.value)}
                placeholder="Describe the purpose…"
                type="text"
                value={purposeOther}
              />
            )}

            <div className="step-nav">
              <div className="step-nav-right">
                <button
                  className="loud-button"
                  disabled={!step1Valid()}
                  onClick={goToStep2}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2 — Audience */}
        {step === 2 && (
          <>
            <div className="deck-builder-step-header">
              <h1 className="new-deck-heading">Who&apos;s the audience?</h1>
              <span className="step-indicator">Step 2 of 4</span>
            </div>
            <p className="new-deck-sub">This shapes the tone and complexity.</p>

            <div className="step-tiles">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  className={`step-tile${audience === opt ? " selected" : ""}`}
                  key={opt}
                  onClick={() => setAudience(opt)}
                  type="button"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="step-nav">
              <div className="step-nav-right">
                <button
                  className="loud-button"
                  disabled={!audience}
                  onClick={goToStep3}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3 — Style */}
        {step === 3 && (
          <>
            <div className="deck-builder-step-header">
              <h1 className="new-deck-heading">What&apos;s the vibe?</h1>
              <span className="step-indicator">Step 3 of 4</span>
            </div>
            <p className="new-deck-sub">Choose a visual style for generated images.</p>

            <div className="style-tiles">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  className={`style-tile style-tile--${opt.variant}${style === opt.value && styleSelected ? " selected" : ""}`}
                  key={opt.value}
                  onClick={() => {
                    setStyle(opt.value);
                    setStyleSelected(true);
                  }}
                  type="button"
                >
                  {opt.value === "professional" && (
                    <div className="style-tile-inner">
                      <span className="style-tile-heading">Professional</span>
                      <span className="style-tile-body">Clean · Corporate · Polished</span>
                    </div>
                  )}
                  {opt.value === "minimal" && (
                    <div className="style-tile-inner">
                      <div className="style-tile-line" />
                      <span className="style-tile-heading">Minimal</span>
                    </div>
                  )}
                  {opt.value === "editorial" && (
                    <div className="style-tile-inner">
                      <span className="style-tile-heading">Editorial</span>
                      <span className="style-tile-body">Bold · High contrast</span>
                    </div>
                  )}
                  {opt.value === "illustrative" && (
                    <div className="style-tile-inner">
                      <span className="style-tile-heading">Illustrative</span>
                      <span className="style-tile-body">Warm · Human · Friendly</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="step-nav">
              <div className="step-nav-right">
                <button
                  className="loud-button"
                  disabled={!styleSelected}
                  onClick={goToStep4}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 4 — Brief + context */}
        {step === 4 && (
          <>
            <div className="deck-builder-step-header">
              <h1 className="new-deck-heading">Tell us about your deck</h1>
              <span className="step-indicator">Step 4 of 4</span>
            </div>
            <p className="new-deck-sub">
              Add detail and optionally upload reference docs.
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

              <button
                className="loud-button deck-builder-submit"
                disabled={planning}
                type="submit"
              >
                {planning ? "Planning…" : "Generate deck"}
              </button>

              {planError && (
                <p className="deck-builder-field-error deck-builder-plan-error">
                  {planError}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
