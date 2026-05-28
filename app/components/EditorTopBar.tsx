import type { EditorMode } from "../hooks/useDeck";

type EditorTopBarProps = {
  name: string;
  exporting: boolean;
  editorMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
};

export function EditorTopBar({
  name,
  exporting,
  editorMode,
  onModeChange,
  onRename,
  onDelete,
  onExport
}: EditorTopBarProps) {
  return (
    <div className="top-strip">
      <input
        className="name-input"
        onChange={(event) => onRename(event.target.value)}
        placeholder="Slide name"
        value={name}
      />

      <div className="mode-toggle" role="group" aria-label="Editor mode">
        <button
          aria-pressed={editorMode === "edit"}
          className={editorMode === "edit" ? "active" : ""}
          onClick={() => onModeChange("edit")}
          type="button"
        >
          Edit
        </button>
        <button
          aria-pressed={editorMode === "ai"}
          className={editorMode === "ai" ? "active" : ""}
          onClick={() => onModeChange("ai")}
          type="button"
        >
          Generate
        </button>
      </div>

      <div className="top-actions">
        <button className="quiet-button" onClick={onDelete} type="button">
          Delete
        </button>
        <button className="loud-button" disabled={exporting} onClick={onExport} type="button">
          {exporting ? "Exporting…" : "Export to PowerPoint"}
        </button>
      </div>
    </div>
  );
}
