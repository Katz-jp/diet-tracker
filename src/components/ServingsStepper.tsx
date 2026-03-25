import { decServingsQuarter, formatServingsLabel, incServingsQuarter } from '@/lib/servingsInput';

type Props = {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  hint?: string;
};

export function ServingsStepper({ id, label, value, onChange, min = 0.25, max = 100, hint }: Props) {
  const labelId = `${id}-label`;
  return (
    <div className="field">
      <span id={labelId}>{label}</span>
      <div
        className="row"
        role="group"
        aria-labelledby={labelId}
        style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'nowrap', marginTop: '0.35rem' }}
      >
        <button
          type="button"
          className="btn"
          style={{ minWidth: '2.75rem', padding: '0.5rem', flexShrink: 0 }}
          onClick={() => onChange(decServingsQuarter(value, min))}
          aria-label="0.25減らす"
        >
          −
        </button>
        <span
          id={id}
          aria-live="polite"
          style={{
            flex: '1 1 auto',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '1.1rem',
            padding: '0.5rem 0.25rem',
            minWidth: '3rem',
          }}
        >
          {formatServingsLabel(value)}
        </span>
        <button
          type="button"
          className="btn"
          style={{ minWidth: '2.75rem', padding: '0.5rem', flexShrink: 0 }}
          onClick={() => onChange(incServingsQuarter(value, max))}
          aria-label="0.25増やす"
        >
          +
        </button>
      </div>
      {hint ? (
        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
