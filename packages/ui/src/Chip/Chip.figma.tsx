import figma from "@figma/code-connect";
import { Chip } from "./Chip";

figma.connect(Chip, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=93-212", {
  variant: { Type: "Input" },
  props: {
    label: figma.string("Label"),
    disabled: figma.enum("State", { Disabled: true }),
    removable: figma.boolean("Removable"),
  },
  example: ({ label, disabled, removable }) => <Chip label={label} disabled={disabled} onRemove={removable ? () => {} : undefined} />,
});
