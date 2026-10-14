// DCF-0003 · CRM › Operations › Incentive Programs — a page is template + configuration.
import { IncentivePrograms } from "@fynxt/templates";
import { incentiveProgramsConfig } from "./incentive-programs.config";

export default function IncentiveProgramsPage() {
  return <IncentivePrograms config={incentiveProgramsConfig} />;
}
