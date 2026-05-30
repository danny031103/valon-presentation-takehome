"use client";

type GenerationProgressProps = {
  current: number;
  total: number;
  onCancel: () => void;
};

export function GenerationProgress({
  current,
  total,
  onCancel
}: GenerationProgressProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="generation-overlay" role="dialog" aria-modal="true" aria-label="Generating deck">
      <div className="generation-card">
        <p className="generation-heading">Building your deck</p>
        <p className="generation-status">
          Generating slide {current} of {total}…
        </p>
        <div className="generation-bar-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="generation-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="generation-percent">{percent}%</p>
        <button className="ghost-button generation-cancel" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
