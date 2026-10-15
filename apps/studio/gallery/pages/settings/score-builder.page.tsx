// DCF-0002 · Settings › Brand Setup › Score Builder — a page is template + configuration.
import { ScoreBuilder } from "@fynxt/templates";
import { scoreBuilderConfig } from "./score-builder.config";

export default function ScoreBuilderPage() {
  return <ScoreBuilder config={scoreBuilderConfig} />;
}
