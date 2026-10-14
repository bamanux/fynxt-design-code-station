import figma from "@figma/code-connect";
import { Checkbox } from "./Checkbox";

// DCF-0003
figma.connect(Checkbox, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=54-104", {
  props: {
    label: figma.string("Label"),
    checked: figma.enum("State", { Checked: true, "Disabled checked": true }),
    indeterminate: figma.enum("State", { Indeterminate: true }),
    disabled: figma.enum("State", { Disabled: true, "Disabled checked": true }),
  },
  example: ({ label, checked, indeterminate, disabled }) => <Checkbox label={label} defaultChecked={checked} indeterminate={indeterminate} disabled={disabled} />,
});
