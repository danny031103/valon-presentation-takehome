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
 
## Phase 2 — Core Functionality ✅ Complete
 
**Goal:** Transform slides from simple image containers into fully editable documents — with a formatting toolbar, slide layout templates, an edit/AI mode toggle, text editing, reordering, undo, duplication, file naming, and image upload.

> **Status:** Complete. All sub-phases 2a–2i shipped: edit/AI mode toggle, four layout templates (with export support), formatting toolbar, editable title/body text, drag-to-reorder, undo stack (`Cmd/Ctrl+Z` + button), custom export filename, slide duplication, and local image import. `npm run typecheck` passes.
>
> **Deviation from plan:** 2i added a `try/catch` guard around the localStorage save (beyond the original spec) — a large imported image can exceed the storage quota, so the app now warns instead of crashing.
 
### 2a — Edit mode vs AI mode toggle
The central product insight: the bottom panel switches between two modes via a toggle in `EditorTopBar.tsx`.
- **Edit mode** — formatting toolbar visible, prompt panel hidden. Default for slides that already have content.
- **AI mode** — prompt panel visible, formatting toolbar hidden. Default for empty slides.
- Add `editorMode: "edit" | "ai"` to deck-level state in `useDeck.ts`. Persist to localStorage. Toggle renders as a two-segment control in `EditorTopBar.tsx` (e.g. "Edit / Generate"). **(S)**
### 2b — Slide layout templates
Four layouts selectable per slide, stored as `layout?: "title" | "image-text" | "text-only" | "full-bleed"` on the `Slide` type (optional, defaults to `"full-bleed"` for backward compatibility with existing slides).
- **Title** — large centered display text, no image background.
- **Image + Text** — image fills left half, text panel on the right.
- **Text Only** — no image, clean text-focused slide.
- **Full Bleed** — image fills the slide, text overlaid (current behavior).
- Layout picker renders as a small icon strip in `SlideCanvas.tsx` or `EditorTopBar.tsx` when in edit mode. **(M)**
- `app/api/export/route.ts` — honor layout when composing the `.pptx` slide. **(M)**
### 2c — Formatting toolbar
New `app/components/Toolbar.tsx`. Visible in edit mode only. No new dependencies — pure CSS + JS.
- **Bold / Italic** — toggle buttons, apply to selected text element on slide.
- **Font size** — four options: S / M / L / XL (maps to e.g. 14px / 18px / 24px / 36px).
- **Text color** — color picker constrained to the brand palette (foreground, brand, brand-soft, white, danger, success) plus a free-pick option.
- **Alignment** — left / center / right.
- Formatting state stored as `formatting?: { bold?: boolean; italic?: boolean; fontSize?: "S"|"M"|"L"|"XL"; color?: string; align?: "left"|"center"|"right" }` on the `Slide` type (optional, handled defensively for existing localStorage data). **(M)**
- `app/api/export/route.ts` — apply formatting when writing text via `pptxgenjs`. **(S)**
### 2d — Slide text fields
- Extend `Slide` type with optional `title?: string` and `body?: string`.
- Render editable title + body fields in `SlideCanvas.tsx`, positioned according to the active layout. Persist via existing `patchSlide`. Default to empty strings for existing slides. **(M)**
- `app/api/export/route.ts` — write title and body text using `pptxgenjs.addText` with the new fonts. **(S)**
### 2e — Slide reorder
- Native HTML5 drag-and-drop on `SlideThumbnail` in `Sidebar.tsx` (no new dependency). Reorder the `slides` array in state. **(M)**
### 2f — Undo
- History stack in `useDeck.ts` (push snapshot on every state mutation, cap at 50 entries). `Cmd/Ctrl+Z` keybinding + visible "Undo" button in `EditorTopBar.tsx`. **(M)**
### 2g — Export filename
- Replace hardcoded filename. Add deck-level `deckTitle` state (defaults to "Untitled deck"). On export, show inline rename input → pass to API → API uses it in `Content-Disposition` and `anchor.download`. **(S)**
### 2h — Duplicate slide
- "Duplicate" action on each slide thumbnail. Deep-copies slide with a new `id`, inserts after original, selects it. **(S)**
### 2i — Local image import
- "Upload image" button in `PromptPanel.tsx` (visible in AI mode) and `SlideCanvas.tsx` (visible in edit mode for image-supporting layouts). Opens file picker, reads as base64 via `FileReader`, sets `imageData` and `status: "done"`. Validates type (`image/*`) and warns over ~4MB. **(M)**
### Acceptance criteria
- Edit/AI mode toggle is visible in the top bar and correctly shows/hides the toolbar vs prompt panel.
- All four slide layouts render correctly on the canvas and round-trip through export.
- Formatting toolbar applies bold, italic, font size, color, and alignment to slide text.
- Each slide has editable title and body text that round-trip through export with formatting applied.
- Slides can be reordered by drag in the sidebar; order persists.
- `Cmd/Ctrl+Z` undoes the last mutation (add, delete, rename, prompt edit, reorder, duplicate, format change).
- Exporting prompts for a filename and the downloaded file matches.
- Duplicating a slide produces an independent copy whose edits don't affect the original.
- A local image file can be uploaded and appears on the slide without calling the API.
- `npm run typecheck` and `npm run build` pass.
---
 
