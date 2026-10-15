import figma from "@figma/code-connect";
import { SideNav } from "./SideNav";

// DCF-0001 candidate component in the FDI work file (not yet in FDS-101). Mode axis added by DCF-0002 (D8 / D13 / D14).
figma.connect(SideNav, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=21-3687", {
  props: {
    collapsed: figma.enum("Nav", { Expanded: false, Collapsed: true }),
    mode: figma.enum("Mode", { Main: "main", Settings: "settings" }),
  },
  example: ({ collapsed, mode }) => (
    <SideNav
      items={[]}
      activeId=""
      collapsed={collapsed}
      onCollapsedChange={() => {}}
      logo="Tenant logo"
      logoMark="T"
      mode={mode}
      settings={{ label: "Settings", icon: null, items: [], searchPlaceholder: "Search settings" }}
      user={{ name: "John Doe", meta: "ID: 100245 · Admin" }}
    />
  ),
});
