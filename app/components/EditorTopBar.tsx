import { useEffect, useRef, useState } from "react";
import type { EditorMode } from "../hooks/useDeck";

function ShareIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      style={{ opacity: spinning ? 0.5 : 1 }}
      viewBox="0 0 24 24"
      width="16"
    >
      <polyline points="12 3 12 15" />
      <polyline points="8 7 12 3 16 7" />
      <path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}

type EditorTopBarProps = {
  name: string;
  exporting: boolean;
  editorMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onRename: (name: string) => void;
  deckTitle: string;
  onDeckTitleChange: (title: string) => void;
  onExport: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onNewDeck: () => void;
  onStartOver: () => void;
  onPresent: () => void;
  onReview: () => void;
};

export function EditorTopBar({
  name,
  exporting,
  editorMode,
  onModeChange,
  onRename,
  deckTitle,
  onDeckTitleChange,
  onExport,
  onExportJson,
  onImportJson,
  onNewDeck,
  onStartOver,
  onPresent,
  onReview,
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

      <div className="top-actions">
        <button
          className="ghost-button"
          onClick={onPresent}
          type="button"
        >
          Present
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
              <ShareIcon spinning={exporting} />
            </button>
          </>
        ) : (
          <button
            aria-label="Export to PowerPoint"
            className="loud-button"
            disabled={exporting}
            onClick={() => setNaming(true)}
            type="button"
          >
            <ShareIcon spinning={exporting} />
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
                onClick={() => { onNewDeck(); setOverflowOpen(false); }}
                type="button"
              >
                New deck
              </button>
              <button
                className="overflow-item"
                onClick={() => { onReview(); setOverflowOpen(false); }}
                type="button"
              >
                Review my deck
              </button>
              <div className="overflow-divider" />
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
              <div className="overflow-divider" />
              <button
                className="overflow-item"
                onClick={() => {
                  setOverflowOpen(false);
                  if (window.confirm("Start over? Your current deck will be deleted.")) {
                    onStartOver();
                  }
                }}
                type="button"
              >
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
