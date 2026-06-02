import { type ReactElement, useState } from "react";

import type { SlideLayout } from "../hooks/useDeck";

type LayoutPickerProps = {
  layout: SlideLayout;
  onChange: (layout: SlideLayout) => void;
};

const PRIMARY_OPTIONS: { value: SlideLayout; label: string; icon: ReactElement }[] = [
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

const MORE_OPTIONS: { value: SlideLayout; label: string; icon: ReactElement }[] = [
  {
    value: "text-image",
    label: "Text + Image",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <line className="line" x1="3" y1="5" x2="11" y2="5" />
        <line className="line" x1="3" y1="8" x2="11" y2="8" />
        <line className="line" x1="3" y1="11" x2="8" y2="11" />
        <rect className="fill" x="12" y="1" width="11" height="14" />
      </svg>
    )
  },
  {
    value: "image-top",
    label: "Image Top",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <rect className="fill" x="1" y="1" width="22" height="8.5" />
        <line className="line" x1="4" y1="12" x2="20" y2="12" />
        <line className="line" x1="4" y1="14" x2="14" y2="14" />
      </svg>
    )
  },
  {
    value: "image-bottom",
    label: "Image Bottom",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <line className="line" x1="4" y1="4" x2="20" y2="4" />
        <line className="line" x1="4" y1="6.5" x2="14" y2="6.5" />
        <rect className="fill" x="1" y="8.5" width="22" height="6.5" />
      </svg>
    )
  },
  {
    value: "big-quote",
    label: "Big Quote",
    icon: (
      <svg viewBox="0 0 24 16" aria-hidden="true">
        <rect className="frame" x="1" y="1" width="22" height="14" rx="1.5" />
        <rect className="fill" x="4" y="6" width="16" height="4" rx="0.5" />
      </svg>
    )
  }
];

export function LayoutPicker({ layout, onChange }: LayoutPickerProps) {
  const [showMore, setShowMore] = useState(false);
  const isMoreLayout = MORE_OPTIONS.some((o) => o.value === layout);

  return (
    <div className="layout-picker" role="group" aria-label="Slide layout">
      <span className="layout-picker-label">Layout</span>
      {PRIMARY_OPTIONS.map((option) => (
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
      {showMore && MORE_OPTIONS.map((option) => (
        <button
          key={option.value}
          aria-label={option.label}
          aria-pressed={layout === option.value}
          className={layout === option.value ? "active" : ""}
          onClick={() => { onChange(option.value); setShowMore(false); }}
          title={option.label}
          type="button"
        >
          {option.icon}
        </button>
      ))}
      <button
        aria-label={showMore ? "Show fewer layouts" : "More layouts"}
        aria-pressed={isMoreLayout}
        className={`layout-picker-more${isMoreLayout ? " active" : ""}`}
        onClick={() => setShowMore((v) => !v)}
        title={showMore ? "Collapse" : "More layouts"}
        type="button"
      >
        {showMore ? "‹" : "···"}
      </button>
    </div>
  );
}
