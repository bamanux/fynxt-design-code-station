export interface SpinnerProps {
  /** Accessible label. Omit when the spinner sits inside an element that already announces busy state. */
  label?: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <span
      className="fx-spinner"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
