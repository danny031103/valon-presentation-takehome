"use client";

import { useState } from "react";
import type { DeckPlan, ImageStyle } from "../hooks/useDeck";
import { DeckBuilder } from "./DeckBuilder";

type NewDeckScreenProps = {
  onStartBlank: () => void;
  defaultStyle: ImageStyle;
  onGenerateDeck: (plan: DeckPlan, style: ImageStyle) => void;
};

export function NewDeckScreen({ onStartBlank, defaultStyle, onGenerateDeck }: NewDeckScreenProps) {
  const [view, setView] = useState<"choice" | "builder">("choice");

  if (view === "builder") {
    return (
      <DeckBuilder
        defaultStyle={defaultStyle}
        onBack={() => setView("choice")}
        onGenerateDeck={onGenerateDeck}
      />
    );
  }

  return (
    <div className="new-deck-screen">
      <div className="new-deck-inner">
        <h1 className="new-deck-heading">New deck</h1>
        <p className="new-deck-sub">How would you like to start?</p>

        <div className="new-deck-choices">
          <button
            className="choice-card"
            onClick={onStartBlank}
            type="button"
          >
            <span className="choice-card-title">Start blank</span>
            <span className="choice-card-desc">
              Empty deck. Start editing right away.
            </span>
          </button>

          <button
            className="choice-card choice-card--ai"
            onClick={() => setView("builder")}
            type="button"
          >
            <span className="choice-card-title">Build with AI</span>
            <span className="choice-card-desc">
              Drop context docs and describe your deck. AI generates the slides.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
