// DCF-0001 · CRM › Tickets & Activities › Tasks — a page is template + configuration.
import { ActivityWorkspace } from "@fynxt/templates";
import { tasksConfig } from "./tasks.config";

export default function TasksPage() {
  return <ActivityWorkspace config={tasksConfig} />;
}
