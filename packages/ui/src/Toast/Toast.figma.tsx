import figma from "@figma/code-connect";
import { Toast } from "./Toast";

// DCF-0003 (FDS-101 Toast component set)
figma.connect(Toast, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=66-37", {
  props: { status: figma.enum("Status", { Info: "info", Success: "success", Warning: "warning", Error: "error" }), title: figma.string("Title") },
  example: ({ status, title }) => <Toast status={status}>{title}</Toast>,
});
