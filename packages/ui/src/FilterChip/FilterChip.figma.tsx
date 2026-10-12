import figma from "@figma/code-connect";
import { FilterChip } from "./FilterChip";

figma.connect(FilterChip, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=432-22480", {
  props: { applied: figma.enum("Property 1", { Active: true }) },
  example: ({ applied }) => <FilterChip label="Status" value={applied ? "Active" : undefined} />,
});
