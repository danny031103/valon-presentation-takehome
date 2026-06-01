"use client";

import { useEffect, useState } from "react";
import type { DeckReview } from "../hooks/useDeck";

export type ReviewState =
  | { loading: true }
  | { loading: false; error: string }
  | { loading: false; data: DeckReview };

type Props = {
  state: ReviewState;
  onClose: () => void;
};

function scoreClass(score: number) {
  if (score >= 8) return "review-score-chip--high";
  if (score >= 5) return "review-score-chip--mid";
  return "review-score-chip--low";
}

export function ReviewPanel({ state, onClose }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`review-panel${open ? " open" : ""}`}
      role="complementary"
      aria-label="Deck review"
    >
      <div className="review-panel-header">
        <h2 className="review-panel-title">Deck Review</h2>
        <button
          aria-label="Close review"
          className="review-panel-close"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>

      {state.loading ? (
        <div className="review-panel-body">
          <div className="review-loading">
            <div className="review-loading-spinner" />
            <span>Reviewing your deck…</span>
          </div>
        </div>
      ) : "error" in state ? (
        <div className="review-panel-body">
          <p className="review-error">{state.error}</p>
        </div>
      ) : (
        <div className="review-panel-body">
          <div className="review-score-row">
            <div className={`review-score-chip ${scoreClass(state.data.score)}`}>
              {state.data.score}
            </div>
            <p className="review-overall">{state.data.overall}</p>
          </div>

          <div>
            <p className="review-section-title">Strengths</p>
            <ul className="review-list">
              {state.data.strengths.map((s, i) => (
                <li key={i}>
                  <span className="review-list-icon">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="review-section-title">Improvements</p>
            <ul className="review-list">
              {state.data.improvements.map((s, i) => (
                <li key={i}>
                  <span className="review-list-icon">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {state.data.visualCohesion && (
            <div>
              <p className="review-section-title">Visual Cohesion</p>
              <p className="review-visual-body">{state.data.visualCohesion}</p>
            </div>
          )}

          <div>
            <p className="review-section-title">Slide by slide</p>
            <div className="review-slides">
              {state.data.slideReviews.map((sr) => (
                <div className="review-slide-card" key={sr.index}>
                  <div className="review-slide-card-header">
                    <p className="review-slide-name">
                      {sr.name || `Slide ${sr.index + 1}`}
                    </p>
                    <span className={`review-rating-badge review-rating-badge--${sr.rating}`}>
                      {sr.rating}
                    </span>
                  </div>
                  <p className="review-slide-feedback">{sr.feedback}</p>
                  {sr.suggestion && (
                    <p className="review-slide-suggestion">{sr.suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
