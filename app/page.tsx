"use client";

import { EditorTopBar } from "./components/EditorTopBar";
import { NotesPanel } from "./components/NotesPanel";
import { Onboarding } from "./components/Onboarding";
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
    deckTitle,
    setDeckTitle,
    imageStyle,
    setImageStyle,
    imageModel,
    setImageModel,
    message,
    exporting,
    saving,
    lastSavedAt,
    patchSlide,
    addSlide,
    reorderSlides,
    killSlide,
    duplicateSlide,
    undo,
    canUndo,
    redo,
    canRedo,
    context,
    setContext,
    generateSlide,
    importImage,
    exportDeck,
    exportJson,
    importJson
  } = useDeck();

  return (
    <main className="shell">
      <Sidebar
        slides={slides}
        selectedId={selectedSlide?.id}
        onSelect={setSelectedId}
        onAddSlide={addSlide}
        onDeleteSlide={() => selectedSlide && killSlide(selectedSlide.id)}
        onReorder={reorderSlides}
        onDuplicate={duplicateSlide}
        context={context}
        onContextChange={setContext}
      />

      <section className="editor">
        <EditorTopBar
          name={selectedSlide?.name ?? ""}
          exporting={exporting}
          editorMode={editorMode}
          onModeChange={setEditorMode}
          onRename={(name) => selectedSlide && patchSlide(selectedSlide.id, { name })}
          deckTitle={deckTitle}
          onDeckTitleChange={setDeckTitle}
          onExport={exportDeck}
          onExportJson={exportJson}
          onImportJson={importJson}
        />

        <SlideCanvas
          slide={selectedSlide}
          editorMode={editorMode}
          onPatch={(patch) => selectedSlide && patchSlide(selectedSlide.id, patch)}
          onRetry={() => generateSlide("fresh")}
        />

        <div className="bottom-panel">
          {editorMode === "ai" ? (
            <>
              <PromptPanel
                prompt={selectedSlide?.prompt ?? ""}
                onChange={(value) => selectedSlide && patchSlide(selectedSlide.id, { prompt: value })}
                onUploadImage={importImage}
                imageStyle={imageStyle}
                onStyleChange={setImageStyle}
                imageModel={imageModel}
                onModelChange={setImageModel}
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
                body={selectedSlide?.body}
                onBodyChange={(body) => selectedSlide && patchSlide(selectedSlide.id, { body })}
                onUndo={undo}
                canUndo={canUndo}
                onRedo={redo}
                canRedo={canRedo}
                layout={selectedSlide?.layout ?? "full-bleed"}
                onLayoutChange={(layout) => selectedSlide && patchSlide(selectedSlide.id, { layout })}
                onUploadImage={importImage}
                hasImage={Boolean(selectedSlide?.imageData)}
              />
              <NotesPanel
                note={selectedSlide?.note ?? ""}
                onChange={(value) => selectedSlide && patchSlide(selectedSlide.id, { note: value })}
              />
            </div>
          )}
        </div>

        <StatusBar message={message} saving={saving} lastSavedAt={lastSavedAt} />
      </section>

      <Onboarding />
    </main>
  );
}
