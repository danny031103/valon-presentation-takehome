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
  { value: "imagen-3.0-generate-002", label: "Imagen 3" }
];

type PromptPanelProps = {
  prompt: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => void;
  imageStyle: ImageStyle;
  onStyleChange: (style: ImageStyle) => void;
  imageModel: string;
  onModelChange: (model: string) => void;
};

export function PromptPanel({
  prompt,
  onChange,
  onUploadImage,
  imageStyle,
  onStyleChange,
  imageModel,
  onModelChange
}: PromptPanelProps) {
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
      <UploadImageButton className="ghost-button prompt-upload" onSelect={onUploadImage} />
    </div>
  );
}
