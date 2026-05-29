import { useRef, type ChangeEvent } from "react";

type UploadImageButtonProps = {
  onSelect: (file: File) => void;
  label?: string;
  className?: string;
};

// Button + hidden file input pair. Shared by the AI-mode prompt panel and the
// edit-mode canvas so the file-picker markup isn't duplicated.
export function UploadImageButton({
  onSelect,
  label = "Upload image",
  className = "ghost-button"
}: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onSelect(file);
    }
    // Clear the value so picking the same file twice still fires onChange.
    event.target.value = "";
  }

  return (
    <>
      <button aria-label={label} className={className} onClick={() => inputRef.current?.click()} title={label} type="button">
        <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
          <rect height="16" rx="2" width="16" x="2" y="6" />
          <path d="M2 16l5-5 4 4 3-3 5 5" />
          <circle cx="8" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <line x1="19" x2="19" y1="1" y2="5" />
          <line x1="17" x2="21" y1="3" y2="3" />
        </svg>
      </button>
      <input accept="image/*" hidden onChange={handleChange} ref={inputRef} type="file" />
    </>
  );
}
