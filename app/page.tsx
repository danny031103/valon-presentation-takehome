"use client";

import { EditorTopBar } from "./components/EditorTopBar";
import { NotesPanel } from "./components/NotesPanel";
import { PromptPanel } from "./components/PromptPanel";
import { Sidebar } from "./components/Sidebar";
import { SlideCanvas } from "./components/SlideCanvas";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { useDeck } from "./hooks/useDeck";

export default function Home() {
  const {
    slides,
    selectedSlide,
    setSelectedId,
    editorMode,
    setEditorMode,
    message,
    exporting,
    patchSlide,
    addSlide,
    killSlide,
    generateSlide,
    exportDeck
  } = useDeck();

  return (
    <main className="shell">
      <Sidebar
        slides={slides}
        selectedId={selectedSlide?.id}
        onSelect={setSelectedId}
        onAddSlide={addSlide}
      />

      <section className="editor">
        <EditorTopBar
          name={selectedSlide?.name ?? ""}
          exporting={exporting}
          editorMode={editorMode}
          layout={selectedSlide?.layout ?? "full-bleed"}
          onModeChange={setEditorMode}
          onLayoutChange={(layout) => selectedSlide && patchSlide(selectedSlide.id, { layout })}
          onRename={(name) => selectedSlide && patchSlide(selectedSlide.id, { name })}
          onDelete={() => selectedSlide && killSlide(selectedSlide.id)}
          onExport={exportDeck}
        />

        <SlideCanvas slide={selectedSlide} />

        <div className="bottom-panel">
          {editorMode === "ai" ? (
            <>
              <PromptPanel
                prompt={selectedSlide?.prompt ?? ""}
                onChange={(value) => selectedSlide && patchSlide(selectedSlide.id, { prompt: value })}
              />

              <div className="side-controls">
                <button
                  className="loud-button"
                  disabled={selectedSlide?.status === "working"}
                  onClick={() => {
                    void generateSlide("fresh");
                  }}
                  type="button"
                >
                  {selectedSlide?.status === "working" ? "Generating…" : "Generate"}
                </button>
                <button
                  className="ghost-button"
                  disabled={selectedSlide?.status === "working"}
                  onClick={() => {
                    void generateSlide("again");
                  }}
                  type="button"
                >
                  Regenerate
                </button>
                <NotesPanel
                  note={selectedSlide?.note ?? ""}
                  onChange={(value) => selectedSlide && patchSlide(selectedSlide.id, { note: value })}
                />
              </div>
            </>
          ) : (
            <div className="edit-panel">
              <Toolbar
                formatting={selectedSlide?.formatting}
                onChange={(formatting) =>
                  selectedSlide && patchSlide(selectedSlide.id, { formatting })
                }
              />
              <NotesPanel
                note={selectedSlide?.note ?? ""}
                onChange={(value) => selectedSlide && patchSlide(selectedSlide.id, { note: value })}
              />
            </div>
          )}
        </div>

        <StatusBar message={message} />
      </section>
    </main>
  );
}
