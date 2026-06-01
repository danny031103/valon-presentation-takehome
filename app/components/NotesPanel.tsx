import { useState } from "react";

type NotesPanelProps = {
  note: string;
  onChange: (value: string) => void;
};

export function NotesPanel({ note, onChange }: NotesPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="notes-section">
        <div className="prompt-label-row">
          <label className="field-label" htmlFor="note-box">
            Speaker notes
          </label>
          <button
            aria-label="Expand speaker notes editor"
            className="prompt-expand-btn"
            onClick={() => setExpanded(true)}
            title="Expand"
            type="button"
          >
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 16 16" width="14">
              <path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" />
            </svg>
          </button>
        </div>
        <textarea
          id="note-box"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add speaker notes for this slide."
          rows={2}
          value={note}
        />
      </div>

      {expanded && (
        <div className="prompt-modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="prompt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="prompt-modal-header">
              <span className="field-label">Speaker notes</span>
              <button
                aria-label="Close speaker notes editor"
                className="prompt-modal-close"
                onClick={() => setExpanded(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <textarea
              autoFocus
              className="prompt-modal-textarea"
              onChange={(event) => onChange(event.target.value)}
              placeholder="Add speaker notes for this slide."
              value={note}
            />
          </div>
        </div>
      )}
    </>
  );
}
