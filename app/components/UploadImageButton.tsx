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
      <button className={className} onClick={() => inputRef.current?.click()} type="button">
        {label}
      </button>
      <input accept="image/*" hidden onChange={handleChange} ref={inputRef} type="file" />
    </>
  );
}
