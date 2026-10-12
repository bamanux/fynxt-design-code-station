import figma from "@figma/code-connect";
import { AppShell, TopNav } from "./AppShell";

// DCF-0001 candidate component in the FDI work file (not yet in FDS-101).
figma.connect(AppShell, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=22-3867", {
  props: { content: figma.instance("Content") },
  example: ({ content }) => (
    <AppShell nav={null} header={<TopNav title="Page title" />}>
      {content}
    </AppShell>
  ),
});

figma.connect(TopNav, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=141-117", {
  props: { title: figma.string("Title") },
  example: ({ title }) => <TopNav title={title} />,
});
