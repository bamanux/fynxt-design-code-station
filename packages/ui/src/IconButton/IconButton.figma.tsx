import figma from "@figma/code-connect";
import { IconButton } from "./IconButton";

figma.connect(IconButton, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=106-1149", {
  props: {
    variant: figma.enum("Variant", { Primary: "primary", Secondary: "secondary", Ghost: "ghost", Outline: "outline", Destructive: "destructive" }),
    size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
    disabled: figma.enum("State", { Disabled: true }),
    badge: figma.boolean("Badge"),
    icon: figma.instance("Icon"),
  },
  example: ({ variant, size, disabled, badge, icon }) => (
    <IconButton label="Describe the action" icon={icon} variant={variant} size={size} disabled={disabled} badge={badge} />
  ),
});
