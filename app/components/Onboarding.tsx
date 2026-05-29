"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "valon-onboarding-dismissed";

const TIPS = [
  {
    heading: "Add context and mood",
    before: "A house",
    after:
      "A welcoming suburban home at golden hour with warm interior lighting — for an opening homeownership slide"
  },
  {
    heading: "Describe layout and data",
    before: "Interest rates",
    after:
      "A minimal line chart showing mortgage rates falling from 7% to 5% over 12 months, white background, single teal accent line"
  },
  {
    heading: "Match your layout choice",
    before: "Our team",
    after:
      "Four professionals collaborating in a bright modern office, candid editorial style — pair with the Image + Text layout"
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
          <h2 className="onboarding-heading">Welcome to Valon Presentations</h2>
          <p className="onboarding-sub">Describe what you want — Gemini generates the image.</p>
        </div>

        <div className="onboarding-tips">
          {TIPS.map((tip) => (
            <div className="tip-card" key={tip.heading}>
              <p className="tip-heading">{tip.heading}</p>
              <div className="tip-example">
                <span className="tip-label">Before</span>
                <p className="tip-before">{tip.before}</p>
              </div>
              <div className="tip-example">
                <span className="tip-label">After</span>
                <p className="tip-after">{tip.after}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="loud-button" onClick={dismiss} type="button">
          Get started →
        </button>
      </div>
    </div>
  );
}