## Phase 3 — AI Quality ✅ Complete

**Goal:** Replace the hardcoded chaotic style with user-controlled style/tone and model selection; make loading and error states honest and actionable.

> **Status:** Complete. Removed `HOUSE_STYLE_APPENDIX` and replaced it with a named style system (6 options: professional, minimal, editorial, illustrative, photographic, none); added Style and Model dropdowns to `PromptPanel.tsx` (AI mode only); both persisted to localStorage via `useDeck`. Added an animated `--brand-soft` shimmer skeleton on the canvas while `status === "working"` with a progress hint. Added an inline error card overlay with four categorised error types (api-key, quota, safety, generic) and a Retry button where applicable. Added a one-time onboarding modal on first load with three before/after prompt examples, dismissed via `valon-onboarding-dismissed` localStorage key.
>
> **Deviation from plan:** Model list ships with "Default model" + "Gemini 3 Pro Image" + "Gemini 2.0 Flash (faster)" — Imagen 3 was removed because it uses a different API endpoint incompatible with `generateContent`. Per-slide style override was omitted (deck-level only) as none of the acceptance criteria required it.

### Changes
- **Remove `HOUSE_STYLE_APPENDIX`** from `app/api/generate/route.ts`. Accept a `style` field on the request body and map it to a named prompt fragment (`professional`, `minimal`, `editorial`, `illustrative`, `photographic`, `none`). Append the chosen fragment server-side. **(M)**
- **Style selector UI** — Dropdown in `PromptPanel.tsx` (AI mode only, deck-level default in `useDeck.ts`, with per-slide override). Persist to localStorage. Send `style` in the `/api/generate` request body. **(S)**
- **Model selector** — Dropdown in `PromptPanel.tsx` (AI mode only) for `GOOGLE_IMAGE_MODEL` choices. Pass `model` in the request body; `app/api/generate/route.ts` falls back to env var, then default. **(S)**
- **Loading states** — Skeleton on canvas while `status === "working"`, progress hint ("Generating image — usually 10–20s"), disabled Generate button. Use `--brand-soft` token. **(S)**
- **Error state + retry** — When `status === "error"`, render inline error card on canvas with server message and a "Retry" button. Surface API key / quota / safety errors distinctly. **(M)**
- **Onboarding** — On first load (no localStorage entry), show a one-time dismissible modal with 3 tips including before/after prompt examples. Stored under `valon-onboarding-dismissed` localStorage key. **(S)**
### Acceptance criteria
- Generated images no longer default to chaotic style; default style is `professional`.
- Changing the style dropdown visibly changes generated output.
- Changing the model dropdown reaches the API and is reflected in the request.
- Style and model selectors are only visible in AI mode.
- Error responses surface inline with a working Retry button.
- Loading skeleton and helpful copy appear while waiting.
- First-time visitors see onboarding with prompt examples; returning visitors do not.
---
 
