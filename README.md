# valon-presentation-takehome

`valon-presentation-takehome` is a small, public starter project for a Valon take-home. It is intentionally a working starting point rather than a finished product: the app can create slides, call Google's image generation model for slide art, and export the result as a `.pptx`, but there is plenty of room to improve the product, UX, and overall quality.

The expected workflow is simple:

1. Fork this repo into your own GitHub account.
2. Run it locally.
3. Use your preferred AI-native workflow and your own judgment to evolve it.
4. Share your fork back with us.

## What the app does

- Keeps a tiny slide deck in local browser storage.
- Shows a left-hand slide rail and a main slide canvas.
- Lets you add and remove slides.
- Sends prompts to Google's image model and places the returned image onto a slide.
- Exports the current deck as a PowerPoint file.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Add a Google AI API key to `.env.local`:

   ```bash
   GOOGLE_API_KEY=your_key_here
   GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

   `GOOGLE_IMAGE_MODEL` is optional. The default is `gemini-3-pro-image-preview`.

4. Start the local dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Notes

- This app stores deck state in the browser. There is no database.
- The Google API key is used only on the server route inside the app.
- Hosting and deployment are out of scope for the exercise.
- If you prefer to work with tools like Claude Code, Codex, Gemini CLI, or similar, do that in your own fork.

## Suggested focus

Treat this repo like a rough product seed. The goal is not to preserve the starter exactly as-is; it is to turn it into something stronger with better product sense, better interface decisions, and better implementation choices.

## What I built

This fork significantly extends the starter. Key additions:

- **AI deck generation** — guided setup flow (purpose, audience, style) that uses Claude to plan a full deck and Gemini to generate images for every slide
- **Document context** — upload PDFs or text files to ground image generation in your actual content
- **8 slide layouts** — full-bleed, image+text, text+image, title, text-only, image-top, image-bottom, big-quote
- **Slide editor** — text editing with formatting toolbar (bold, italic, font size, color, alignment), per-field formatting for title and body
- **AI deck review** — Claude reviews your deck as a presentation consultant with per-slide feedback and auto-apply suggestions
- **Prompt enhancement** — Claude rewrites rough prompts into vivid scene descriptions before sending to Gemini
- **Cross-session learning** — app learns your style preferences and successful prompt patterns across sessions
- **Presentation mode** — fullscreen presentation with keyboard navigation
- **PDF export** — browser-native PDF export alongside PPTX
- **Image cropping** — pan/zoom crop modal when uploading images
- **Undo/redo, drag-to-reorder, duplicate slides, JSON export/import**

## New environment variables

This fork requires:
- `ANTHROPIC_API_KEY` — used for deck planning, review, prompt enhancement, and suggestion application