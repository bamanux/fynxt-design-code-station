import { Check } from "lucide-react";

export interface StepperProps {
  steps: string[];
  /** Zero-based index of the current step. */
  current: number;
  label?: string;
}

/**
 * Stepper (DCF-0002 candidate Stepper Step 43:6900, used by DCF-0003 D1): numbered circles with labels
 * and connectors. Completed = brand + check, Active = brand + number, Upcoming = muted.
 */
export function Stepper({ steps, current, label = "Progress" }: StepperProps) {
  return (
    <ol className="fx-stepper" aria-label={label}>
      {steps.map((step, i) => {
        const state = i < current ? "completed" : i === current ? "active" : "upcoming";
        return (
          <li key={step} className="fx-stepper__step" data-state={state} aria-current={state === "active" ? "step" : undefined}>
            <span className="fx-stepper__marker" aria-hidden="true">
              {state === "completed" ? <Check className="fx-stepper__check" /> : i + 1}
            </span>
            <span className="fx-stepper__label">
              {step}
              {state === "completed" && <span className="fx-visually-hidden"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
