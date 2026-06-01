# Improvement Loop — Implementation Plan

Four features that work together to make generation smarter and more transparent.
All share the same `Slide` data model. No new npm dependencies required.

---

## Shared Data Model Changes (`app/hooks/useDeck.ts`)

New optional fields added to the `Slide` type. All are optional so existing
localStorage data is handled without migration.

```ts
type PromptHistoryEntry = {
  prompt: string;
  imageData: string;
  timestamp: number;
  kept: boolean; // true if this is the current imageData
};

type Slide = {
  // ... existing fields unchanged ...
  regenerationCount?: number;      // Feature 2
  promptHistory?: PromptHistoryEntry[]; // Feature 3
  userRating?: "up" | "down" | null;   // Feature 4
};
```

`PromptHistoryEntry` is exported alongside the other types.

---

## Implementation Order

**F1 → F2 → F3 → F4**

Rationale: F1 (enhance route) is fully self-contained. F2 (auto-improve) is a
small change to `generateSlide()` and is best done before F3 so history entries
capture the enriched prompts. F3 (history) builds on the same `generateSlide()`
call site. F4 (ratings) is purely additive UI with no logic dependencies.

---

## Feature 1 — Claude Prompt Enhancement

### Summary
"Enhance" button sends the user's rough prompt to Claude Sonnet, which rewrites
it into a vivid, visually specific scene description before Gemini receives it.
The enhanced version replaces the textarea content so the user can review and
edit it. A one-click undo restores the original.

### File-by-file changes

**`app/api/enhance/route.ts`** — new file
- `POST` handler; accepts `{ prompt, style, deckTitle?, slideTitle? }`
- Reads `ANTHROPIC_API_KEY` from env; returns 500 if missing
- Calls `claude-sonnet-4-6` (Messages API, `max_tokens: 300`)
- System prompt: "You are an expert at writing prompts for AI image generation.
  Rewrite the user's rough prompt into a vivid, specific scene description that
  will produce a high-quality presentation slide image. Keep it under 100 words.
  Return only the enhanced prompt, no explanation."
- User message includes `style`, `deckTitle`, and `slideTitle` as context
- Returns `{ enhancedPrompt: string }` or `{ error: string }`

**`app/components/PromptPanel.tsx`** — modified
- Add local state: `enhancing: boolean`, `preEnhancePrompt: string | null`
- Add "Enhance" button to the right of the `field-label` row (next to the
  existing expand button); disabled while `enhancing` or `status === "working"`
- On click: store current prompt in `preEnhancePrompt`, call `/api/enhance`,
  replace textarea with `enhancedPrompt` via `onChange`
- Show a small "Undo enhance" text link below textarea when `preEnhancePrompt`
  is set; clicking it calls `onChange(preEnhancePrompt)` and clears the state
- Clear `preEnhancePrompt` when the user manually edits the textarea

**`app/components/PromptPanel.tsx` — props addition**
- Accept `deckTitle?: string` and `slideTitle?: string` to pass to the enhance
  call for richer context

**`app/page.tsx`** — modified
- Pass `deckTitle` and `selectedSlide?.name` as `slideTitle` to `PromptPanel`

---

## Feature 2 — Auto-improve on Repeated Regeneration

### Summary
`regenerationCount` tracks how many times a slide has been re-generated.
The prompt modifier escalates automatically so later attempts try genuinely
different approaches rather than repeating the same output.

### Modifier schedule
| Count | Modifier injected |
|-------|-------------------|
| 0–1   | *(normal prompt, no injection)* |
| 2     | "Try a noticeably different composition from the last version." *(already present for "again" mode — now keyed to count instead)* |
| 3     | "The previous two attempts were not satisfactory. Try a completely different visual style, angle, and composition. Be more creative and unexpected." |
| 4+    | "Multiple attempts have not worked. Dramatically reimagine this prompt. Try abstract, minimal, or conceptual interpretations." |

### File-by-file changes

