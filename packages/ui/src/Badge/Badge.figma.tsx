import figma from "@figma/code-connect";
import { Badge } from "./Badge";

figma.connect(Badge, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=64-39", {
  props: {
    status: figma.enum("Status", { Neutral: "neutral", Primary: "primary", Success: "success", Warning: "warning", Error: "error", Info: "info" }),
    tone: figma.enum("Style", { Soft: "soft", Solid: "solid" }),
  },
  example: ({ status, tone }) => <Badge status={status} tone={tone}>Label</Badge>,
});
