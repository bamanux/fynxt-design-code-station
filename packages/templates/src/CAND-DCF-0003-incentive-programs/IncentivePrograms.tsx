import { AppShell, SideNav, TopNav } from "@fynxt/ui";
import { useState, type ReactNode } from "react";
import { ProgramEditor } from "./ProgramEditor";
import { ProgramList } from "./ProgramList";
import type { IncentiveProgramsConfig, ProgramsShellConfig } from "./types";

export interface IncentiveProgramsProps {
  config: IncentiveProgramsConfig;
}

type View = { kind: "list" } | { kind: "editor"; programId?: string };

/**
 * Incentive Programs: DRAFT candidate template (DCF-0003). The list sits in the app shell;
 * Create / Edit opens the editor full screen, without the shell (D3, DCF-0002 pattern).
 */
export function IncentivePrograms({ config }: IncentiveProgramsProps) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState<string | null>(null);

  if (view.kind === "editor") {
    return (
      <ProgramEditor
        config={config}
        programId={view.programId}
        onClose={(message) => {
          setNotice(message ?? null);
          setView({ kind: "list" });
        }}
      />
    );
  }
  const list = (
    <ProgramList
      config={config}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      onCreate={() => {
        setNotice(null);
        setView({ kind: "editor" });
      }}
      onEdit={(p) => {
        setNotice(null);
        setView({ kind: "editor", programId: p.id });
      }}
    />
  );
  return config.shell ? <Shell shell={config.shell}>{list}</Shell> : list;
}

function Shell({ shell, children }: { shell: ProgramsShellConfig; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      nav={<SideNav items={shell.nav} activeId={shell.activeNavId} collapsed={collapsed} onCollapsedChange={setCollapsed} logo={shell.logo} logoMark={shell.logoMark} />}
      header={<TopNav title={shell.title} />}
    >
      {children}
    </AppShell>
  );
}
