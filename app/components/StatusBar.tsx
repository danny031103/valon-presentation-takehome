import { useEffect, useState } from "react";

type StatusBarProps = {
  message: string;
  saving: boolean;
  lastSavedAt: Date | null;
};

function useTick(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function saveLabel(saving: boolean, lastSavedAt: Date | null): string {
  if (saving) return "Saving…";
  if (!lastSavedAt) return "";
  const elapsed = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
  if (elapsed < 5) return "Saved";
  if (elapsed < 60) return `Saved ${elapsed}s ago`;
  return `Saved ${Math.floor(elapsed / 60)}m ago`;
}

export function StatusBar({ message, saving, lastSavedAt }: StatusBarProps) {
  useTick(!!lastSavedAt);
  const label = saveLabel(saving, lastSavedAt);

  return (
    <div className="status-bar">
      <span className="status-message">{message}</span>
      {label && (
        <span className="save-indicator">
          <span className={`save-dot${saving ? " save-dot--saving" : ""}`} />
          {label}
        </span>
      )}
    </div>
  );
}
