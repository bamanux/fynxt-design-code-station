import figma from "@figma/code-connect";
import { SearchField } from "./SearchField";

figma.connect(SearchField, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=432-22033", {
  props: { disabled: figma.enum("State", { Disabled: true }) },
  example: ({ disabled }) => <SearchField label="Search" value="" onChange={() => {}} disabled={disabled} />,
});
