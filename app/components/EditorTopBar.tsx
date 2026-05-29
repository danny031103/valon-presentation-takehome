import { useEffect, useRef, useState } from "react";
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
  deckTitle: string;
  onDeckTitleChange: (title: string) => void;
  onExport: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
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
  deckTitle,
  onDeckTitleChange,
  onExport,
  onExportJson,
  onImportJson
}: EditorTopBarProps) {
  const [naming, setNaming] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function handleMouseDown(event: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [overflowOpen]);

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
        <div className="overflow-menu" ref={overflowRef}>
          <button
            aria-label="More actions"
            className="quiet-button overflow-trigger"
            onClick={() => setOverflowOpen((o) => !o)}
            type="button"
          >
            ⋯
          </button>
          <input
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportJson(file);
              event.target.value = "";
              setOverflowOpen(false);
            }}
            ref={importInputRef}
            style={{ display: "none" }}
            type="file"
          />
          {overflowOpen && (
            <div className="overflow-dropdown">
              <button
                className="overflow-item"
                onClick={() => { onExportJson(); setOverflowOpen(false); }}
                type="button"
              >
                Export deck JSON
              </button>
              <button
                className="overflow-item"
                onClick={() => importInputRef.current?.click()}
                type="button"
              >
                Import deck JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
