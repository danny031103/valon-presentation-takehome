import { useState } from "react";
import type { EditorMode, SlideLayout } from "../hooks/useDeck";
import { LayoutPicker } from "./LayoutPicker";

type EditorTopBarProps = {
  name: string;
  exporting: boolean;
  editorMode: EditorMode;
  layout: SlideLayout;
  onModeChange: (mode: EditorMode) => void;
  onLayoutChange: (layout: SlideLayout) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUndo: () => void;
  canUndo: boolean;
  deckTitle: string;
  onDeckTitleChange: (title: string) => void;
  onExport: () => void;
};

export function EditorTopBar({
  name,
  exporting,
  editorMode,
  layout,
  onModeChange,
  onLayoutChange,
  onRename,
  onDelete,
  onUndo,
  canUndo,
  deckTitle,
  onDeckTitleChange,
  onExport
}: EditorTopBarProps) {
  const [naming, setNaming] = useState(false);

  function confirmExport() {
    setNaming(false);
    onExport();
  }
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

      {editorMode === "edit" ? (
        <LayoutPicker layout={layout} onChange={onLayoutChange} />
      ) : null}

      <div className="top-actions">
        <button
          className="quiet-button"
          disabled={!canUndo}
          onClick={onUndo}
          type="button"
        >
          Undo
        </button>
        <button className="quiet-button" onClick={onDelete} type="button">
          Delete
        </button>
        {naming ? (
          <>
            <input
              autoFocus
              className="name-input"
              onChange={(event) => onDeckTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  confirmExport();
                } else if (event.key === "Escape") {
                  setNaming(false);
                }
              }}
              placeholder="Deck title"
              value={deckTitle}
            />
            <button
              className="loud-button"
              disabled={exporting}
              onClick={confirmExport}
              type="button"
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          </>
        ) : (
          <button
            className="loud-button"
            disabled={exporting}
            onClick={() => setNaming(true)}
            type="button"
          >
            {exporting ? "Exporting…" : "Export to PowerPoint"}
          </button>
        )}
      </div>
    </div>
  );
}
