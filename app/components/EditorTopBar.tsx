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
      <div>
        <p className="eyebrow">Current slide</p>
        <input
          className="name-input"
          onChange={(event) => onRename(event.target.value)}
          placeholder="Slide name"
          value={name}
        />
      </div>

      <div className="top-actions">
        <button className="ghost-button" onClick={onDelete} type="button">
          Delete
        </button>
        <button className="ghost-button" disabled={exporting} onClick={onExport} type="button">
          {exporting ? "Exporting…" : "Export to PowerPoint"}
        </button>
      </div>
    </div>
  );
}
