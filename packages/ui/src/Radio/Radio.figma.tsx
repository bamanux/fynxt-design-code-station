import figma from "@figma/code-connect";
import { Radio } from "./Radio";

// DCF-0003
figma.connect(Radio, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=55-83", {
  props: {
    label: figma.string("Radio label"),
    checked: figma.enum("State", { Selected: true, "Disabled selected": true }),
    disabled: figma.enum("State", { Disabled: true, "Disabled selected": true }),
  },
  example: ({ label, checked, disabled }) => <Radio name="group" value="option" label={label} defaultChecked={checked} disabled={disabled} />,
});
