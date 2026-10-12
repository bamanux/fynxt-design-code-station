import figma from "@figma/code-connect";
import { Avatar } from "./Avatar";

figma.connect(Avatar, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=73-12", {
  props: {
    size: figma.enum("Size", { "24": 24, "32": 32, "40": 40 }),
    online: figma.boolean("Online"),
  },
  example: ({ size, online }) => <Avatar name="Full Name" size={size} online={online} />,
});
