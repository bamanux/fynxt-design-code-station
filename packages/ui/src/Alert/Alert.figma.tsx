import figma from "@figma/code-connect";
import { Alert } from "./Alert";

figma.connect(Alert, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=65-45", {
  props: { status: figma.enum("Status", { Info: "info", Success: "success", Warning: "warning", Error: "error" }) },
  example: ({ status }) => <Alert status={status}>Message</Alert>,
});
