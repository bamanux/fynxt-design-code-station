import figma from "@figma/code-connect";
import { EntityChip } from "./EntityChip";

figma.connect(EntityChip, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=361-2", {
  props: { label: figma.string("Label"), icon: figma.instance("Icon") },
  example: ({ label, icon }) => <EntityChip label={label} icon={icon} onOpen={() => {}} />,
});
