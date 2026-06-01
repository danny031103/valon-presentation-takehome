import type { ImageStyle } from "../hooks/useDeck";
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

type PromptPanelProps = {
  prompt: string;
  onChange: (value: string) => void;
  referenceImageUrl: string | null;
  onReferenceImage: (dataUrl: string | null) => void;
  imageStyle: ImageStyle;
  onStyleChange: (style: ImageStyle) => void;
  imageModel: string;
  onModelChange: (model: string) => void;
};

export function PromptPanel({
  prompt,
  onChange,
  referenceImageUrl,
  onReferenceImage,
  imageStyle,
  onStyleChange,
  imageModel,
  onModelChange
}: PromptPanelProps) {
  function handleFileSelect(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onReferenceImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="prompt-card">
      <label className="field-label" htmlFor="prompt-box">
        Prompt
      </label>
      <textarea
        id="prompt-box"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the image you want on this slide."
        rows={5}
        value={prompt}
      />
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
  );
}
