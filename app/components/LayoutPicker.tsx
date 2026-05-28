import type { ReactElement } from "react";

import type { SlideLayout } from "../hooks/useDeck";

type LayoutPickerProps = {
  layout: SlideLayout;
  onChange: (layout: SlideLayout) => void;
};

const OPTIONS: { value: SlideLayout; label: string; icon: ReactElement }[] = [
  {
    value: "title",
    label: "Title",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <rect className="fill" x="6" y="6.5" width="12" height="3" rx="0.5" />
      </svg>
    )
  },
  {
    value: "image-text",
    label: "Image + Text",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <rect className="fill" x="1" y="1" width="11" height="14" />
        <line className="line" x1="14" y1="5" x2="21" y2="5" />
        <line className="line" x1="14" y1="8" x2="21" y2="8" />
        <line className="line" x1="14" y1="11" x2="19" y2="11" />
      </svg>
    )
  },
  {
    value: "text-only",
    label: "Text Only",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <line className="line" x1="5" y1="5" x2="19" y2="5" />
        <line className="line" x1="5" y1="8" x2="19" y2="8" />
        <line className="line" x1="5" y1="11" x2="14" y2="11" />
      </svg>
    )
  },
  {
    value: "full-bleed",
    label: "Full Bleed",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="fill" x="1" y="1" width="22" height="14" rx="1.5" />
      </svg>
    )
  }
];

export function LayoutPicker({ layout, onChange }: LayoutPickerProps) {
  return (
    <div className="layout-picker" role="group" aria-label="Slide layout">
      <span className="layout-picker-label">Layout</span>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          aria-label={option.label}
          aria-pressed={layout === option.value}
          className={layout === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
          title={option.label}
          type="button"
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
