import figma from "@figma/code-connect";
import { OutlineRow } from "./OutlineRow";

// DCF-0002 candidate component in the FDI work file (not yet in FDS-101).
figma.connect(OutlineRow, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=80-18985", {
  props: {
    name: figma.string("Name"),
    meta: figma.string("Weight"),
    override: figma.boolean("Override"),
    selected: figma.enum("State", { Selected: true }),
    status: figma.enum("Status", { Complete: "complete", Incomplete: "incomplete" }),
  },
  example: ({ name, meta, override, selected, status }) => <OutlineRow name={name} meta={meta} override={override} selected={selected} status={status} onSelect={() => {}} />,
});
