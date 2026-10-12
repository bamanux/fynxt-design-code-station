import figma from "@figma/code-connect";
import { EmptyState } from "./EmptyState";

figma.connect(EmptyState, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=343-83", {
  props: {
    title: figma.string("Title"),
    description: figma.string("Description"),
    icon: figma.instance("Icon"),
    showAction: figma.boolean("Show Action"),
  },
  example: ({ title, description, icon, showAction }) => (
    <EmptyState title={title} description={description} icon={icon} action={showAction ? <button type="button">Action</button> : undefined} />
  ),
});
