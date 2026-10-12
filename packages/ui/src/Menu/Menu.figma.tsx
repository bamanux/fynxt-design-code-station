import figma from "@figma/code-connect";
import { Menu } from "./Menu";

figma.connect(Menu, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=345-67", {
  example: () => (
    <Menu
      label="Actions"
      items={[
        { id: "1", label: "Option 1", onSelect: () => {} },
        { id: "2", label: "Option 2", onSelect: () => {} },
      ]}
      renderTrigger={(p) => (
        <button type="button" {...p}>
          Open
        </button>
      )}
    />
  ),
});
