import { useEffect, useRef, useState } from "react";

export type SlideStatus = "idle" | "working" | "done" | "error";

export type EditorMode = "edit" | "ai";

export type ImageStyle =
  | "professional"
  | "minimal"
  | "editorial"
  | "illustrative"
  | "photographic"
  | "none";

export type SlideLayout = "title" | "image-text" | "text-only" | "full-bleed";

export type SlideFormatting = {
  bold?: boolean;
  italic?: boolean;
  bullets?: boolean;
  fontSize?: "S" | "M" | "L" | "XL";
  color?: string;
  align?: "left" | "center" | "right";
};

export type Slide = {
  id: string;
  name: string;
  prompt: string;
  imageData?: string;
  status: SlideStatus;
  note: string;
  feedback?: string;
  layout?: SlideLayout;
  titleFormatting?: SlideFormatting;
  bodyFormatting?: SlideFormatting;
  title?: string;
  body?: string;
  generatedForLayout?: SlideLayout;
};

export type DeckContext = {
  text: string;
  fileName: string;
  truncated: boolean;
};

export type DeckPlanSlide = {
  name: string;
  title: string;
  body: string;
  imagePrompt: string;
  layout: SlideLayout;
};

export type DeckPlan = {
  deckTitle: string;
  slides: DeckPlanSlide[];
};

const STORAGE_KEY = "valon-presentation-takehome-v2";

function makeSlide(index: number): Slide {
  return {
    id: crypto.randomUUID(),
    name: "",
    prompt:
      index === 0
        ? "An opening slide for a mortgage startup presentation with a bold hero image, a giant title, and extremely eager sales vibes"
        : "",
    status: "idle",
    note: ""
  };
}

function starterSlides(): Slide[] {
  return [makeSlide(0), makeSlide(1)];
}

