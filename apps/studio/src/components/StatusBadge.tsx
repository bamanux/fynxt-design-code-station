import { Badge } from "@fynxt/ui";
import type { CaseStatus } from "../../shared/types";
import { statusInfo } from "../lib/status";

export function StatusBadge({ status }: { status: CaseStatus }) {
  const info = statusInfo(status);
  return (
    <Badge status={info.badge} tone={info.solid ? "solid" : "soft"} title={status}>
      {info.label}
    </Badge>
  );
}
