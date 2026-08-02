export function ChoiceCard({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-5 py-4 text-left transition-all ${
        selected
          ? "border-accent bg-accent-tint"
          : "border-border-soft hover:border-accent/50 hover:-translate-y-0.5"
      }`}
    >
      <p className="font-semibold">{label}</p>
      {hint && <p className="text-sm text-ink-muted mt-0.5">{hint}</p>}
    </button>
  );
}
