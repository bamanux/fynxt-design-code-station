import figma from "@figma/code-connect";
import { StatCard } from "./StatCard";

figma.connect(StatCard, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=359-54", {
  props: { label: figma.string("Label"), value: figma.string("Value"), caption: figma.string("Caption") },
  example: ({ label, value, caption }) => <StatCard label={label} value={value} caption={caption} />,
});
