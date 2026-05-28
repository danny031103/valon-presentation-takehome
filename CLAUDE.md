# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start local dev server (http://localhost:3000)
npm run build      # Production build
npm run typecheck  # TypeScript type check (no emit)
```

No test suite exists in this repo.

## Environment

Requires a `.env.local` file (copy from `.env.example`):
```
GOOGLE_API_KEY=your_key_here
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview  # optional
```

API key is server-side only — never expose it client-side.

## What this project is

A browser-based AI presentation builder. Users describe slides in natural 
language, Gemini generates an image per slide, and the deck exports as .pptx. 
The starter was intentionally built with a joke aesthetic and minimal UX. 
The goal is to evolve it into a professional, product-quality tool modeled 
after Valon's existing product design (see docs/DESIGN_REFERENCE.md).

## Architecture

**`app/page.tsx`** — entire client app in one component. Owns all state.
Persists to localStorage under `valon-presentation-takehome-v2`.

> ⚠️ Do not add further logic to page.tsx. Propose a component split first.

**`app/api/generate/route.ts`** — calls `@google/genai` for image generation.
Contains a hardcoded `HOUSE_STYLE_APPENDIX` that enforces the bad aesthetic —
this will be replaced by dynamic style injection.

**`app/api/export/route.ts`** — assembles `.pptx` via `pptxgenjs`.

**`app/globals.css`** — all styling via CSS custom properties (`--bg`, 
`--paper`, `--ink`, `--accent`, `--accent-2`, `--edge`). No Tailwind, 
no CSS modules. Keep it this way.

## Key types

```ts
type SlideStatus = "idle" | "working" | "done" | "error";

type Slide = {
  id: string;
  name: string;
  prompt: string;
  imageData?: string;
  status: SlideStatus;
  note: string;
  feedback?: string;
};
```

> When adding fields to Slide, use optional fields — existing localStorage 
> data won't have them. Handle missing values defensively.

## Constraints

- No database — localStorage only
- No new npm dependencies without flagging and justification first
- Work is phased — see docs/IMPLEMENTATION_PLAN.md. Confirm active phase 
  before starting. Do not jump ahead.