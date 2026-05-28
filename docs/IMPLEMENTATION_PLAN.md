# Implementation Plan

This plan evolves the starter (a deliberately bad, joke-styled deck builder) into a professional AI presentation tool matching Valon's design language (`docs/DESIGN_REFERENCE.md`). Phases are sequential — confirm the active phase before starting, do not jump ahead.

---

## Phase 1 — UI Foundation ✅ Complete

**Goal:** Replace the joke aesthetic and ironic copy with Valon's design system, and split the monolithic `app/page.tsx` into focused components so later phases have a clean home.

> **Status:** Complete. Applied the Valon design tokens, fonts, and background gradient to `app/globals.css`/`app/layout.tsx`; relabeled all UI copy to plain English and removed the duplicate add-slide button; decomposed `app/page.tsx` into focused components plus a `useDeck` hook.
>
> **Deviation from plan:** A layout redesign was added as extra scope beyond the original component-split/restyle work — the editor layout was reworked, not just the styling and decomposition described above.

### Changes
- **`app/globals.css`** — Replace `:root` tokens with the palette in `DESIGN_REFERENCE.md` (`--background`, `--surface`, `--surface-raised`, `--border`, `--foreground`, `--brand`, `--brand-soft`, `--danger`, `--success`, `--radius`). Swap font-family to Plus Jakarta Sans (body) and DM Serif Display (headings). Remove Comic Sans, rotated `.thumb` transforms, `.weird-button`, `ridge` borders, hot-pink `.loud-button`, yellow `.ghost-button`. Add the radial background gradient. Switch to 1px borders, soft radii, no heavy shadows. **(M)**
- **`app/layout.tsx`** — Load Plus Jakarta Sans + DM Serif Display via `next/font/google`; update `<title>` and metadata to "Valon Presentations". **(S)**
- **Relabel buttons & copy in `app/page.tsx`** — `Box +` → `New slide`, `Toss` → `Delete`, `Another one` → `New slide` (then dedupe — see below), `PPT-ish` → `Export to PowerPoint`, `Cook` → `Generate`, `Again` → `Regenerate`, `Scene request maybe` → `Prompt`, `Tiny note gutter` → `Speaker notes`, `Slides but worse` → `Valon Presentations`, status strings (`A page vanished.`, `Cooking an image.`, `Talking to Google...`, `empty-ish`) → plain English. No uppercase labels. **(S)**
- **Component split of `app/page.tsx`** — Extract into `app/components/`:
  - `Sidebar.tsx` (brand header, slide list, add-slide button)
  - `SlideThumbnail.tsx`
  - `EditorTopBar.tsx` (slide name input, top actions)
  - `SlideCanvas.tsx` (image display + empty state + status chip)
  - `PromptPanel.tsx` (prompt textarea + generate/regenerate)
  - `NotesPanel.tsx` (speaker notes)
  - `StatusBar.tsx`
  - Lift shared state into `app/hooks/useDeck.ts` (slides array, selectedId, patchSlide, addSlide, deleteSlide). `page.tsx` becomes a thin composition root. **(L)**
- **Remove duplicate add-slide entry point** — Keep only the sidebar "New slide" button; remove the top-bar duplicate. **(S)**

### Acceptance criteria
- Visual diff against `docs/design-reference.png` shows warm neutrals, serif headings, 1px borders, no rotation, no Comic Sans.
- No button label is ironic, lowercase-only, or uppercase-only.
- `app/page.tsx` is under ~80 lines and contains no inline JSX for sidebar, canvas, prompt, or notes.
- One add-slide button exists in the UI.
- `npm run typecheck` and `npm run build` pass.

---

## Phase 2 — Core Functionality

**Goal:** Make slides editable as documents, not just image containers — text editing, reordering, undo, duplication, file naming, image upload.

