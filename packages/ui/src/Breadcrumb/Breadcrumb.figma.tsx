import figma from "@figma/code-connect";
import { Breadcrumb } from "./Breadcrumb";

// DCF-0003
figma.connect(Breadcrumb, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=73-14", {
  props: { c1: figma.string("Crumb 1"), c2: figma.string("Crumb 2"), current: figma.string("Current") },
  example: ({ c1, c2, current }) => <Breadcrumb items={[{ label: c1, href: "#" }, { label: c2, href: "#" }, { label: current }]} />,
});
