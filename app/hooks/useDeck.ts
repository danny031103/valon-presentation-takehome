import { useEffect, useRef, useState } from "react";

export type SlideStatus = "idle" | "working" | "done" | "error";

export type EditorMode = "edit" | "ai";

export type SlideLayout = "title" | "image-text" | "text-only" | "full-bleed";

export type SlideFormatting = {
  bold?: boolean;
  italic?: boolean;
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
  formatting?: SlideFormatting;
  title?: string;
  body?: string;
};

const STORAGE_KEY = "valon-presentation-takehome-v2";

function makeSlide(index: number): Slide {
  return {
    id: crypto.randomUUID(),
    name: `Slide ${index + 1}`,
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

export function useDeck() {
  const [slides, setSlides] = useState<Slide[]>(starterSlides);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editorMode, setEditorMode] = useState<EditorMode>("ai");
  const [message, setMessage] = useState("Saved locally in your browser.");
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<Slide[][]>([]);
  // Tracks the target of the last coalesced edit (`${id}:${fields}`) so a run of
  // edits to the same field on the same slide collapses into one undo entry.
  const lastEditKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const fresh = starterSlides();
      setSlides(fresh);
      setSelectedId(fresh[0]?.id ?? "");
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        slides: Slide[];
        selectedId: string;
        editorMode?: EditorMode;
      };

      if (parsed.slides?.length) {
        setSlides(parsed.slides);
        setSelectedId(parsed.selectedId || parsed.slides[0].id);
        if (parsed.editorMode === "edit" || parsed.editorMode === "ai") {
          setEditorMode(parsed.editorMode);
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

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ slides, selectedId: selectedId || slides[0].id, editorMode })
    );
  }, [slides, selectedId, editorMode]);

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
    setSlides(snapshot);
    if (!snapshot.some((slide) => slide.id === selectedId)) {
      setSelectedId(snapshot[0]?.id ?? "");
    }
    lastEditKeyRef.current = null;
    setMessage("Undid last change.");
  }

  // Keep a ref to the latest undo so the keydown listener can stay subscribed
  // once while always calling the current closure.
  const undoRef = useRef(undo);
  undoRef.current = undo;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey;
      if (!isUndo) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        // Let the browser handle native text undo inside editable fields.
        return;
      }

      event.preventDefault();
      undoRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            : selectedSlide.prompt
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
      feedback: payload.text || "Done."
    });
    setMessage("Image added to slide.");
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
          title: "Valon Presentation Takehome Export",
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
      anchor.download = "valon-presentation-takehome-export.pptx";
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
    message,
    exporting,
    patchSlide,
    addSlide,
    reorderSlides,
    killSlide,
    undo,
    canUndo: history.length > 0,
    generateSlide,
    exportDeck
  };
}
