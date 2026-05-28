type PromptPanelProps = {
  prompt: string;
  onChange: (value: string) => void;
};

export function PromptPanel({ prompt, onChange }: PromptPanelProps) {
  return (
    <div className="prompt-card">
      <label className="field-label" htmlFor="prompt-box">
        Prompt
      </label>
      <textarea
        id="prompt-box"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the image you want on this slide."
        rows={7}
        value={prompt}
      />
    </div>
  );
}
