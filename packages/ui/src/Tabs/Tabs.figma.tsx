import figma from "@figma/code-connect";
import { Tabs } from "./Tabs";

figma.connect(Tabs, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=75-18", {
  example: () => (
    <Tabs label="Sections" variant="primary" value="overview" onChange={() => {}} items={[{ id: "overview", label: "Overview", content: null }]} />
  ),
});

figma.connect(Tabs, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=318-5979", {
  example: () => (
    <Tabs label="Sections" variant="secondary" value="overview" onChange={() => {}} items={[{ id: "overview", label: "Overview", content: null }]} />
  ),
});
