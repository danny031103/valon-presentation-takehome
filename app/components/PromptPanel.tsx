import { useState } from "react";
import type { ImageStyle, PromptHistoryEntry } from "../hooks/useDeck";
import { UploadImageButton } from "./UploadImageButton";

const STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "minimal", label: "Minimal" },
  { value: "editorial", label: "Editorial" },
  { value: "illustrative", label: "Illustrative" },
  { value: "photographic", label: "Photographic" },
  { value: "none", label: "No style" }
];

const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default model" },
  { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image" },
  { value: "gemini-2.0-flash-preview-image-generation", label: "Gemini 2.0 Flash (faster)" }
];

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type PromptPanelProps = {
  prompt: string;
  onChange: (value: string) => void;
  referenceImageUrl: string | null;
  onReferenceImage: (dataUrl: string | null) => void;
  imageStyle: ImageStyle;
  onStyleChange: (style: ImageStyle) => void;
  imageModel: string;
  onModelChange: (model: string) => void;
  deckTitle?: string;
  slideTitle?: string;
  promptHistory?: PromptHistoryEntry[];
  onRestoreHistory?: (entry: PromptHistoryEntry) => void;
};

export function PromptPanel({
  prompt,
  onChange,
  referenceImageUrl,
  onReferenceImage,
  imageStyle,
  onStyleChange,
  imageModel,
  onModelChange,
  deckTitle,
  slideTitle,
  promptHistory,
  onRestoreHistory
}: PromptPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [preEnhancePrompt, setPreEnhancePrompt] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function handleFileSelect(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onReferenceImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handlePromptChange(value: string) {
    if (preEnhancePrompt !== null) setPreEnhancePrompt(null);
    onChange(value);
  }

  async function handleEnhance() {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setPreEnhancePrompt(prompt);
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style: imageStyle, deckTitle, slideTitle })
      });
      const data = (await response.json()) as { enhancedPrompt?: string; error?: string };
      if (data.enhancedPrompt) {
        onChange(data.enhancedPrompt);
      } else {
        setPreEnhancePrompt(null);
      }
    } catch {
      setPreEnhancePrompt(null);
    } finally {
      setEnhancing(false);
    }
  }

  const hasHistory = (promptHistory?.length ?? 0) > 0;

  return (
    <>
      <div className="prompt-card">
        <div className="prompt-label-row">
          <label className="field-label" htmlFor="prompt-box">
            Prompt
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              aria-label={enhancing ? "Enhancing prompt…" : "Enhance prompt with Claude"}
              className="prompt-expand-btn"
              disabled={enhancing || !prompt.trim()}
              onClick={() => { void handleEnhance(); }}
              title={enhancing ? "Enhancing…" : "Enhance prompt with Claude"}
              type="button"
            >
              <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 16 16" width="14">
                <line x1="2" y1="14" x2="9.5" y2="6.5" strokeWidth="2.2" />
                <line x1="9.5" y1="6.5" x2="12" y2="4" />
                <line x1="12" y1="1.5" x2="12" y2="4.5" />
                <line x1="10.5" y1="3" x2="13.5" y2="3" />
                <line x1="5.5" y1="1.5" x2="5.5" y2="3.5" />
                <line x1="4.5" y1="2.5" x2="6.5" y2="2.5" />
              </svg>
            </button>
            <button
              aria-label="Expand prompt editor"
              className="prompt-expand-btn"
              onClick={() => setExpanded(true)}
              title="Expand"
              type="button"
            >
              <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 16 16" width="14">
                <path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" />
              </svg>
            </button>
          </div>
        </div>
        <textarea
          id="prompt-box"
          onChange={(event) => handlePromptChange(event.target.value)}
          placeholder="Describe the image you want on this slide."
          rows={4}
          value={prompt}
        />
        {preEnhancePrompt !== null && (
          <button
            className="prompt-undo-enhance"
            onClick={() => {
              onChange(preEnhancePrompt);
              setPreEnhancePrompt(null);
            }}
            type="button"
          >
            Undo enhance
          </button>
        )}

        {hasHistory && (
          <div className="prompt-history">
            <button
              className="prompt-history-toggle"
              onClick={() => setHistoryOpen((o) => !o)}
              type="button"
            >
              History ({promptHistory!.length})
              <span className="prompt-history-chevron">{historyOpen ? "▲" : "▼"}</span>
            </button>
            {historyOpen && (
              <div className="prompt-history-strip">
                {promptHistory!.map((entry, i) => (
                  <button
                    key={i}
                    className="prompt-history-thumb"
                    onClick={() => onRestoreHistory?.(entry)}
                    title={`${entry.prompt.slice(0, 80)}${entry.prompt.length > 80 ? "…" : ""}\n${relativeTime(entry.timestamp)}`}
                    type="button"
                  >
                    <img alt={`Attempt ${i + 1}`} src={entry.imageData} />
                    <span className="prompt-history-time">{relativeTime(entry.timestamp)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="prompt-selects">
          <div className="prompt-select-group">
            <label className="field-label" htmlFor="style-select">
              Style
            </label>
            <select
              className="style-select"
              id="style-select"
              onChange={(event) => onStyleChange(event.target.value as ImageStyle)}
              value={imageStyle}
            >
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="prompt-select-group">
            <label className="field-label" htmlFor="model-select">
              Model
            </label>
            <select
              className="style-select"
              id="model-select"
              onChange={(event) => onModelChange(event.target.value)}
              value={imageModel}
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {referenceImageUrl ? (
          <div className="prompt-reference">
            <img alt="Reference" className="prompt-reference-thumb" src={referenceImageUrl} />
            <button
              className="prompt-reference-remove"
              onClick={() => onReferenceImage(null)}
              type="button"
            >
              × Remove
            </button>
          </div>
        ) : (
          <UploadImageButton
            className="ghost-button prompt-upload"
            label="Add reference image"
            onSelect={handleFileSelect}
          />
        )}
      </div>

      {expanded && (
        <div className="prompt-modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="prompt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="prompt-modal-header">
              <span className="field-label">Prompt</span>
              <button
                aria-label="Close prompt editor"
                className="prompt-modal-close"
                onClick={() => setExpanded(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <textarea
              autoFocus
              className="prompt-modal-textarea"
              onChange={(event) => handlePromptChange(event.target.value)}
              placeholder="Describe the image you want on this slide."
              value={prompt}
            />
          </div>
        </div>
      )}
    </>
  );
}