**`app/hooks/useDeck.ts`** — modified
- Add `regenerationCount?: number` to `Slide` type
- In `generateSlide()`:
  - Read `selectedSlide.regenerationCount ?? 0` before the fetch
  - Select modifier string based on count (table above)
  - Append modifier to the prompt sent to Gemini instead of the hardcoded
    "Try a noticeably different composition" string (the "again" branch is
    superseded by this logic)
  - On successful generation: `applyPatch(id, { regenerationCount: (count + 1) })`
  - On error: do not increment (failed attempt doesn't count)
- In `patchSlide()`: if the patch includes `prompt`, also set
  `regenerationCount: 0` in the same patch so editing the prompt resets the
  counter

---

## Feature 3 — Prompt History Per Slide

### Summary
Every successful generation pushes the prior `prompt + imageData` into
`promptHistory` (capped at 5). A collapsible "History" section in the Generate
panel shows thumbnails; clicking one restores that state to the slide.

### File-by-file changes

**`app/hooks/useDeck.ts`** — modified
- Export `PromptHistoryEntry` type alongside existing types
- Add `promptHistory?: PromptHistoryEntry[]` to `Slide` type
- In `generateSlide()`, on successful generation:
  - If `selectedSlide.imageData` exists (i.e., there was a previous image),
    build a `PromptHistoryEntry` from the current `prompt` + `imageData` +
    `Date.now()` with `kept: false`
  - Prepend to `promptHistory`, cap at 5 entries (drop from tail)
  - Mark any previous entry where `imageData === payload.imageData` as
    `kept: true` (no-op in practice; kept for future use)
  - Include `promptHistory` in the `applyPatch` call alongside `imageData`

**`app/components/PromptPanel.tsx`** — modified
- Accept `promptHistory?: PromptHistoryEntry[]` and
  `onRestoreHistory: (entry: PromptHistoryEntry) => void` as props
- Add a collapsible "History" section below the prompt textarea (hidden by
  default, toggled by a small "History (N)" link; only rendered when
  `promptHistory?.length > 0`)
- Render up to 5 thumbnails in a horizontal strip:
  - `<img>` 56×40 px, same style as `.prompt-reference-thumb`
  - Tooltip / title showing relative time ("3 mins ago") computed from
    `entry.timestamp`
- Clicking a thumbnail calls `onRestoreHistory(entry)`

**`app/page.tsx`** — modified
- Pass `promptHistory={selectedSlide?.promptHistory}` to `PromptPanel`
- Implement `onRestoreHistory`: calls `patchSlide(id, { imageData: entry.imageData, prompt: entry.prompt, status: "done" })`

**`app/globals.css`** — modified
- Add styles for `.prompt-history` strip and thumbnail row (reuses existing
  `.prompt-reference-thumb` sizing)

---

## Feature 4 — User Ratings Per Slide

### Summary
Thumbs up / down buttons appear below the canvas (Generate mode, when an image
exists). Rating stored on the slide. Sidebar thumbnails show a subtle colored
dot. Review API receives rating context so Claude knows which slides are
satisfactory vs need work.

### File-by-file changes

**`app/hooks/useDeck.ts`** — modified
- Add `userRating?: "up" | "down" | null` to `Slide` type
- No logic changes needed — `patchSlide` handles writes

**`app/components/SlideCanvas.tsx`** — modified
- `SlideCanvasProps` gains `userRating?: "up" | "down" | null` and
  `onRating?: (rating: "up" | "down" | null) => void`
- When `slide.imageData` exists and `editorMode === "ai"`, render a small
  `.canvas-rating` row (absolutely positioned, bottom-left corner of
  `.canvas-wrap`, above the floating chip)
- Two icon buttons (👍 / 👎), active state highlighted when rating matches
- Clicking an already-active rating sets it to `null` (toggle off)

**`app/components/Sidebar.tsx`** — modified
- In the slide thumbnail, when `slide.userRating === "up"` render a small
  green dot (`.thumb-rating-dot.up`); when `"down"` a red dot (`.thumb-rating-dot.down`)
- Dot positioned top-left corner of `.thumb-art`, absolutely

**`app/hooks/useDeck.ts` → `reviewDeck()`** — modified
- Include `userRating` in the per-slide payload sent to `/api/review` so the
  review prompt has signal about which slides the user already approves of

**`app/globals.css`** — modified
- `.canvas-rating`: absolute, bottom-left, small flex row of icon buttons
- `.canvas-rating-btn`: small quiet button, active state for selected rating
- `.thumb-rating-dot`: 7px circle, absolute top-left of `.thumb-art`; `.up` green, `.down` danger color

---

## Summary Table

| Feature | New files | Modified files |
|---------|-----------|----------------|
| F1 Enhance | `app/api/enhance/route.ts` | `PromptPanel.tsx`, `page.tsx` |
| F2 Auto-improve | — | `useDeck.ts` |
| F3 History | — | `useDeck.ts`, `PromptPanel.tsx`, `page.tsx`, `globals.css` |
| F4 Ratings | — | `useDeck.ts`, `SlideCanvas.tsx`, `Sidebar.tsx`, `globals.css` |
