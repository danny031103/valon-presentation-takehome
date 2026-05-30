# AI Intelligence Plan

This plan adds a context-aware AI layer to Valon Presentations — transforming it from a slide-by-slide image generator into a tool that can build entire decks from a brief, informed by real documents the user provides.

Phases 1–4 of the original implementation plan are complete. This plan picks up from that stable foundation.

---

## The two workflows this enables

**Workflow A — "Build it for me"**
User has context documents and a clear brief. They upload docs, describe their presentation, and the AI generates a complete deck — titles, body copy, and images for every slide. User refines from there.

**Workflow B — "Help me as I go"**
User builds slides manually and uses AI generation per-slide as a creative tool, optionally backed by document context to keep outputs relevant.

The app supports both. Users choose at deck creation time.

---

## New deck screen (entry point)

Replaces the current behavior of loading straight into the editor with an empty deck. Appears when:
- localStorage has no existing deck, OR
- User explicitly clicks "New deck" (to be added to EditorTopBar)

Two paths:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Start blank          Build with AI                │
│   ────────────         ─────────────                │
│   Empty deck           Drop context + describe      │
│   Start editing        AI generates your deck       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

"Start blank" → existing editor behavior, empty deck.
"Build with AI" → shows the AI deck builder UI (Change 3).

---

## Change 1 — Document context panel

**What it does:**
Lets users upload reference documents that inform all AI generation in the deck. Context is deck-level — it applies to every slide.

**Files:**
- `app/hooks/useDocumentExtract.ts` (new) — shared extraction logic for PDF/TXT parsing. Used by both `ContextPanel` and `DeckBuilder` — no variant props, no shared UI.
- `app/components/ContextPanel.tsx` (new) — collapsible panel in the sidebar, below the slide list. Uses `useDocumentExtract`.
- `app/hooks/useDeck.ts` — add `context: { text: string; fileName: string } | null` to deck state, persisted to localStorage
- `app/globals.css` — context panel styles

**Supported file types:**
- PDF — text extracted client-side via `pdfjs-dist`
- TXT — read via FileReader

**Behavior:**
- Drop zone or click-to-browse file picker
- Extracted text truncated to **30KB before storing** to leave headroom for `imageData` in localStorage. The existing quota `try/catch` guard (added in Phase 2) covers the failure case if storage is still exceeded.
- "Context active" badge visible in sidebar when context is loaded
- "Clear context" button to remove it
- Context further truncated to ~8000 chars before being sent to any API (storage cap and API cap are separate limits)

**New dependency:** `pdfjs-dist` — justify: no server-side PDF processing needed, widely used, tree-shakeable.

**Acceptance criteria:**
- User can upload a PDF or TXT and see its filename + character count in the panel
- "Context active" indicator appears in sidebar
- Context persists across reloads
- Clearing context removes it from state and localStorage
- Extracted text is capped at 30KB at storage time; files producing more than 30KB of text show a truncation warning

---

## Change 2 — Context-aware image generation

**What it does:**
When context is loaded, the image generation API uses it to produce outputs relevant to the user's actual content rather than generic imagery.

**Files:**
- `app/api/generate/route.ts` — accept `context?: string` in request body; append a condensed context note to the effective prompt server-side
- `app/hooks/useDeck.ts` — pass `context: context?.text` in the `/api/generate` fetch body

**Server-side prompt construction:**
```
{user prompt}

{style fragment}

Context from user's documents (use this to inform the visual):
{context — truncated to ~2000 chars}
```

**Acceptance criteria:**
- When context is loaded, generated images reflect the subject matter of the uploaded documents
- When no context, behavior is identical to current

---

## Change 3 — "Build with AI" deck builder UI

**What it does:**
A focused UI for users who want to generate a full deck upfront. Shown when user selects "Build with AI" from the new deck screen.

**Files:**
- `app/components/NewDeckScreen.tsx` (new) — **conditional render at root level** (not a portal or modal). Replaces the editor in the render tree when no deck exists. Shown when localStorage has no existing deck, or when user explicitly clicks "New deck" in `EditorTopBar`.
- `app/components/DeckBuilder.tsx` (new) — the "Build with AI" form. Uses `useDocumentExtract` directly for its document upload field — separate UI from `ContextPanel`, shared extraction logic only.
- `app/globals.css` — new deck screen and deck builder styles

**DeckBuilder form fields:**
- Document upload (uses `useDocumentExtract` hook — separate UI from `ContextPanel`)
- Deck brief textarea ("What is this presentation about? Who is the audience?")
- Slide count selector: 3 / 5 / 7 / 10
- Style selector (reuses existing ImageStyle options)
- "Generate deck" primary button

**Acceptance criteria:**
- New deck screen renders at root level (not over the editor) when no deck exists
- "Start blank" goes directly to the editor
- "Build with AI" shows the DeckBuilder form
- Form validates: brief is required, slide count is selected
- Submitting the form triggers Change 4 (plan generation)

