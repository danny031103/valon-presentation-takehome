"use client";

import { useRef, useState } from "react";

import { CropModal } from "./components/CropModal";
import { EditorTopBar } from "./components/EditorTopBar";
import { ReviewPanel } from "./components/ReviewPanel";
import type { ReviewState } from "./components/ReviewPanel";
import { PresentationMode } from "./components/PresentationMode";
import { GenerationProgress } from "./components/GenerationProgress";
import { NewDeckScreen } from "./components/NewDeckScreen";
import { NotesPanel } from "./components/NotesPanel";
import { Onboarding } from "./components/Onboarding";
import { PromptPanel } from "./components/PromptPanel";
import { Sidebar } from "./components/Sidebar";
import { SlideCanvas } from "./components/SlideCanvas";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { useDeck } from "./hooks/useDeck";
import { resetLearning } from "./hooks/useLearning";

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
    showNewDeckScreen,
    startBlankDeck,
    triggerNewDeck,
    startOver,
    generationProgress,
    generateDeck,
    cancelGeneration,
    generateSlide,
    importImage,
    exportDeck,
    exportPdf,
    exportJson,
    importJson,
    reviewDeck
  } = useDeck();

  const [focusedField, setFocusedField] = useState<"title" | "body" | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [currentPresentationIndex, setCurrentPresentationIndex] = useState(0);
  const canvasCardRef = useRef<HTMLDivElement>(null);

  function handleEditUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (dataUrl) setCropSource(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleReview() {
    setReview({ loading: true });
    try {
      const data = await reviewDeck();
      setReview({ loading: false, data });
    } catch (err) {
      setReview({ loading: false, error: err instanceof Error ? err.message : "Review failed." });
    }
  }

  function handlePresent() {
    const idx = slides.findIndex((s) => s.id === selectedSlide?.id);
    setCurrentPresentationIndex(idx >= 0 ? idx : 0);
    setPresenting(true);
  }

  function handlePresentationNext() {
    const next = Math.min(currentPresentationIndex + 1, slides.length - 1);
    setCurrentPresentationIndex(next);
    setSelectedId(slides[next]?.id ?? null);
  }

  function handlePresentationPrev() {
    const prev = Math.max(currentPresentationIndex - 1, 0);
    setCurrentPresentationIndex(prev);
    setSelectedId(slides[prev]?.id ?? null);
  }

  function handlePresentationExit() {
    setPresenting(false);
  }

  if (showNewDeckScreen) {
    return (
      <NewDeckScreen
        onStartBlank={startBlankDeck}
        defaultStyle={imageStyle}
        onGenerateDeck={generateDeck}
      />
    );
  }

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
          onExportPdf={exportPdf}
          onImportJson={importJson}
          onNewDeck={triggerNewDeck}
          onStartOver={startOver}
          onPresent={handlePresent}
          onReview={() => { void handleReview(); }}
          onResetLearning={resetLearning}
        />

        <SlideCanvas
          canvasRef={canvasCardRef}
          slide={selectedSlide}
          editorMode={editorMode}
          onPatch={(patch) => selectedSlide && patchSlide(selectedSlide.id, patch)}
          onRetry={() => generateSlide("fresh")}
          onFocusField={setFocusedField}
          userRating={selectedSlide?.userRating}
          onRating={(rating) => selectedSlide && patchSlide(selectedSlide.id, { userRating: rating })}
        />

        <div className="bottom-panel">
          {editorMode === "ai" ? (
            <>
              <PromptPanel
                prompt={selectedSlide?.prompt ?? ""}
                onChange={(value) => selectedSlide && patchSlide(selectedSlide.id, { prompt: value })}
                referenceImageUrl={referenceImageUrl}
                onReferenceImage={setReferenceImageUrl}
                imageStyle={imageStyle}
                onStyleChange={setImageStyle}
                imageModel={imageModel}
                onModelChange={setImageModel}
                deckTitle={deckTitle}
                slideTitle={selectedSlide?.name}
                promptHistory={selectedSlide?.promptHistory}
                onRestoreHistory={(entry) =>
                  selectedSlide &&
                  patchSlide(selectedSlide.id, {
                    imageData: entry.imageData,
                    prompt: entry.prompt,
                    status: "done"
                  })
                }
              />

              <div className="side-controls">
                <button
                  className="loud-button"
                  disabled={selectedSlide?.status === "working"}
                  onClick={() => {
                    void generateSlide("fresh", referenceImageUrl ?? undefined).then(() =>
                      setReferenceImageUrl(null)
                    );
                  }}
                  type="button"
                >
                  {selectedSlide?.status === "working" ? "Generating…" : "Generate"}
                </button>
                <button
                  className="ghost-button"
                  disabled={selectedSlide?.status === "working"}
                  onClick={() => {
                    void generateSlide("again", referenceImageUrl ?? undefined).then(() =>
                      setReferenceImageUrl(null)
                    );
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
                focusedField={focusedField}
                titleFormatting={selectedSlide?.titleFormatting}
                bodyFormatting={selectedSlide?.bodyFormatting}
                onTitleFormattingChange={(titleFormatting) =>
                  selectedSlide && patchSlide(selectedSlide.id, { titleFormatting })
                }
                onBodyFormattingChange={(bodyFormatting) =>
                  selectedSlide && patchSlide(selectedSlide.id, { bodyFormatting })
                }
                body={selectedSlide?.body}
                onBodyChange={(body) => selectedSlide && patchSlide(selectedSlide.id, { body })}
                onUndo={undo}
                canUndo={canUndo}
                onRedo={redo}
                canRedo={canRedo}
                layout={selectedSlide?.layout ?? "full-bleed"}
                onLayoutChange={(layout) => selectedSlide && patchSlide(selectedSlide.id, { layout })}
                onUploadImage={handleEditUpload}
                onRecropImage={selectedSlide?.imageData ? () => setCropSource(selectedSlide.originalImageData ?? selectedSlide.imageData!) : undefined}
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

      {generationProgress && (
        <GenerationProgress
          current={generationProgress.current}
          total={generationProgress.total}
          onCancel={cancelGeneration}
        />
      )}

      <Onboarding />

      {cropSource && selectedSlide && (
        <CropModal
          src={cropSource}
          onApply={(dataUrl) => {
            const patch: Parameters<typeof patchSlide>[1] = { imageData: dataUrl, status: "done", feedback: "Image uploaded." };
            if (!selectedSlide.originalImageData) patch.originalImageData = cropSource!;
            patchSlide(selectedSlide.id, patch);
            setCropSource(null);
          }}
          onCancel={() => setCropSource(null)}
        />
      )}

      {review && (
        <ReviewPanel state={review} onClose={() => setReview(null)} />
      )}

      <div className="print-layer" aria-hidden="true">
        {slides.map((slide) => {
          const layout = slide.layout ?? "full-bleed";
          const hasImage = Boolean(slide.imageData);

          return (
            <div key={slide.id} className="print-slide">
              <div className="canvas-card">
                {layout === "title" && (
                  <div className="layout-region layout-title">
                    {slide.title && <p className="slide-read-title">{slide.title}</p>}
                    {slide.body && <p className="slide-read-body">{slide.body}</p>}
                  </div>
                )}
                {layout === "text-only" && (
                  <div className="layout-region layout-text-only">
                    {slide.title && <p className="slide-read-title">{slide.title}</p>}
                    {slide.body && <p className="slide-read-body">{slide.body}</p>}
                  </div>
                )}
                {layout === "big-quote" && (
                  <div className="layout-region layout-big-quote">
                    {slide.title && <p className="slide-read-big-quote">{slide.title}</p>}
                  </div>
                )}
                {layout === "full-bleed" && (
                  <>
                    {hasImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="slide-image" src={slide.imageData} />
                    )}
                    <div className="canvas-full-bleed-overlay">
                      {slide.title && <p className="canvas-overlay-title">{slide.title}</p>}
                      {slide.body && <p className="canvas-overlay-body">{slide.body}</p>}
                    </div>
                  </>
                )}
                {(layout === "image-text" || layout === "text-image") && (
                  <div className={`layout-region layout-${layout}`}>
                    <div className="layout-image-pane">
                      {hasImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="slide-image" src={slide.imageData} />
                      )}
                    </div>
                    <div className="layout-text-pane">
                      {slide.title && <p className="slide-read-title">{slide.title}</p>}
                      {slide.body && <p className="slide-read-body">{slide.body}</p>}
                    </div>
                  </div>
                )}
                {(layout === "image-top" || layout === "image-bottom") && (
                  <div className={`layout-region layout-${layout}`}>
                    <div className="layout-image-pane">
                      {hasImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="slide-image" src={slide.imageData} />
                      )}
                    </div>
                    <div className="layout-text-pane">
                      {slide.title && <p className="slide-read-title">{slide.title}</p>}
                      {slide.body && <p className="slide-read-body">{slide.body}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {presenting && (
        <PresentationMode
          canvasRef={canvasCardRef}
          currentIndex={currentPresentationIndex}
          onExit={handlePresentationExit}
          onNext={handlePresentationNext}
          onPrev={handlePresentationPrev}
        />
      )}
    </main>
  );
}
