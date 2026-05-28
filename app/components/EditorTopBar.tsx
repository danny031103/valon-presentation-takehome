type EditorTopBarProps = {
  name: string;
  exporting: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
};

export function EditorTopBar({ name, exporting, onRename, onDelete, onExport }: EditorTopBarProps) {
  return (
    <div className="top-strip">
      <input
        className="name-input"
        onChange={(event) => onRename(event.target.value)}
        placeholder="Slide name"
        value={name}
      />

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
