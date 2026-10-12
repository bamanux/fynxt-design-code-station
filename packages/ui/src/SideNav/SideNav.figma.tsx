import figma from "@figma/code-connect";
import { SideNav } from "./SideNav";

// DCF-0001 candidate component in the FDI work file (not yet in FDS-101).
figma.connect(SideNav, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=21-3687", {
  props: { collapsed: figma.enum("Nav", { Expanded: false, Collapsed: true }) },
  example: ({ collapsed }) => <SideNav items={[]} activeId="" collapsed={collapsed} onCollapsedChange={() => {}} logo="Tenant logo" logoMark="T" />,
});
