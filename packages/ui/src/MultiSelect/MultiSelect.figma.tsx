import figma from "@figma/code-connect";
import { MultiSelect } from "./MultiSelect";

figma.connect(MultiSelect, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=57-87", {
  example: () => <MultiSelect label="Assign To" options={[]} value={[]} onChange={() => {}} />,
});

figma.connect(MultiSelect, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=56-85", {
  props: { required: figma.boolean("required"), disabled: figma.enum("State", { Disabled: true }) },
  example: ({ required, disabled }) => <MultiSelect label="Tags" options={[]} value={[]} onChange={() => {}} required={required} disabled={disabled} />,
});
