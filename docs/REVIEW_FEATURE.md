# Review My Deck — Implementation Plan

## Files to create
1. `app/api/review/route.ts` — POST handler, calls Claude, returns structured JSON
2. `app/components/ReviewPanel.tsx` — slide-in panel, loading/error/data states

## Files to modify
3. `app/components/EditorTopBar.tsx` — add `onReview` prop + overflow menu item
4. `app/hooks/useDeck.ts` — add `imageDescription?: string` to `Slide` type; store
   Gemini text response as `imageDescription` on successful generation in both
   `generateSlide()` and `generateDeck()`; include in review payload; add
   `reviewDeck()` async function, return from hook
5. `app/page.tsx` — add `review` state, pass `onReview`, render `<ReviewPanel>`
6. `app/globals.css` — panel slide-in transition, score colors, slide-review cards

## API contract

**Request** `POST /api/review`
```json
{ "deckTitle": "string", "slides": [{ "name", "title", "body", "prompt", "note", "layout", "imageDescription?" }] }
```

**Response** `200`
```json
{
  "review": {
    "overall": "string",
    "score": 7,
    "strengths": ["..."],
    "improvements": ["..."],
    "visualCohesion": "string",
    "slideReviews": [{ "index": 0, "name": "...", "rating": "good|okay|weak", "feedback": "...", "suggestion": "..." | null }]
  }
}
```

## State shape (page.tsx)
```ts
type ReviewState = { loading: true } | { loading: false; error: string } | { loading: false; data: DeckReview };
const [review, setReview] = useState<ReviewState | null>(null);
```

## Visual coherence strategy
- Gemini returns a text description alongside every generated image (`payload.text`),
  stored as `imageDescription` on the `Slide` type
- `reviewDeck()` includes `imageDescription` in the payload for each slide when present
- Claude's system prompt instructs it to evaluate visual coherence when image
  descriptions are available, and omit `visualCohesion` when none are provided
- The review panel shows a "Visual Cohesion" section only when `visualCohesion`
  is present in the response

## Order of implementation
1. Verify Gemini `text` output is returned from `/api/generate` and store it
   as `imageDescription` on `Slide` in `useDeck.ts` (both `generateSlide()` and
   `generateDeck()`)
2. API route (`/api/review`)
3. CSS additions
4. ReviewPanel component
5. EditorTopBar prop + menu item
6. useDeck `reviewDeck()`
7. page.tsx wiring

## Key constraints
- No new npm deps
- All design tokens from existing CSS vars
- Panel width 380px, slides in from right via `transform: translateX(100%)` → `translateX(0)`
- Score color: ≥8 → `--success`, 5–7 → `--brand`, ≤4 → `--danger`
- Follows same JSON-extraction pattern as `/api/plan` (regex match on `{...}`)
