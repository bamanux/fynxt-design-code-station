import figma from "@figma/code-connect";
import { SegmentedControl } from "./SegmentedControl";

const LOGIC = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
];

// FDS-101 Button Group (Connected). DCF-0002 uses it as the Logic Switch (work file 72:17580) and Scoring method switch.
figma.connect(SegmentedControl, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=108-30", {
  example: () => <SegmentedControl label="Join attributes with" options={LOGIC} value="and" onChange={() => {}} />,
});
figma.connect(SegmentedControl, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=72-17580", {
  props: { value: figma.enum("Value", { AND: "and", OR: "or", Unset: "unset" }) },
  example: ({ value }) => <SegmentedControl size="sm" label="Join attributes with" options={LOGIC} value={value === "unset" ? null : String(value)} onChange={() => {}} />,
});
