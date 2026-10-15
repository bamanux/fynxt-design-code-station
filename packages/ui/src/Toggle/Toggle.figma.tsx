import figma from "@figma/code-connect";
import { Toggle } from "./Toggle";

// FDS-101 Toggle component set (DCF-0002: Active status in the Score Builder list).
figma.connect(Toggle, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=53-49", {
  props: { checked: figma.enum("On", { On: true, Off: false }), disabled: figma.enum("Disabled", { Yes: true, No: false }) },
  example: ({ checked, disabled }) => <Toggle checked={checked} disabled={disabled} label="Active" hideLabel onChange={() => {}} />,
});
