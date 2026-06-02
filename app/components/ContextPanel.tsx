"use client";

import { useEffect, useRef, useState } from "react";
import type { DeckContext } from "../hooks/useDeck";
import type { ExtractedContext } from "../hooks/useDocumentExtract";
import { useDocumentExtract } from "../hooks/useDocumentExtract";

const MAX_COMBINED_CHARS = 30 * 1024;

type ContextPanelProps = {
  context: DeckContext | null;
  onContextChange: (context: DeckContext | null) => void;
};

function buildCombined(items: ExtractedContext[]): DeckContext {
  let combined = "";
  let truncated = false;
  for (const item of items) {
    const segment = `--- ${item.fileName} ---\n${item.text}\n`;
    if (combined.length + segment.length > MAX_COMBINED_CHARS) {
      const remaining = MAX_COMBINED_CHARS - combined.length;
      if (remaining > 0) combined += segment.slice(0, remaining);
      truncated = true;
      break;
    }
    combined += segment;
  }
  const fileName =
    items.length === 1
      ? items[0].fileName
      : `${items.length} documents`;
  return { text: combined, fileName, truncated };
}

export function ContextPanel({ context, onContextChange }: ContextPanelProps) {
  const { extract, loading, error } = useDocumentExtract();
  const [internalFiles, setInternalFiles] = useState<ExtractedContext[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (context === null) setInternalFiles([]);
  }, [context]);

  async function handleFiles(files: File[]) {
    const next = [...internalFiles];
    for (const file of files) {
      if (next.some((c) => c.fileName === file.name)) continue;
      const result = await extract(file);
      if (result) next.push(result);
    }
    setInternalFiles(next);
    if (next.length > 0) onContextChange(buildCombined(next));
  }

  function removeFile(fileName: string) {
    const next = internalFiles.filter((c) => c.fileName !== fileName);
    setInternalFiles(next);
    onContextChange(next.length > 0 ? buildCombined(next) : null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void handleFiles(files);
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
          {internalFiles.length > 0 && (
            <div className="context-active">
              {internalFiles.map((item) => (
                <div className="context-file-row" key={item.fileName}>
                  <p className="context-file-name" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <button
                    className="context-remove-btn"
                    onClick={() => removeFile(item.fileName)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {context?.truncated && (
                <p className="context-warning">
                  Truncated to 30 KB — only the first portion will be used.
                </p>
              )}
              <button
                className="context-clear-btn"
                onClick={() => { setInternalFiles([]); onContextChange(null); }}
                type="button"
              >
                Clear all
              </button>
            </div>
          )}

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
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void handleFiles(files);
                e.target.value = "";
              }}
            />
            {loading ? (
              <span className="context-drop-hint">Extracting text…</span>
            ) : (
              <>
                <span className="context-drop-hint">Drop PDF or TXT</span>
                <span className="context-drop-sub">
                  {internalFiles.length > 0 ? "add more files" : "click to browse"}
                </span>
              </>
            )}
          </div>

          {error && <p className="context-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
