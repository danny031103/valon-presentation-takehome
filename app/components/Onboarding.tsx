"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "valon-onboarding-dismissed";

const TIPS = [
  {
    heading: "Upload context for better images",
    body: "Drop a PDF or document into the Context panel in the sidebar. The AI uses it to generate images relevant to your actual content — not generic stock imagery."
  },
  {
    heading: "Write scenes, not topics",
    body: "Specific prompts produce better images.",
    before: "A house",
    after: "A welcoming suburban home at golden hour with warm interior lighting"
  },
  {
    heading: "Edit and Generate are separate modes",
    body: "Use the toggle in the top bar to switch between Edit mode (text, layouts, formatting) and Generate mode (AI image prompts). You can use both on the same slide."
  }
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
              <p className="tip-heading">{tip.heading}</p>
              {tip.body && <p className="onboarding-sub">{tip.body}</p>}
              {tip.before && (
                <div className="tip-example">
                  <span className="tip-label">Before</span>
                  <p className="tip-before">{tip.before}</p>
                </div>
              )}
              {tip.after && (
                <div className="tip-example">
                  <span className="tip-label">After</span>
                  <p className="tip-after">{tip.after}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="loud-button" onClick={dismiss} type="button">
          Got it
        </button>
      </div>
    </div>
  );
}
