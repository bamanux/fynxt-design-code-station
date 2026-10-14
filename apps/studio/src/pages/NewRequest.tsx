import { Alert, Card } from "@fynxt/ui";
import { PageHeader } from "../components/PageHeader";
import { RequestForm } from "../components/RequestForm";
import { navigate } from "../lib/router";
import { useSession } from "../lib/session";

export function NewRequestPage() {
  const { meta } = useSession();
  return (
    <>
      <PageHeader
        title="New design request"
        description="Share what the product needs. FDI reads it, searches the template and component libraries, and writes a Design Case File for review."
      />
      {meta && !meta.agentReady && (
        <Alert status="warning" title="FDI is not configured">
          Your request will be saved, but FDI can't start the case file until this is fixed: {meta.agentProblem}
        </Alert>
      )}
      <Card as="section" className="form-card">
        <RequestForm onCancel={() => navigate("/")} onCreated={(created) => navigate(`/cases/${created.id}${created.runError ? "?queued=1" : ""}`)} />
      </Card>
    </>
  );
}
