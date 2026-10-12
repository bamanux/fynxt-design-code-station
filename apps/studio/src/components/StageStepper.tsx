import { Check } from "lucide-react";
import type { CaseStatus } from "../../shared/types";
import { STAGES, statusInfo } from "../lib/status";

export function StageStepper({ status }: { status: CaseStatus }) {
  const current = STAGES.findIndex((s) => s.id === statusInfo(status).stage);
  const done = status === "PUBLISHED";
  return (
    <ol className="stepper" aria-label="Progress">
      {STAGES.map((stage, i) => {
        const state = done || i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={stage.id} className="stepper__step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="stepper__dot" aria-hidden="true">
              {state === "done" ? <Check /> : i + 1}
            </span>
            <span className="stepper__label">
              {stage.label}
              <span className="fx-visually-hidden">{state === "done" ? " (complete)" : state === "current" ? " (current)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
