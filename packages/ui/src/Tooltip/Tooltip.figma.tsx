import figma from "@figma/code-connect";
import { Tooltip } from "./Tooltip";

figma.connect(Tooltip, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=66-39", {
  props: { content: figma.string("Text") },
  example: ({ content }) => (
    <Tooltip content={content}>
      <button type="button">Trigger</button>
    </Tooltip>
  ),
});
