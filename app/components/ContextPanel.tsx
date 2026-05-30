"use client";

import { useRef, useState } from "react";
import type { DeckContext } from "../hooks/useDeck";
import { useDocumentExtract } from "../hooks/useDocumentExtract";

type ContextPanelProps = {
  context: DeckContext | null;
  onContextChange: (context: DeckContext | null) => void;
};

export function ContextPanel({ context, onContextChange }: ContextPanelProps) {
  const { extract, loading, error } = useDocumentExtract();
  const [dragOver, setDragOver] = useState(false);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const result = await extract(file);
    if (result) {
      onContextChange(result);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="context-panel">
      <button
        className="context-panel-header"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
      >
        <span className="context-panel-label">Context</span>
        <span className="context-panel-right">
          {context && <span className="context-badge">Active</span>}
          <span className="context-toggle-icon">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {open && (
        <div className="context-panel-body">
          {context ? (
            <div className="context-active">
              <p className="context-file-name" title={context.fileName}>
                {context.fileName}
              </p>
              <p className="context-char-count">
                {context.text.length.toLocaleString()} chars
              </p>
              {context.truncated && (
                <p className="context-warning">
                  Truncated to 30 KB — only the first portion will be used.
                </p>
              )}
              <button
                className="context-clear-btn"
                onClick={() => onContextChange(null)}
                type="button"
              >
                Clear context
              </button>
            </div>
          ) : (
            <div
              className={`context-drop-zone${dragOver ? " drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              {loading ? (
                <span className="context-drop-hint">Extracting text…</span>
              ) : (
                <>
                  <span className="context-drop-hint">Drop PDF or TXT</span>
                  <span className="context-drop-sub">click to browse</span>
                </>
              )}
            </div>
          )}

          {error && <p className="context-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