---

## Change 4 — `/api/plan` route

**What it does:**
Calls Claude to generate a structured deck plan from the user's brief and context documents.

**Prerequisite:** `ANTHROPIC_API_KEY` must be set in `.env.local` (add to `.env.example` before implementing this change). The route must return a clear `{ error: "ANTHROPIC_API_KEY is not configured" }` with status 500 if the key is absent — no silent failures.

**File:** `app/api/plan/route.ts` (new)

**Request body:**
```ts
{
  brief: string;
  context?: string;
  slideCount: number;
  style: string;
}
```

**Implementation:**
- Calls `claude-sonnet-4-6` via the Anthropic SDK (`@anthropic-ai/sdk`)
- System prompt instructs Claude to return only valid JSON, no preamble
- User prompt: brief + context + slide count + style

**Claude prompt structure:**
```
You are a presentation designer. Generate a deck plan as JSON only.

Brief: {brief}
Slide count: {slideCount}
Style: {style}
{context ? `Reference material:\n${context}` : ""}

Return ONLY valid JSON in this exact shape:
{
  "deckTitle": "string",
  "slides": [
    {
      "name": "string",
      "title": "string", 
      "body": "string",
      "imagePrompt": "string",
      "layout": "full-bleed" | "image-text" | "title" | "text-only"
    }
  ]
}

Rules:
- imagePrompt should be vivid and specific, written for an image generation model
- layout should match the slide content (title slide → "title", data/text heavy → "text-only", etc.)
- body should be concise bullet points, not paragraphs
- Do not include any text outside the JSON object
```

**Response:** `{ plan: DeckPlan }` or `{ error: string }`

**Acceptance criteria:**
- Route accepts POST, returns valid JSON plan
- Handles Claude API errors gracefully
- Returns an error if brief is missing
- Plan shape matches the TypeScript type expected by Change 5

---

## Change 5 — Deck generation execution

**What it does:**
Client receives the plan from `/api/plan`, creates slides from it, then fires image generation for each slide sequentially. User sees progress in real time.

**Files:**
- `app/hooks/useDeck.ts` — add `generateDeck(plan: DeckPlan)` action
- `app/components/DeckBuilder.tsx` — handle submit → call `/api/plan` → call `generateDeck`
- `app/components/GenerationProgress.tsx` (new) — progress overlay shown during generation
- `app/globals.css` — progress overlay styles

**`generateDeck` behavior:**
1. Replace current deck with slides from the plan (with confirmation if deck is non-empty)
2. Set `deckTitle` from plan
3. Show progress overlay: "Generating slide 2 of 5…"
4. For each slide, call `generateSlide()` sequentially (not parallel — avoids rate limits)
5. On completion, dismiss progress overlay, land in editor

**Progress overlay:**
```
┌─────────────────────────────┐
│  Building your deck         │
│                             │
│  Generating slide 2 of 5…  │
│  ████████░░░░░░░░░░  40%   │
│                             │
│  [Cancel]                   │
└─────────────────────────────┘
```

Cancel stops generation mid-way and lands in the editor with whatever slides were completed.

**Acceptance criteria:**
- Full deck generates from a brief in one action
- Progress is visible and accurate
- Cancel works at any point
- Completed slides have correct title, body, layout, and generated image
- Deck title is set from the plan
- User lands in the editor when complete

---

## Implementation order

1. Change 1 — Context panel (foundation everything else builds on)
2. Change 3 — New deck screen + DeckBuilder UI (no API yet, just the form)
3. Change 4 — `/api/plan` route (wire up the form)
4. Change 5 — Deck generation execution (the wow moment)
5. Change 2 — Context-aware image generation (quick win once context exists)

---

## New dependencies

| Package | Reason | Size |
|---------|--------|------|
| `pdfjs-dist` | Client-side PDF text extraction | ~300KB gzip |

**New environment variable:** `ANTHROPIC_API_KEY` — required for Change 4 (`/api/plan`). Add to `.env.example` before implementing Change 4. All other changes use existing dependencies (existing Google AI SDK).

---

## Cross-cutting notes

- Context text must be truncated before any API call — use a ~8000 char limit for deck generation, ~2000 char limit for per-slide image generation
- Sequential image generation (not parallel) to avoid Google AI rate limits
- All new Slide fields remain optional and read defensively from localStorage
- `npm run typecheck` and `npm run build` must pass after each change
- The new deck screen must not appear if there is an existing deck in localStorage — never interrupt an active session

---

## Future state (document only)

- **Real-time collaboration** on deck generation — multiple users refining the AI output simultaneously
- **Iterative deck refinement** — "make slide 3 more data-focused" after initial generation
- **Multi-modal context** — images, charts, and spreadsheets as context, not just text
- **Presentation coach** — AI reviews the completed deck and suggests improvements to flow, consistency, and messaging