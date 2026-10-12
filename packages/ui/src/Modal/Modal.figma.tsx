import figma from "@figma/code-connect";
import { ConfirmDialog, Modal } from "./Modal";

figma.connect(Modal, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=358-352", {
  props: {
    title: figma.string("Title"),
    size: figma.enum("Size", { Small: "small", Medium: "medium", Large: "large" }),
    windowActions: figma.boolean("Show Window Actions"),
  },
  example: ({ title, size, windowActions }) => (
    <Modal open onClose={() => {}} title={title} size={size} windowActions={windowActions}>
      <p>Form fields</p>
    </Modal>
  ),
});

figma.connect(ConfirmDialog, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=388-2275", {
  variant: { Type: "Delete" },
  example: () => <ConfirmDialog open destructive title="Delete this record?" message="This action cannot be undone." confirmLabel="Delete" onConfirm={() => {}} onCancel={() => {}} />,
});
