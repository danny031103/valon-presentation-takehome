# Cross-Session Learning Plan

Adds a lightweight preference memory layer that persists across deck resets and browser sessions. The system passively observes user ratings and regeneration behavior to build a personal style + keyword profile, then uses that profile to bias Claude's prompt enhancement and the app's default style selection.

---

## Storage

**Key:** `valon-learned-preferences` (separate from `valon-presentation-takehome-v2`)

This key is intentionally isolated so it survives `startOver()`, `startBlankDeck()`, and new deck creation — the whole point is cross-deck persistence.

**Shape:**
```ts
type LearnedPreferences = {
  styleCounts: Partial<Record<ImageStyle, number>>;
  successfulKeywords: string[];   // capped at 30, oldest dropped first
  rejectedKeywords: string[];     // capped at 20, oldest dropped first
  totalGenerations: number;
  lastUpdated: number;            // Unix ms timestamp
};
```

`stylePreference` is derived on read as the key with the highest count in `styleCounts` — no need to store it separately.

---

## 1. `app/hooks/useLearning.ts` (new file)

Owns all read/write for `valon-learned-preferences`. No React state needed — all mutations write directly to localStorage and return the updated value synchronously.

**Exported functions:**

### `learnFromSuccess(prompt: string, style: ImageStyle): void`
- Extract keywords from `prompt`: split on whitespace, lowercase, filter `length > 4`, remove a hardcoded stop-word list (`["about", "their", "which", "would", "could", "should", "there", "where", "these", "those", "image", "photo", "slide", "presentation"]`), deduplicate against existing `successfulKeywords`
- Prepend new keywords to `successfulKeywords`, slice to 30
- Increment `styleCounts[style]` by 1
- Increment `totalGenerations`
- Write back to localStorage with updated `lastUpdated`

### `learnFromRejection(prompt: string): void`
- Same keyword extraction, deduplicate against existing `rejectedKeywords`
- Prepend new keywords to `rejectedKeywords`, slice to 20
- Does **not** affect `styleCounts` or `totalGenerations`
- Write back to localStorage

### `getPreferences(): string | null`
- Returns `null` if no preferences exist yet (nothing to inject)
- Otherwise returns a compact summary string:
  ```
  User preferences: tends toward [top style] visuals. Successful visual themes: [top 5 successful keywords]. Avoid: [top 3 rejected keywords].
  ```
- Omits any section where the underlying list is empty

### `getLearnedStyle(): ImageStyle | null`
- Returns the `ImageStyle` with the highest count in `styleCounts`, or `null` if none recorded
- Used at app load to seed `imageStyle` default

### `resetLearning(): void`
- Removes `valon-learned-preferences` from localStorage

All functions are safe to call with no prior data — if the key is missing or malformed, they treat the starting state as empty and write fresh.

---

## 2. `app/hooks/useDeck.ts` (modifications)

**Import:** `import { learnFromSuccess, learnFromRejection, getLearnedStyle } from "./useLearning";`

**On app load** (inside the localStorage `useEffect`):
- After loading `imageStyle` from saved deck data, check `getLearnedStyle()`
- If the saved deck had no explicit `imageStyle` entry (i.e. the key was absent from the persisted JSON), fall back to `getLearnedStyle()` as the default
- If the deck data had an explicit style, use it as-is — don't override a deliberate per-deck choice

**In `patchSlide()`:**
- When `patch.userRating === "up"`: call `learnFromSuccess(slide.prompt, imageStyle)` using the current slide's prompt (looked up by `id` from `slides`)
- When `patch.userRating === "down"`: call `learnFromRejection(slide.prompt)`
- These calls happen before `applyPatch` so the slide data is still accessible

**In `generateSlide()`:**
- When `count >= 3` (the threshold for the "dramatically reimagine" modifier): call `learnFromRejection(selectedSlide.prompt)`
- This fires once at the 3rd attempt, not on every subsequent attempt — guard with `count === 3` not `count >= 3`

**No other changes to `useDeck.ts`.**

---

## 3. `app/api/enhance/route.ts` (modification)

**Request body:** add optional `preferences?: string`

**System prompt modification:** when `preferences` is present and non-empty, append to the system prompt:
```
Additional context about this user's preferences: {preferences}. Use this to inform the enhanced prompt but don't explicitly mention these preferences in the output.
```

---

## 4. `app/components/PromptPanel.tsx` (modifications)

**Import:** `import { getPreferences } from "../hooks/useLearning";`

**In `handleEnhance()`:** call `getPreferences()` and include the result as `preferences` in the fetch body:
```ts
body: JSON.stringify({ prompt, style: imageStyle, deckTitle, slideTitle, preferences: getPreferences() ?? undefined })
```

**"Personalized" indicator:** below the prompt textarea (above "Undo enhance"), render a small muted line when `getPreferences() !== null`:
```
✓ Personalized
```
Styled with the same `.field-label` opacity treatment — barely visible, non-interactive.

---

## 5. `app/components/EditorTopBar.tsx` (modification)

Add "Reset learned preferences" to the overflow menu, separated by a divider from other items. Calls `resetLearning()`. No confirmation dialog — the action is low-stakes (preferences rebuild naturally with use) and the overflow menu is already a deliberately-accessed control.

**Prop addition:** `onResetLearning?: () => void` — passed down from `page.tsx`.

**In `page.tsx`:** import `resetLearning` from `useLearning` and pass it as `onResetLearning` to `EditorTopBar`.

---

## Data flow summary

```
User gives 👍         → learnFromSuccess(prompt, style)   → successfulKeywords, styleCounts updated
User gives 👎         → learnFromRejection(prompt)        → rejectedKeywords updated
3rd regeneration      → learnFromRejection(prompt)        → rejectedKeywords updated

User clicks enhance   → getPreferences() injected into /api/enhance call
                      → Claude uses preferences to bias the enhanced prompt

App loads new deck    → getLearnedStyle() used as imageStyle default (if no saved style)
```

---

## Edge cases

| Scenario | Behavior |
|---|---|
| Malformed localStorage | Caught in try/catch, silently resets to empty preferences |
| User rates up then down on same slide | Both `learnFromSuccess` and `learnFromRejection` fire; net effect: keyword appears in both lists (rejected takes precedence in Claude's system prompt since it's listed as "Avoid") |
| `getPreferences()` returns null | Enhance call omits `preferences` field; route ignores absent field |
| Style preference ties | `getLearnedStyle()` picks the first tied style in iteration order — deterministic enough for this use case |
| User clears learned preferences mid-session | Next enhance call sends `null` preferences; `getLearnedStyle()` returns null; existing deck `imageStyle` is unaffected |

---

## What this does NOT do

- No server-side storage — all data stays in the browser
- No per-slide learning on images the user never rated (passive observation only)
- No keyword weighting by recency — simple prepend + cap is sufficient for this scale
- No UI to view or edit the learned keyword lists — `resetLearning()` is the only management tool
