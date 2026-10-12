import figma from "@figma/code-connect";
import { Select, TextArea, TextField } from "./Field";

const status = figma.enum("State", { Error: "error", "Error focus": "error", Success: "success", Info: "info" });

figma.connect(TextField, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=46-621", {
  props: { status, disabled: figma.enum("State", { Disabled: true }), readOnly: figma.enum("State", { "Read-only": true }) },
  example: ({ status, disabled, readOnly }) => (
    <TextField label="Label" placeholder="Enter Text" helperText="Helper text" status={status} disabled={disabled} readOnly={readOnly} />
  ),
});

figma.connect(TextArea, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=51-73", {
  props: { status, disabled: figma.enum("State", { Disabled: true }) },
  example: ({ status, disabled }) => <TextArea label="Label" placeholder="Enter description" status={status} disabled={disabled} />,
});

figma.connect(Select, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=50-81", {
  props: { status, disabled: figma.enum("State", { Disabled: true }) },
  example: ({ status, disabled }) => <Select label="Label" options={[]} placeholder="Select" status={status} disabled={disabled} />,
});
