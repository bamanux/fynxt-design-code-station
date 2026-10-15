import { AppShell, SideNav, TopNav } from "@fynxt/ui";
import { useState, type ReactNode } from "react";
import { ScoreEditor } from "./ScoreEditor";
import { ScoreModelList } from "./ScoreModelList";
import type { ScoreBuilderConfig, ScoreShellConfig } from "./types";

export interface ScoreBuilderProps {
  config: ScoreBuilderConfig;
}

type View = { kind: "list" } | { kind: "editor"; modelId?: string };

/**
 * Score Builder: DRAFT candidate template (DCF-0002). The list sits in the app shell (Settings ›
 * Brand Setup › Score Builder); Create / Edit opens the builder full screen, without the shell (D17).
 */
export function ScoreBuilder({ config }: ScoreBuilderProps) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState<string | null>(null);

  if (view.kind === "editor") {
    return (
      <ScoreEditor
        config={config}
        modelId={view.modelId}
        onClose={(message) => {
          setNotice(message ?? null);
          setView({ kind: "list" });
        }}
      />
    );
  }
  const list = (
    <ScoreModelList
      config={config}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      onCreate={() => {
        setNotice(null);
        setView({ kind: "editor" });
      }}
      onEdit={(m) => {
        setNotice(null);
        setView({ kind: "editor", modelId: m.id });
      }}
    />
  );
  return config.shell ? <Shell shell={config.shell}>{list}</Shell> : list;
}

function Shell({ shell, children }: { shell: ScoreShellConfig; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      nav={
        <SideNav
          items={shell.nav}
          activeId={shell.activeNavId}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          logo={shell.logo}
          logoMark={shell.logoMark}
          settings={shell.settings}
          user={shell.user}
        />
      }
      header={<TopNav title={shell.title} />}
    >
      {children}
    </AppShell>
  );
}
