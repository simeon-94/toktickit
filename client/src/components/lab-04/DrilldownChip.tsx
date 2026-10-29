import "./dashboard.css";

interface Props {
  label: string;
  total: number | null;
  onClear: () => void;
}

// Shows which dashboard card a list was opened from and its total, so the card value can be
// compared with the list (L4-BR-21).
function DrilldownChip({ label, total, onClear }: Props) {
  return (
    <div className="l4-drilldown" data-testid="drilldown-filter" role="status">
      <span>
        From dashboard: <strong>{label}</strong>
      </span>
      {total !== null && (
        <span>
          · <span data-testid="drilldown-total">{total}</span> {total === 1 ? "ticket" : "tickets"}
        </span>
      )}
      <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={onClear} data-testid="drilldown-clear">
        Clear filter
      </button>
    </div>
  );
}

export default DrilldownChip;
