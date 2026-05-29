type NotesPanelProps = {
  note: string;
  onChange: (value: string) => void;
};

export function NotesPanel({ note, onChange }: NotesPanelProps) {
  return (
    <div className="notes-section">
      <label className="field-label" htmlFor="note-box">
        Speaker notes
      </label>
      <textarea
        id="note-box"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add speaker notes for this slide."
        rows={2}
        value={note}
      />
    </div>
  );
}
