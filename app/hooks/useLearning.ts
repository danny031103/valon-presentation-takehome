import type { ImageStyle } from "./useDeck";

const STORAGE_KEY = "valon-learned-preferences";

const STOP_WORDS = new Set([
  "about", "their", "which", "would", "could", "should", "there", "where",
  "these", "those", "image", "photo", "slide", "presentation", "with", "that",
  "this", "from", "have", "been", "will", "were", "they", "them", "then",
  "than", "when", "what", "just", "into", "like", "some", "very", "also"
]);

type LearnedPreferences = {
  styleCounts: Partial<Record<ImageStyle, number>>;
  successfulKeywords: string[];
  rejectedKeywords: string[];
  totalGenerations: number;
  lastUpdated: number;
};

function empty(): LearnedPreferences {
  return {
    styleCounts: {},
    successfulKeywords: [],
    rejectedKeywords: [],
    totalGenerations: 0,
    lastUpdated: 0
  };
}

function load(): LearnedPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<LearnedPreferences>;
    return {
      styleCounts: parsed.styleCounts ?? {},
      successfulKeywords: Array.isArray(parsed.successfulKeywords) ? parsed.successfulKeywords : [],
      rejectedKeywords: Array.isArray(parsed.rejectedKeywords) ? parsed.rejectedKeywords : [],
      totalGenerations: typeof parsed.totalGenerations === "number" ? parsed.totalGenerations : 0,
      lastUpdated: typeof parsed.lastUpdated === "number" ? parsed.lastUpdated : 0
    };
  } catch {
    return empty();
  }
}

function save(prefs: LearnedPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, lastUpdated: Date.now() }));
  } catch {
    // QuotaExceededError — silently skip
  }
}

function extractKeywords(prompt: string): string[] {
  return [...new Set(
    prompt
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z]/g, ""))
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w))
  )];
}

export function learnFromSuccess(prompt: string, style: ImageStyle): void {
  const prefs = load();
  const keywords = extractKeywords(prompt);
  const existing = new Set(prefs.successfulKeywords);
  const fresh = keywords.filter((k) => !existing.has(k));
  prefs.successfulKeywords = [...fresh, ...prefs.successfulKeywords].slice(0, 30);
  prefs.styleCounts[style] = (prefs.styleCounts[style] ?? 0) + 1;
  prefs.totalGenerations += 1;
  save(prefs);
}

export function learnFromRejection(prompt: string): void {
  const prefs = load();
  const keywords = extractKeywords(prompt);
  const existing = new Set(prefs.rejectedKeywords);
  const fresh = keywords.filter((k) => !existing.has(k));
  prefs.rejectedKeywords = [...fresh, ...prefs.rejectedKeywords].slice(0, 20);
  save(prefs);
}

export function getPreferences(): string | null {
  const prefs = load();
  const parts: string[] = [];

  const styleEntries = Object.entries(prefs.styleCounts) as [ImageStyle, number][];
  if (styleEntries.length > 0) {
    const topStyle = styleEntries.sort((a, b) => b[1] - a[1])[0][0];
    parts.push(`tends toward ${topStyle} visuals`);
  }

  if (prefs.successfulKeywords.length > 0) {
    parts.push(`successful visual themes: ${prefs.successfulKeywords.slice(0, 5).join(", ")}`);
  }

  if (prefs.rejectedKeywords.length > 0) {
    parts.push(`avoid: ${prefs.rejectedKeywords.slice(0, 3).join(", ")}`);
  }

  if (parts.length === 0) return null;
  return `User preferences: ${parts.join(". ")}.`;
}

export function getLearnedStyle(): ImageStyle | null {
  const prefs = load();
  const entries = Object.entries(prefs.styleCounts) as [ImageStyle, number][];
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function resetLearning(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
