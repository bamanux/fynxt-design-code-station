import { Button } from "@fynxt/ui";
import { EmptyState } from "../components/PageHeader";
import { navigate } from "../lib/router";

export function NotFoundPage() {
  return <EmptyState title="Page not found" action={<Button onClick={() => navigate("/")}>Back to dashboard</Button>} />;
}
