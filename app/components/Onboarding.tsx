"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "valon-onboarding-dismissed";

const TIPS = [
  {
    num: "01",
    heading: "Upload context for better images",
    body: "Drop a PDF into the Context panel. The AI uses it to generate images tied to your actual content — not stock imagery.",
  },
  {
    num: "02",
    heading: "Write scenes, not topics",
    body: "Specific prompts produce sharper images.",
    before: "A house",
    after: "A welcoming home at golden hour",
  },
  {
    num: "03",
    heading: "Edit and Generate are separate modes",
    body: "Toggle in the top bar — Edit for text and layout, Generate for AI image prompts. Use both on the same slide.",
  },
];

export function Onboarding() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="onboarding-backdrop" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="onboarding-card">
        <button
          aria-label="Close"
          className="onboarding-close"
          onClick={dismiss}
          type="button"
        >
          ×
        </button>

        <div>
          <h2 className="onboarding-heading">A few things worth knowing</h2>
        </div>

        <div className="onboarding-tips">
          {TIPS.map((tip) => (
            <div className="tip-card" key={tip.heading}>
              <span className="tip-num">{tip.num}</span>
              <p className="tip-heading">{tip.heading}</p>
              {tip.body && <p className="onboarding-sub">{tip.body}</p>}
              {tip.before && tip.after && (
                <div className="tip-inline-comparison">
                  <span className="tip-inline-before">{tip.before}</span>
                  <span className="tip-inline-arrow">→</span>
                  <span className="tip-inline-after">{tip.after}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="onboarding-footer">
          <button className="loud-button" onClick={dismiss} type="button">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
