import figma from "@figma/code-connect";
import { ActivityCard } from "./ActivityCard";

figma.connect(ActivityCard, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=361-134", {
  props: {
    title: figma.string("Title"),
    expanded: figma.enum("Density", { Expanded: true, Compact: false }),
  },
  example: ({ title, expanded }) => <ActivityCard title={title} expanded={expanded} onExpandedChange={() => {}} />,
});