## Phase 4 — Persistence ✅ Complete
 
**Goal:** Make saving visible, and let users move decks between machines via JSON backup.
 
### Changes
- **Auto-save indicator** — In `useDeck.ts`, track `lastSavedAt` after each `localStorage.setItem`. Render in `StatusBar.tsx`: "Saved" / "Saving…" / "Saved 3s ago" with a subtle `--success` dot. **(S)**
- **JSON export** — Add "Export deck JSON" in `EditorTopBar.tsx` overflow menu. Serializes `{ slides, deckTitle, editorMode, version }` and triggers download. Pure client-side, no API. **(S)**
- **JSON import** — Add "Import deck JSON" with file picker. Validates `version` and shape, replaces (or merges, with confirmation) current deck. Show a confirm dialog before overwriting non-empty state. **(M)**
### Acceptance criteria
- Every edit causes the save indicator to briefly show "Saving…" then "Saved".
- Exporting JSON produces a file that, when re-imported in a fresh browser/profile, reproduces the deck including layouts, formatting, and text.
- Import refuses malformed files with a clear inline error and does not clobber state.
---
 
## Phase 5 — Future State (Documentation Only)
 
**Goal:** Document directions that are out of scope today but should not be re-discovered later. No code.
 
### Changes
- **Sharing & collaboration** — Per-deck share link, read-only vs comment vs edit access. Requires server-side persistence and auth (e.g. Clerk/Auth.js). Current localStorage-only architecture blocks this entirely; would require a full backend migration first.
- **Rich text editing** — Full contentEditable or a lightweight rich-text library (e.g. Tiptap) for inline text editing directly on the slide canvas, rather than the sidebar-panel approach used in Phase 2. Would enable selecting and formatting individual words rather than the whole text block.
- **Template library** — Pre-built deck templates (pitch deck, product demo, quarterly review) with coordinated layouts, color schemes, and placeholder content. Would require a template schema and a template picker UI at deck creation time.
- **AI deck generation** — "Generate entire deck from a brief" — user describes the deck topic and audience, AI generates slide titles, body copy, and image prompts for all slides at once. Would use a text model (e.g. Gemini Pro) in a new `/api/plan` route, then fan out to `/api/generate` per slide.
- **Presenter mode** — Full-screen presentation view with keyboard navigation, speaker notes visible on a second display, and a timer. Pure client-side, no backend required.
- **Video export** — Remotion or server-side ffmpeg compositing slide images with transitions and optional TTS narration from speaker notes. Significant dependency, hosting, and cost implications.
- **Database** — Postgres (deck, slide, asset tables) with object storage for images and an auth layer. Migration path: dual-write localStorage + DB, then read-through, then drop local.
- **Team workspaces** — Multi-user decks, commenting, version history. Requires database + real-time sync (e.g. Liveblocks or PartyKit).
### Acceptance criteria
- Section exists in `docs/IMPLEMENTATION_PLAN.md` with each topic addressed in 1–2 paragraphs and a clear "not in scope for this takehome" framing.
---
 
## Cross-cutting notes
- No new npm dependencies without flagging and justification first. If Phase 2 drag-and-drop feels limiting without `@dnd-kit`, that is a separate proposal.
- Keep CSS via custom properties in `app/globals.css` — no Tailwind, no CSS modules.
- All new `Slide` fields are optional and read defensively from localStorage (per CLAUDE.md guidance).
- `editorMode` state introduced in Phase 2a must be respected by Phase 3 — style/model selectors only appear in AI mode.
- `npm run typecheck` and `npm run build` must pass at the end of every phase.