### Changes
- **Slide text fields** — Extend the `Slide` type in `app/page.tsx` (and downstream) with optional `title?: string` and `body?: string`. Render editable title + body fields in `SlideCanvas.tsx` overlaid on the image (or below if no image). Persist via existing `patchSlide`. Existing localStorage entries lack these fields — default to empty strings. **(M)**
- **`app/api/export/route.ts`** — Add title and body text to the exported `.pptx` using `pptxgenjs.addText` with the new fonts; honor `title`/`body` if present. **(S)**
- **Slide reorder** — Add drag-and-drop on `SlideThumbnail` in `Sidebar.tsx` using native HTML5 drag events (no new dependency). Reorder the `slides` array in state. **(M)**
- **Undo** — Add a history stack in `useDeck.ts` (push snapshot on every state mutation, cap at e.g. 50 entries). Add `Cmd/Ctrl+Z` keybinding and a visible "Undo" button in `EditorTopBar.tsx`. **(M)**
- **Export filename** — Replace the hardcoded `valon-presentation-takehome-export.pptx`. Add a deck-level `deckTitle` state (defaults to "Untitled deck"). On export click, open a small inline rename input (or prompt) → pass to the API → API uses it in `Content-Disposition` and client-side `anchor.download`. **(S)**
- **Duplicate slide** — Add a "Duplicate" action on each slide (thumbnail context menu or button). Deep-copies the slide with a new `id`, inserts after the original, selects it. **(S)**
- **Local image import** — Add an "Upload image" button in `PromptPanel.tsx` or `SlideCanvas.tsx` that opens a file picker, reads file as base64 data URL via `FileReader`, sets `imageData` on the current slide, sets `status: "done"`. Validate type (image/*) and size (warn over ~4MB). **(M)**

### Acceptance criteria
- Each slide has editable title and body text that round-trip through export.
- Slides can be reordered by drag in the sidebar; order persists.
- `Cmd/Ctrl+Z` undoes the last mutation (add, delete, rename, prompt edit, reorder, duplicate).
- Exporting prompts (or shows) a filename and the downloaded file matches.
- Duplicating a slide produces an independent copy whose edits don't affect the original.
- A local image file can be uploaded and appears on the slide without calling the API.

---

## Phase 3 — AI Quality

**Goal:** Replace the hardcoded chaotic style with user-controlled style/tone and model selection; make loading and error states honest and actionable.

### Changes
- **Remove `HOUSE_STYLE_APPENDIX`** from `app/api/generate/route.ts`. Accept a `style` field on the request body and map it to a named prompt fragment (`professional`, `minimal`, `editorial`, `illustrative`, `photographic`, `none`). Append the chosen fragment server-side. **(M)**
- **Style selector UI** — Dropdown in `PromptPanel.tsx` (deck-level default in `useDeck.ts`, with per-slide override). Persist to localStorage. Send `style` in the `/api/generate` request body. **(S)**
- **Model selector** — Dropdown for `GOOGLE_IMAGE_MODEL` choices (e.g. `gemini-3-pro-image-preview`, future models). Pass `model` in the request body; `app/api/generate/route.ts` falls back to env var, then default. Keep the env override as the ceiling for what's allowed. **(S)**
- **Loading states** — Replace `"Talking to Google..."` / `"wait"` / `"Cooking an image."` with: a skeleton on the canvas while `status === "working"`, a determinate-feeling progress hint ("Generating image — usually 10–20s"), and a disabled state on Generate. Use the `--brand-soft` token. **(S)**
- **Error state + retry** — When `status === "error"`, render an inline error card on the canvas with the actual server message and a "Retry" button that calls `generateSlide("fresh")` again. Surface API key / quota / safety errors distinctly when the message matches. **(M)**
- **Onboarding** — On first load (no localStorage entry), show a one-time dismissible panel in the empty canvas: 3 tips ("Describe the scene, not the slide", "Pick a style", "Generate, then refine"). Stored under a `valon-onboarding-dismissed` localStorage key. **(S)**

### Acceptance criteria
- Generated images no longer default to Comic Sans / chaotic style; default style is `professional` and produces clean output.
- Changing the style dropdown visibly changes generated output.
- Changing the model dropdown reaches the API and is reflected in the request.
- Error responses surface inline with a working Retry button.
- Loading skeleton and helpful copy appear while waiting.
- First-time visitors see onboarding; returning visitors do not.

---

## Phase 4 — Persistence

**Goal:** Make saving visible, and let users move decks between machines via JSON backup.

### Changes
- **Auto-save indicator** — In `useDeck.ts`, track `lastSavedAt` after each `localStorage.setItem`. Render in `StatusBar.tsx`: "Saved" / "Saving…" / "Saved 3s ago" with a subtle `--success` dot. **(S)**
- **JSON export** — Add "Export deck JSON" in `EditorTopBar.tsx` overflow menu. Serializes `{ slides, deckTitle, version }` and triggers download. Pure client-side, no API. **(S)**
- **JSON import** — Add "Import deck JSON" with file picker. Validates `version` and shape, replaces (or merges, with confirmation) current deck. Show a confirm dialog before overwriting non-empty state. **(M)**

### Acceptance criteria
- Every edit causes the save indicator to briefly show "Saving…" then "Saved".
- Exporting JSON produces a file that, when re-imported in a fresh browser/profile, reproduces the deck byte-for-byte (minus image regeneration).
- Import refuses malformed files with a clear inline error and does not clobber state.

---

## Phase 5 — Future State (Documentation Only)

**Goal:** Document directions that are out of scope today but should not be re-discovered later. No code.

### Changes
- **Sharing & collaboration** — Sketch a model: per-deck share link, read-only vs comment vs edit; requires server-side persistence and auth. Note that the current localStorage-only constraint blocks this.
- **Video export** — Outline path via Remotion or server-side ffmpeg compositing slide images with transitions and (optional) TTS narration from speaker notes. Flag dependency, hosting, and cost implications.
- **Database** — Recommend Postgres (deck, slide, asset tables) with object storage for images, and an auth layer (e.g. Clerk/Auth.js). Outline the migration from localStorage: dual-write, then read-through, then drop local.
- **Other deferred ideas** — Templates / themes library; PDF export; team workspaces; presenter mode; analytics on which slides get edited most.

### Acceptance criteria
- Section exists in `docs/IMPLEMENTATION_PLAN.md` with each topic addressed in 1–2 paragraphs and a clear "not in scope for this takehome" framing.

---

## Cross-cutting notes
- No new npm dependencies are introduced in Phases 1–4. If Phase 2 reorder feels limiting without `@dnd-kit`, that's a separate proposal to flag and justify before adding.
- Keep CSS via custom properties in `app/globals.css` — no Tailwind, no CSS modules (per project constraint).
- All new `Slide` fields are optional and read defensively from localStorage (per CLAUDE.md guidance).
- `npm run typecheck` and `npm run build` must pass at the end of every phase.