// Turn a deck title into a safe download filename: strip filesystem-unsafe
// characters, collapse whitespace, fall back to "untitled-deck".
function toFileName(title: string, ext = "pptx"): string {
  const cleaned = title
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleaned || "untitled-deck"}.${ext}`;
}

export function useDeck() {
  const [slides, setSlides] = useState<Slide[]>(starterSlides);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editorMode, setEditorMode] = useState<EditorMode>("ai");
  const [deckTitle, setDeckTitle] = useState("Untitled deck");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("professional");
  const [imageModel, setImageModel] = useState<string>("");
  const [context, setContext] = useState<DeckContext | null>(null);
  const [showNewDeckScreen, setShowNewDeckScreen] = useState(false);
  const [message, setMessage] = useState("Saved locally in your browser.");
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [history, setHistory] = useState<Slide[][]>([]);
  const [future, setFuture] = useState<Slide[][]>([]);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  // Tracks the target of the last coalesced edit (`${id}:${fields}`) so a run of
  // edits to the same field on the same slide collapses into one undo entry.
  const lastEditKeyRef = useRef<string | null>(null);
  // Set to true by cancelGeneration(); checked between slides in generateDeck loop.
  const cancelGenerationRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const fresh = starterSlides();
      setSlides(fresh);
      setSelectedId(fresh[0]?.id ?? "");
      setShowNewDeckScreen(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        slides: Slide[];
        selectedId: string;
        editorMode?: EditorMode;
        deckTitle?: string;
        imageStyle?: ImageStyle;
        imageModel?: string;
        context?: DeckContext;
      };

      if (parsed.slides?.length) {
        const migrated = (parsed.slides as Array<Slide & { formatting?: SlideFormatting }>).map(
          (s): Slide => {
            const { formatting, ...rest } = s;
            return {
              ...rest,
              titleFormatting: rest.titleFormatting ?? formatting,
              bodyFormatting: rest.bodyFormatting ?? formatting,
            };
          }
        );
        setSlides(migrated);
        setSelectedId(parsed.selectedId || migrated[0].id);
        if (parsed.editorMode === "edit" || parsed.editorMode === "ai") {
          setEditorMode(parsed.editorMode);
        }
        if (typeof parsed.deckTitle === "string" && parsed.deckTitle) {
          setDeckTitle(parsed.deckTitle);
        }
        if (
          parsed.imageStyle &&
          ["professional", "minimal", "editorial", "illustrative", "photographic", "none"].includes(
            parsed.imageStyle
          )
        ) {
          setImageStyle(parsed.imageStyle);
        }
        if (typeof parsed.imageModel === "string") {
          setImageModel(parsed.imageModel);
        }
        if (
          parsed.context &&
          typeof parsed.context.text === "string" &&
          typeof parsed.context.fileName === "string"
        ) {
          setContext(parsed.context);
        }
      }
    } catch {
      const fresh = starterSlides();
      setSlides(fresh);
      setSelectedId(fresh[0]?.id ?? "");
    }
  }, []);

  useEffect(() => {
    if (!slides.length) {
      return;
    }

    setSaving(true);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slides, selectedId: selectedId || slides[0].id, editorMode, deckTitle, imageStyle, imageModel, context })
      );
      setLastSavedAt(new Date());
    } catch {
      // Most likely QuotaExceededError from a large imported image. Keep the
      // deck working in memory this session; just warn that it won't persist.
      setMessage("Deck too large to save locally — recent changes won't persist.");
    } finally {
      setSaving(false);
    }
  }, [slides, selectedId, editorMode, deckTitle, imageStyle, imageModel, context]);

  const selectedSlide = slides.find((slide) => slide.id === selectedId) ?? slides[0];

  useEffect(() => {
    if (!selectedSlide && slides[0]) {
      setSelectedId(slides[0].id);
    }
  }, [selectedSlide, slides]);

  function pushHistory() {
    setHistory((current) => {
      const next = [...current, slides];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setFuture([]);
  }

  // Applies a patch without touching history. Used for generation-driven status
  // churn, which should not be undoable.
  function applyPatch(id: string, patch: Partial<Slide>) {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide))
    );
  }

  function patchSlide(id: string, patch: Partial<Slide>) {
    const editKey = `${id}:${Object.keys(patch).sort().join(",")}`;
    if (lastEditKeyRef.current !== editKey) {
      pushHistory();
      lastEditKeyRef.current = editKey;
    }
    applyPatch(id, patch);
  }

  function reorderSlides(from: number, to: number) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= slides.length ||
      to >= slides.length
    ) {
      return;
    }

    pushHistory();
    lastEditKeyRef.current = null;
    setSlides((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addSlide() {
    pushHistory();
    lastEditKeyRef.current = null;
    const next = makeSlide(slides.length);
    setSlides((current) => [...current, next]);
    setSelectedId(next.id);
    setMessage("Slide added.");
  }

  function killSlide(id: string) {
    if (slides.length === 1) {
      setMessage("A deck needs at least one slide.");
      return;
    }

    pushHistory();
    lastEditKeyRef.current = null;
    const nextSlides = slides.filter((slide) => slide.id !== id);
    setSlides(nextSlides);

    if (selectedId === id) {
      setSelectedId(nextSlides[0]?.id ?? "");
    }

    setMessage("Slide deleted.");
  }

  function undo() {
    if (!history.length) {
      return;
    }

    const snapshot = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => {
      const next = [slides, ...current];
      return next.length > 50 ? next.slice(0, 50) : next;
    });
    setSlides(snapshot);
    if (!snapshot.some((slide) => slide.id === selectedId)) {
      setSelectedId(snapshot[0]?.id ?? "");
    }
    lastEditKeyRef.current = null;
    setMessage("Undid last change.");
  }

  function redo() {
    if (!future.length) {
      return;
    }

    const snapshot = future[0];
    setFuture((current) => current.slice(1));
    setHistory((current) => {
      const next = [...current, slides];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setSlides(snapshot);
    if (!snapshot.some((slide) => slide.id === selectedId)) {
      setSelectedId(snapshot[0]?.id ?? "");
    }
    lastEditKeyRef.current = null;
    setMessage("Redid last change.");
  }

  function startBlankDeck() {
    const fresh = starterSlides();
    setSlides(fresh);
    setSelectedId(fresh[0]?.id ?? "");
    setContext(null);
    setHistory([]);
    setFuture([]);
    lastEditKeyRef.current = null;
    setShowNewDeckScreen(false);
  }

  function startOver() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("valon-onboarding-dismissed");
    const fresh = starterSlides();
    setSlides(fresh);
    setSelectedId(fresh[0]?.id ?? "");
    setDeckTitle("Untitled deck");
    setImageStyle("professional");
    setImageModel("");
    setContext(null);
    setHistory([]);
    setFuture([]);
    lastEditKeyRef.current = null;
    setShowNewDeckScreen(true);
  }

  function triggerNewDeck() {
    const hasContent = slides.some(
      (s) => s.prompt || s.imageData || s.title || s.body
    );
    if (
      hasContent &&
      !window.confirm("Start a new deck? Your current deck will be replaced.")
    ) {
      return;
    }
    setShowNewDeckScreen(true);
  }

  async function generateDeck(plan: DeckPlan, style: ImageStyle) {
    const newSlides: Slide[] = plan.slides.map((ps) => ({
      id: crypto.randomUUID(),
      name: ps.name,
      title: ps.title,
      body: ps.body,
      layout: ps.layout,
      prompt: ps.imagePrompt,
      status: "idle" as SlideStatus,
      note: ""
    }));

    setSlides(newSlides);
    setDeckTitle(plan.deckTitle);
    setSelectedId(newSlides[0]?.id ?? "");
    setImageStyle(style);
    setHistory([]);
    setFuture([]);
    lastEditKeyRef.current = null;
    setShowNewDeckScreen(false);

    cancelGenerationRef.current = false;
    setGenerationProgress({ current: 1, total: newSlides.length });

    for (let i = 0; i < newSlides.length; i++) {
      if (cancelGenerationRef.current) break;

      const slide = newSlides[i];
      setGenerationProgress({ current: i + 1, total: newSlides.length });
      applyPatch(slide.id, { status: "working" });

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: slide.prompt,
            style,
            model: imageModel || undefined,
            layout: slide.layout
          })
        });

        const payload = (await response.json()) as {
          imageData?: string;
          error?: string;
          text?: string;
        };

        if (!response.ok || !payload.imageData) {
          applyPatch(slide.id, {
            status: "error",
            feedback: payload.error ?? "Image generation failed."
          });
        } else {
          applyPatch(slide.id, {
            imageData: payload.imageData,
            status: "done",
            feedback: payload.text || "Done.",
            generatedForLayout: slide.layout
          });
        }
      } catch {
        applyPatch(slide.id, {
          status: "error",
          feedback: "Image generation failed."
        });
      }
    }

    setGenerationProgress(null);
    setMessage(
      cancelGenerationRef.current
        ? "Generation cancelled."
        : "Deck generated."
    );
  }

  function cancelGeneration() {
    cancelGenerationRef.current = true;
  }

  // Keep refs to the latest undo/redo so the keydown listener can stay
  // subscribed once while always calling the current closures.
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      const isUndo = mod && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo =
        (mod && event.key.toLowerCase() === "z" && event.shiftKey) ||
        (event.ctrlKey && event.key.toLowerCase() === "y");
      if (!isUndo && !isRedo) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      if (isRedo) {
        redoRef.current();
      } else {
        undoRef.current();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function duplicateSlide(id: string) {
    const index = slides.findIndex((slide) => slide.id === id);
    if (index === -1) {
      return;
    }

    const source = slides[index];
    const copy: Slide = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} copy`,
      titleFormatting: source.titleFormatting ? { ...source.titleFormatting } : undefined,
      bodyFormatting: source.bodyFormatting ? { ...source.bodyFormatting } : undefined,
    };

    pushHistory();
    lastEditKeyRef.current = null;
    setSlides((current) => {
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
    setMessage("Slide duplicated.");
  }

  async function generateSlide(mode: "fresh" | "again") {
    if (!selectedSlide) {
      return;
    }

    if (!selectedSlide.prompt.trim()) {
      setMessage("Add a prompt before generating.");
      applyPatch(selectedSlide.id, { status: "error", feedback: "No prompt yet." });
      return;
    }

    applyPatch(selectedSlide.id, {
      status: "working",
      feedback: "Generating image…"
    });
    setMessage("Generating image…");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt:
          mode === "again"
            ? `${selectedSlide.prompt}\n\nTry a noticeably different composition from the last version.`
            : selectedSlide.prompt,
        style: imageStyle,
        model: imageModel || undefined,
        context: context?.text ?? undefined,
        layout: selectedSlide.layout
      })
    });

    const payload = (await response.json()) as {
      error?: string;
      imageData?: string;
      text?: string;
    };

    if (!response.ok || !payload.imageData) {
      applyPatch(selectedSlide.id, {
        status: "error",
        feedback: payload.error ?? "Image generation failed."
      });
      setMessage(payload.error ?? "Image generation failed.");
      return;
    }

    applyPatch(selectedSlide.id, {
      imageData: payload.imageData,
      status: "done",
      feedback: payload.text || "Done.",
      generatedForLayout: selectedSlide.layout
    });
    setMessage("Image added to slide.");
  }

  // Reads a local image file onto the selected slide as a base64 data URL — no
  // API call. Oversized files warn but still import.
  // NOTE: imageData is persisted to localStorage (~5MB cap, base64 inflates the
  // size ~33%), so importing a large image risks exceeding the quota on save.
  function importImage(file: File) {
    if (!selectedSlide) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("That file isn't an image.");
      return;
    }

    const WARN_BYTES = 4 * 1024 * 1024;
    const oversized = file.size > WARN_BYTES;
    if (oversized) {
      setMessage("Heads up: image is over 4MB and may not save locally.");
    }

    const slideId = selectedSlide.id;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = typeof reader.result === "string" ? reader.result : "";
      if (!imageData) {
        setMessage("Couldn't read that image file.");
        return;
      }
      patchSlide(slideId, {
        imageData,
        status: "done",
        feedback: "Image uploaded."
      });
      if (!oversized) {
        setMessage("Image added to slide.");
      }
    };
    reader.onerror = () => {
      setMessage("Couldn't read that image file.");
    };
    reader.readAsDataURL(file);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setMessage("Import failed: file is not valid JSON.");
        return;
      }

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (parsed as Record<string, unknown>).version !== 1 ||
        !Array.isArray((parsed as Record<string, unknown>).slides) ||
        ((parsed as Record<string, unknown>).slides as unknown[]).length === 0
      ) {
        setMessage("Import failed: unrecognised file format.");
        return;
      }

      const data = parsed as {
        version: 1;
        deckTitle?: string;
        editorMode?: EditorMode;
        slides: Slide[];
      };

      const hasContent = slides.some(
        (s) => s.prompt || s.imageData || s.title || s.body
      );
      if (
        hasContent &&
        !window.confirm("Replace the current deck with the imported one?")
      ) {
        return;
      }

      const incoming = data.slides.filter(
        (s) => typeof s.id === "string" && typeof s.name === "string"
      );
      if (!incoming.length) {
        setMessage("Import failed: no valid slides found.");
        return;
      }

      setSlides(incoming);
      setSelectedId(incoming[0].id);
      if (typeof data.deckTitle === "string" && data.deckTitle) {
        setDeckTitle(data.deckTitle);
      }
      if (data.editorMode === "edit" || data.editorMode === "ai") {
        setEditorMode(data.editorMode);
      }
      setHistory([]);
      lastEditKeyRef.current = null;
      setMessage("Deck imported.");
    };
    reader.onerror = () => setMessage("Import failed: couldn't read that file.");
    reader.readAsText(file);
  }

  function exportJson() {
    const payload = JSON.stringify({ version: 1, deckTitle, editorMode, slides }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = toFileName(deckTitle, "json");
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Deck exported as JSON.");
  }

  async function exportDeck() {
    if (!slides.length) {
      return;
    }

    setExporting(true);
    setMessage("Building your PowerPoint…");

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: deckTitle,
          slides
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = toFileName(deckTitle);
      anchor.click();
      window.URL.revokeObjectURL(url);
      setMessage("Download started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return {
    slides,
    selectedId,
    setSelectedId,
    selectedSlide,
    editorMode,
    setEditorMode,
    deckTitle,
    setDeckTitle,
    imageStyle,
    setImageStyle,
    imageModel,
    setImageModel,
    context,
    setContext,
    showNewDeckScreen,
    startBlankDeck,
    triggerNewDeck,
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
    canUndo: history.length > 0,
    redo,
    canRedo: future.length > 0,
    generationProgress,
    generateDeck,
    cancelGeneration,
    generateSlide,
    importImage,
    exportDeck,
    exportJson,
    importJson,
    startOver
  };
}
