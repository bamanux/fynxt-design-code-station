import { Badge, Spinner } from "@fynxt/ui";
import { useEffect, useRef, useState } from "react";
import type { RunEvent, RunSummary } from "../../shared/types";
import { streamRun } from "../lib/api";
import { formatTime } from "../lib/status";

const KIND: Record<RunEvent["kind"], "neutral" | "info" | "success" | "error" | "primary"> = {
  status: "neutral",
  text: "primary",
  tool: "info",
  result: "success",
  error: "error",
};

export function RunLog({ run, onEnd }: { run: RunSummary; onEnd?: () => void }) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [live, setLive] = useState(run.state === "running");
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    setEvents([]);
    return streamRun(
      run.id,
      (e) => setEvents((prev) => [...prev, e]),
      () => {
        setLive(false);
        endRef.current?.();
      }
    );
  }, [run.id]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="runlog">
      <div className="runlog__head">
        {live ? <Spinner label="FDI is working" /> : null}
        <span>{live ? "FDI is working…" : "Run log"}</span>
      </div>
      <ol ref={listRef} className="runlog__list" aria-live="polite" aria-relevant="additions">
        {events.map((e, i) => (
          <li key={i} className="runlog__item" data-kind={e.kind}>
            <time className="runlog__time">{formatTime(e.at)}</time>
            <Badge status={KIND[e.kind]}>{e.kind}</Badge>
            <span className="runlog__text">{e.text}</span>
          </li>
        ))}
        {events.length === 0 && <li className="muted">Waiting for events…</li>}
      </ol>
    </div>
  );
}
